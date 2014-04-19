(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtPlaybackSlotFactory', function ($rootScope, $q, mtMediaElementsPool, mtQueueManager, mtLoggerFactory) {

        var logger = mtLoggerFactory('mtPlaybackSlotFactory');

        /**
         * @param {mt.model.QueueEntry} queueEntry
         * @constructor
         */
        function Player(queueEntry) {
            this._mediaElementWrapper = mtMediaElementsPool(queueEntry.video.provider);
            this.popcorn = Popcorn(this._mediaElementWrapper.get());
            this._queueEntry = queueEntry;
            this._disposed = false;
        }

        Player.prototype = {
            load: function () {
                var queueEntry = this._queueEntry;
                if (queueEntry.video.provider === 'youtube') {
                    this._mediaElementWrapper.get().src = 'http://www.youtube.com/watch?v=' + queueEntry.video.id;
                } else {
                    throw new Error('Unknown video provider type ' + queueEntry.video.provider);
                }
            },

            dispose: function () {
                if (!this._disposed) {
                    this._disposed = true;
                    this.popcorn.destroy();
                    this._mediaElementWrapper.release();
                    this.popcorn = null;
                    this._mediaElementWrapper = null;
                    this._queueEntry = null;
                }
            }
        };

        /**
         * @name PlaybackSlot
         * @param {Playback} playback
         * @constructor
         */
        function PlaybackSlot(playback) {
            this._playback = playback;
            this._player = null;
            this._started = false;
            this._stopped = false;
            this._finished = false;
            this._prepareDeferred = $q.defer();

            this.actualQueueEntry = null;
        }

        PlaybackSlot.FADE_DURATION = 3;
        PlaybackSlot.AUTO_END_CUE_ID = 'PlaybackSlotAutoEndCue';
        PlaybackSlot.AUTO_END_CUE_TIME_PRODUCER = function (duration) {
            return 15;
        };
        PlaybackSlot.PREPARE_RETRY = function (queueEntryToTry, tryProgressCb, prepareDeferred) {

            tryProgressCb(queueEntryToTry);

            if (!queueEntryToTry) {
                prepareDeferred.reject(new Error('Could not find any valid entry to prepare'));
            }

            var player = new Player(queueEntryToTry);

            player.popcorn.on('error', function prepareErrorCb() {
                $rootScope.$apply(function () {
                    logger.warn('Skipped %O because of an error when trying to load it: %O', queueEntryToTry, player.popcorn.media.error);

                    player.dispose();
                    queueEntryToTry.skippedAtRuntime = true;
                    PlaybackSlot.PREPARE_RETRY(mtQueueManager.closestValidEntry(queueEntryToTry), tryProgressCb, prepareDeferred);
                });
            });

            player.popcorn.one('canplay', function prepareCanPlayCb() {
                $rootScope.$apply(function () {
                    // makes really sure a call to play will start the video instantaneously by forcing the player to buffer
                    player.popcorn.play();
                    player.popcorn.one('playing', function preparePlayingCb() {
                        player.popcorn.pause();

                        // last try was successful so send a last progress info to tell that we are not trying anything else
                        tryProgressCb(null);

                        // make sure the player is disposed if the preparation has been canceled
                        prepareDeferred.promise.catch(function () {
                            player.dispose();
                        });
                        // depending of the state of the deferred this might have no effect
                        prepareDeferred.resolve({player: player, preparedQueueEntry: queueEntryToTry});
                    });
                });
            });

            player.load();
        };

        PlaybackSlot.prototype = {

            /**
             * Tries to load the video of the given entry. If this video is not valid, it browse to cue in incrementally
             * until it finds a valid queue entry.
             *
             * This method is responsible for marking queue entry as skipped in case of error while loading.
             *
             * @param {mt.model.QueueEntry} expectedQueueEntry
             * @param {function(mt.model.QueueEntry)=} tryProgressCb
             */
            prepareSafe: function (expectedQueueEntry, tryProgressCb) {
                var slot = this;
                tryProgressCb = tryProgressCb || angular.noop;

                PlaybackSlot.PREPARE_RETRY(mtQueueManager.closestValidEntry(expectedQueueEntry, true), tryProgressCb, slot._prepareDeferred);
                slot._prepareDeferred.promise.then(function (args) {
                    slot.actualQueueEntry = args.preparedQueueEntry;
                });

                return this;
            },

            /**
             * @param {function} aboutToStartCb
             * @param {function} aboutToEndCb
             */
            engage: function (aboutToStartCb, aboutToEndCb) {
                var slot = this;
                slot._prepareDeferred.promise.then(function setupPlayer(args) {
                    slot._player = args.player;

                    slot._player.popcorn.cue(
                        PlaybackSlot.AUTO_END_CUE_ID,
                        PlaybackSlot.AUTO_END_CUE_TIME_PRODUCER(slot._player.popcorn.duration()),
                        function autoEndCueCb() {
                            $rootScope.$apply(function () {
                                logger.debug('auto ending %O', slot.actualQueueEntry.video);
                                aboutToEndCb();
                                slot.finish();
                            });
                        });

                    aboutToStartCb();
                    slot._startIn();
                });

                return this;
            },

            finish: function () {
                this._finished = true;
                if (!this._player) {
                    // player is set when _prepareDeferred is resolved so here we now that we can still reject it
                    this._prepareDeferred.reject(new Error('The PlaybackSlot has been finished before the end of preparation'));
                } else if (!this._started) {
                    // this will ensure a player is never returned and properly disposed
                    this._player.dispose();
                } else if (!this._stopped) {
                    this._player.popcorn.removeTrackEvent(PlaybackSlot.AUTO_END_CUE_ID);
                    this._stopOut();
                }
            },

            _startIn: function () {
                var slot = this;
                slot._playback.whenPlaying(function startInWhenPlaying() {
                    // slot might have been finished while we were waiting for play, better to check first
                    if (!slot._finished) {
                        slot._started = true;
                        var popcorn = slot._player.popcorn;
                        slot._playback.onPause.add(popcorn.pause, popcorn);
                        slot._playback.onResume.add(popcorn.play, popcorn);

                        popcorn.play();
                        popcorn.fade({direction: 'in', duration: PlaybackSlot.FADE_DURATION});
                    }
                });
            },

            _stopOut: function () {
                var slot = this;
                slot._stopped = true;
                slot._player.popcorn.fade({direction: 'out', duration: PlaybackSlot.FADE_DURATION, done: function () {
                    $rootScope.$apply(function () {
                        var popcorn = slot._player.popcorn;
                        slot._playback.onPause.remove(popcorn.pause, popcorn);
                        slot._playback.onResume.remove(popcorn.play, popcorn);
                        slot._player.dispose();
                    });
                }});
            }
        };


        return function playbackSlot(playback) {
            return new PlaybackSlot(playback);
        };
    });

})(mt);