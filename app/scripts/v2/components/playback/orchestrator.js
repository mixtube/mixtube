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
        /** @type {mt.model.QueueEntry} */
        var _movingToEntry = null;

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
                slot.finish();
                slotAccessor(null);
            }
        }

        function engageSlot(slotAccessor) {
            var slot = slotAccessor();
            if (slot) {
                slot.engage(function () {
                    if (_startedSlot) {
                        // might be unnecessary but finish is robust enough to figure out
                        _startedSlot.finish();
                    }

                    _startedSlot = slot;
                    slotAccessor(null);

                    _runningQueueEntry = slot.actualQueueEntry;

                    prepareAuto();
                }, function () {
                    engageSlot(autoPreparedSlotAccessor)
                });
            } else {
                _startedSlot = null;
                _runningQueueEntry = null;
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

        function prepareMoveTo(requestedQueueEntry) {
            finishSlot(movePreparedSlotAccessor);

            _movePreparedSlot = mtPlaybackSlotFactory(_playback);
            _movePreparedSlot.prepareSafe(requestedQueueEntry, function prepareTryProgress(tryingQueueEntry) {
                _movingToEntry = tryingQueueEntry;
            });
        }

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
                return _movingToEntry;
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
                if (_playback.paused) {
                    _playback.resume();
                } else if (_playback.stopped) {
                    _playback.resume();
                }

                prepareMoveTo(queueEntry);
                engageSlot(movePreparedSlotAccessor);
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
                        prepareMoveTo(queueEntry);
                        engageSlot(movePreparedSlotAccessor);
                    }
                }
            }
        };
    });
})(mt);