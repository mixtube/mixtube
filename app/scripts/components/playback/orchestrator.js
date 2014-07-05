(function (mt) {
    'use strict';

    /**
     * @name mtOrchestrator
     */
    mt.MixTubeApp.factory('mtOrchestrator', function ($q, $rootScope, $timeout, mtQueueManager, mtPlaybackSlotFactory, mtNotificationCentersRegistry, mtLoggerFactory) {

        var logger = mtLoggerFactory('mtOrchestrator');

        /**
         * @name Playback
         * @constructor
         */
        function Playback() {
            this.onPause = new signals.Signal();
            this.onResume = new signals.Signal();
            this._status = Playback.Status.STOPPED;
        }

        Playback.Status = {
            PLAYING: 'PLAYING',
            PAUSED: 'PAUSED',
            STOPPED: 'STOPPED'
        };
        Playback.prototype = {

            get playing() {
                return this._status === Playback.Status.PLAYING;
            },

            get paused() {
                return this._status === Playback.Status.PAUSED;
            },

            get stopped() {
                return this._status === Playback.Status.STOPPED;
            },

            whenPlaying: function (cb) {
                if (this._status !== Playback.Status.PLAYING) {
                    this.onResume.addOnce(cb);
                } else {
                    cb();
                }
            },

            pause: function () {
                if (this._status !== Playback.Status.PAUSED) {
                    this._status = Playback.Status.PAUSED;
                    this.onPause.dispatch();
                }
            },

            resume: function () {
                if (this._status !== Playback.Status.PLAYING) {
                    this._status = Playback.Status.PLAYING;
                    this.onResume.dispatch();
                }
            },

            stop: function () {
                this._status = Playback.Status.STOPPED;
                this.onPause.removeAll();
                this.onResume.removeAll();
            }
        };

        /**
         * The orchestrator's current playback state
         *
         * @type {Playback}
         */
        var _playback = new Playback();

        /** @type {PlaybackSlot} */
        var _autoPreparedSlot = null;
        /** @type {PlaybackSlot} */
        var _movePreparedSlot = null;
        /** @type {PlaybackSlot} */
        var _startedSlot = null;
        /** @type {Array.<PlaybackSlot>} */
        var _finishingSlots = [];

        /** @type {number} */
        var _runningQueueIndex = -1;
        /** @type {mt.model.QueueEntry} */
        var _runningQueueEntry = null;

        function startedSlotAccessor(value) {
            if (_.isUndefined(value)) {
                return _startedSlot;
            } else {
                _startedSlot = value;
            }
        }

        function movePreparedSlotAccessor(value) {
            if (_.isUndefined(value)) {
                return _movePreparedSlot;
            } else {
                _movePreparedSlot = value;
            }
        }

        function autoPreparedSlotAccessor(value) {
            if (_.isUndefined(value)) {
                return _autoPreparedSlot;
            } else {
                _autoPreparedSlot = value;
            }
        }

        function finishSlot(slotAccessor) {
            var slot = slotAccessor();
            if (slot) {
                _finishingSlots.push(slot);
                slot.finishedPromise.then(function () {

                    _.remove(_finishingSlots, slot);

                    if (!_startedSlot && !_finishingSlots.length) {
                        _runningQueueEntry = null;
                        _runningQueueIndex = -1;

                        if (!_movePreparedSlot && !_autoPreparedSlot) {
                            // no new started or about to start slot when the slot is finished means we reach the end of the queue
                            _playback.stop();
                        }
                    }
                });
                slot.finish();
                slotAccessor(null);
            }
        }

        /**
         * Engages the slot returned by the given accessor.
         *
         * When engaged, a slot starts playing as soon as the preparation is done. When playing starts it finishes the
         * started slot and triggers the auto preparation for the next slot.
         *
         * If the accessor returns null, it just finishes the started slot.
         *
         * @param {function(PlaybackSlot=): PlaybackSlot} slotAccessor
         */
        function engageSlot(slotAccessor) {
            var slot = slotAccessor();
            if (slot) {
                slot.engage({
                    prepareFinished: function () {
                        // might be unnecessary but finish is robust enough to figure out
                        finishSlot(startedSlotAccessor);
                        slotAccessor(null);
                    },
                    aboutToStart: function () {
                        _startedSlot = slot;

                        _runningQueueEntry = slot.actualQueueEntry;
                        _runningQueueIndex = mtQueueManager.queue.entries.indexOf(_runningQueueEntry);

                        prepareAuto(_runningQueueIndex + 1);
                    },
                    aboutToEnd: function () {
                        engageSlot(autoPreparedSlotAccessor)
                    }
                }, [
                    {
                        id: 'ComingNextCue',
                        timeProvider: function (duration) {
                            return 10;
                        },
                        fn: function () {
                            mtNotificationCentersRegistry('notificationCenter').ready(function (notificationCenter) {
                                var autoPreparedSlot = autoPreparedSlotAccessor();
                                var nextVideo = autoPreparedSlot && autoPreparedSlot.actualQueueEntry && autoPreparedSlot.actualQueueEntry.video;
                                notificationCenter.comingNext({
                                    current: slot.actualQueueEntry.video.title,
                                    next: nextVideo ? nextVideo.title : null,
                                    imageUrl: nextVideo ? nextVideo.thumbnailUrl : null
                                });
                            });
                        }
                    }
                ]);
            } else {
                // engaging a null slot just finishes the started one
                finishSlot(startedSlotAccessor);
            }
        }

        /**
         * Starts the preparation of a new auto slot.
         *
         * @param {number} queueIndex the index of the "wished" queue item to prepare
         */
        function prepareAuto(queueIndex) {
            finishSlot(autoPreparedSlotAccessor);
            _autoPreparedSlot = mtPlaybackSlotFactory(_playback);
            _autoPreparedSlot.prepareSafe(queueIndex);
        }

        /**
         * Starts the preparation of a new move slot and engages it.
         *
         * @param {number} queueIndex the index of the "wished" queue item to prepare
         */
        function moveTo(queueIndex) {
            finishSlot(movePreparedSlotAccessor);
            _movePreparedSlot = mtPlaybackSlotFactory(_playback);
            _movePreparedSlot.prepareSafe(queueIndex);
            engageSlot(movePreparedSlotAccessor);
        }

        /**
         * The watcher bellow observes the queue entries to check if a modification the queue and impacts the playback if required.
         *
         * Two main cases:
         *  - the currently playing entry has been removed -> move to the next valid one
         *  - something has changed between the currently playing entry and the auto prepared one -> launch a new cycle to pick and prepare
         */
        $rootScope.$watchCollection(function () {
            return mtQueueManager.queue.entries;
        }, function entriesWatcherChangeHandler(/**Array*/ newEntries, /**Array*/ oldEntries) {
            if (!angular.equals(newEntries, oldEntries)) {

                var startedEntry = _startedSlot && _startedSlot.actualQueueEntry;

                // the concept of activated entry is only relevant here
                // we want to consider the currently started entry or the one about to be the next started entry mainly
                // to properly manage moved to entry removal while still preparing
                var activatedEntry = _movePreparedSlot && (_movePreparedSlot.actualQueueEntry || _movePreparedSlot.tryingQueueEntry)
                    || startedEntry;

                var removedEntries = _.difference(oldEntries, newEntries);
                if (_.contains(removedEntries, activatedEntry)) {
                    // the active entry has just been removed
                    // move to the entry which is now at the same position in the queue
                    moveTo(oldEntries.indexOf(activatedEntry));
                } else if (startedEntry) {
                    // nothing changed for the active entry

                    // we need the check if the change impacted the auto prepared entry
                    var prepareAutoRequired = false;

                    var startedEntryOldIndex = oldEntries.indexOf(startedEntry);
                    var startedEntryNewIndex = newEntries.indexOf(startedEntry);

                    var autoPreparedEntry = _autoPreparedSlot && (_autoPreparedSlot.actualQueueEntry || _autoPreparedSlot.tryingQueueEntry);
                    var autoPreparedEntryNewIndex = newEntries.indexOf(autoPreparedEntry);
                    if (autoPreparedEntryNewIndex === -1) {
                        // the auto prepared entry has just been removed so we know straight that we have to re-prepare
                        prepareAutoRequired = true;
                    } else {
                        // we have to compare slices of old and new entries from the entry following the started one
                        // to the auto prepared one the check if something changes in between
                        var autoPreparedEntryOldIndex = oldEntries.indexOf(autoPreparedEntry);
                        var sliceOfOldEntries = oldEntries.slice(startedEntryOldIndex + 1, autoPreparedEntryOldIndex);
                        var sliceOfNewEntries = newEntries.slice(startedEntryNewIndex + 1, autoPreparedEntryNewIndex);
                        prepareAutoRequired = !angular.equals(sliceOfOldEntries, sliceOfNewEntries);
                    }

                    if (prepareAutoRequired) {
                        // something changed so just in case we re (auto)prepare the entry
                        prepareAuto(startedEntryNewIndex + 1);

                        logger.debug('something changed in the queue that required a re-preparation of the previously ' +
                            'auto prepared entry %O', autoPreparedEntry);
                    }
                }
            }
        });

        return {

            /**
             * The currently playing queue entry.
             *
             * @returns {?mt.model.QueueEntry}
             */
            get runningQueueEntry() {
                return _runningQueueEntry;
            },

            /**
             * The currently loading queue entry.
             *
             * This value is not null only if the loading has been initiated by a external action ie. not by
             * the orchestrator itself.
             *
             * @returns {?mt.model.QueueEntry}
             */
            get loadingQueueEntry() {
                return _movePreparedSlot && _movePreparedSlot.tryingQueueEntry;
            },

            /**
             * @returns {boolean}
             */
            get playing() {
                return _playback.playing;
            },

            /**
             * @param {number} queueIndex
             */
            skipTo: function (queueIndex) {
                if (_playback.paused || _playback.stopped) {
                    _playback.resume();
                }

                moveTo(queueIndex);
            },

            togglePlayback: function () {
                if (_playback.playing) {
                    _playback.pause();
                } else if (_playback.paused) {
                    _playback.resume();
                } else if (_playback.stopped && mtQueueManager.queue.entries.length) {
                    _playback.resume();
                    moveTo(0);
                }
            }
        };
    });
})(mt);