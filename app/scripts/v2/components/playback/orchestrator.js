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

        function engagedSlotFinishedHandler() {
            if (!_startedSlot) {
                // no new started slot when the slot is finished means we reach the end of the queue
                _playback.stop();
                _runningQueueEntry = null;
            }
        }

        function finishSlot(slotAccessor) {
            var slot = slotAccessor();
            if (slot) {
                slot.finish();
                slotAccessor(null);
            }
        }

        function engageSlot(slotAccessor) {
            var slot = slotAccessor();
            if (slot) {
                slot.engage(function () {
                    // might be unnecessary but finish is robust enough to figure out
                    finishSlot(startedSlotAccessor);

                    slot.finishedPromise.then(engagedSlotFinishedHandler);

                    _startedSlot = slot;
                    slotAccessor(null);

                    _runningQueueEntry = slot.actualQueueEntry;

                    prepareAuto();
                }, function () {
                    engageSlot(autoPreparedSlotAccessor)
                });
            } else {
                // todo investigate on what is the purpose of this branch
                _startedSlot = null;
            }
        }


        function prepareAuto() {
            finishSlot(autoPreparedSlotAccessor);

            var followingQueueEntry = mtQueueManager.closestValidEntry(_runningQueueEntry);

            if (followingQueueEntry) {
                _autoPreparedSlot = mtPlaybackSlotFactory(_playback);
                _autoPreparedSlot.prepareSafe(followingQueueEntry);
            }
        }

        /**
         * @param {mt.model.QueueEntry} requestedQueueEntry
         */
        function moveTo(requestedQueueEntry) {
            finishSlot(movePreparedSlotAccessor);

            _movePreparedSlot = mtPlaybackSlotFactory(_playback);
            _movePreparedSlot.prepareSafe(requestedQueueEntry);

            engageSlot(movePreparedSlotAccessor);
        }

        /**
         * @param {Array.<mt.model.QueueEntry>} entries
         * @param {?PlaybackSlot} slot
         * @returns {number}
         */
        function indexOfActualEntry(slot, entries) {
            return slot ? entries.indexOf(slot.actualQueueEntry) : -1
        }

        function findReplacingEntry(slot, oldEntries, newEntries) {
            var startedEntryIdx = indexOfActualEntry(slot, oldEntries);
            if (startedEntryIdx !== -1) {
                var newEntryAtIdx = startedEntryIdx < newEntries.length ? newEntries[startedEntryIdx] : null;
                if (newEntryAtIdx !== slot.actualQueueEntry) {
                    return newEntryAtIdx;
                }
            }
            return false;
        }

        $rootScope.$watchCollection(function () {
            return mtQueueManager.queue.entries;
        }, function entriesWatcherChangeHandler(newEntries, oldEntries) {
            if (!angular.equals(newEntries, oldEntries)) {

                var startedEntryReplacement = findReplacingEntry(_startedSlot, oldEntries, newEntries);
                if (startedEntryReplacement !== false) {
                    if (startedEntryReplacement) {
                        moveTo(startedEntryReplacement);
                    } else {
                        // last entry removed nothing more to play w can stop the playback
                        finishSlot(startedSlotAccessor);
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