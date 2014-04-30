(function (mt) {
    'use strict';

    /**
     * @name mtOrchestrator
     */
    mt.MixTubeApp.factory('mtOrchestrator', function ($q, $rootScope, $timeout, mtQueueManager, mtPlaybackSlotFactory, mtLoggerFactory) {

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

        /** @type {mt.model.QueueEntry} */
        var _runningQueueEntry = null;

        function startedSlotAccessor(value) {
            if (angular.isUndefined(value)) {
                return _startedSlot;
            } else {
                _startedSlot = value;
            }
        }

        function movePreparedSlotAccessor(value) {
            if (angular.isUndefined(value)) {
                return _movePreparedSlot;
            } else {
                _movePreparedSlot = value;
            }
        }

        function autoPreparedSlotAccessor(value) {
            if (angular.isUndefined(value)) {
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
                slot.engage(function () {
                    // might be unnecessary but finish is robust enough to figure out
                    finishSlot(startedSlotAccessor);

                    _startedSlot = slot;
                    slotAccessor(null);

                    _runningQueueEntry = slot.actualQueueEntry;

                    prepareAuto();
                }, function () {
                    engageSlot(autoPreparedSlotAccessor)
                });
            } else {
                // engaging a null slot just finishes the started one
                finishSlot(startedSlotAccessor);
            }
        }


        function prepareAuto() {
            finishSlot(autoPreparedSlotAccessor);

            var followingQueueEntry = mtQueueManager.closestValidEntry(_startedSlot.actualQueueEntry);

            if (followingQueueEntry) {
                _autoPreparedSlot = mtPlaybackSlotFactory(_playback);
                _autoPreparedSlot.prepareSafe(followingQueueEntry);
            }
        }

        /**
         * Starts the preparation of a new move slot and engages it.
         *
         * @param {?mt.model.QueueEntry} requestedQueueEntry
         */
        function moveTo(requestedQueueEntry) {
            finishSlot(movePreparedSlotAccessor);

            if (requestedQueueEntry) {
                _movePreparedSlot = mtPlaybackSlotFactory(_playback);
                _movePreparedSlot.prepareSafe(requestedQueueEntry);
            }

            engageSlot(movePreparedSlotAccessor);
        }

        function findReplacingEntry(entry, oldEntries, newEntries) {
            var entryIdx = entry ? oldEntries.indexOf(entry) : -1;
            if (entryIdx !== -1) {
                var newEntryAtIdx = entryIdx < newEntries.length ? newEntries[entryIdx] : null;
                if (newEntryAtIdx !== entry) {
                    return newEntryAtIdx;
                }
            }
            return false;
        }

        $rootScope.$watchCollection(function () {
            return mtQueueManager.queue.entries;
        }, function entriesWatcherChangeHandler(newEntries, oldEntries) {
            if (!angular.equals(newEntries, oldEntries)) {

                var startedEntry = _startedSlot && _startedSlot.actualQueueEntry
                    || _movePreparedSlot && (_movePreparedSlot.actualQueueEntry || _movePreparedSlot.tryingQueueEntry);
                var startedEntryReplacement = findReplacingEntry(startedEntry, oldEntries, newEntries);

                if (startedEntryReplacement !== false) {
                    moveTo(startedEntryReplacement);
                } else {
                    var autoPreparedEntry = _autoPreparedSlot && (_autoPreparedSlot.actualQueueEntry || _autoPreparedSlot.tryingQueueEntry);
                    var autoPreparedEntryReplacement = findReplacingEntry(autoPreparedEntry, oldEntries, newEntries);

                    if (autoPreparedEntryReplacement !== false) {
                        prepareAuto();
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
             * @param {mt.model.QueueEntry} queueEntry
             */
            skipTo: function (queueEntry) {
                if (_playback.paused || _playback.stopped) {
                    _playback.resume();
                }

                moveTo(queueEntry);
            },

            togglePlayback: function () {
                if (_playback.playing) {
                    _playback.pause();
                } else if (_playback.paused) {
                    _playback.resume();
                } else if (_playback.stopped) {
                    var queueEntry = mtQueueManager.closestValidEntry();
                    if (queueEntry) {
                        _playback.resume();
                        moveTo(queueEntry);
                    }
                }
            }
        };
    });
})(mt);