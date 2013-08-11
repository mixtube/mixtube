(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtVideoPlayerManager', function ($rootScope, $q, mtPlayerPoolProvider, mtQueueManager, mtYoutubeClient, mtConfiguration, mtLoggerFactory, mtAlert) {
        var logger = mtLoggerFactory.logger('mtVideoPlayerManager');

        /**
         * @typedef {{handle: mt.player.VideoHandle, entry: mt.model.QueueEntry, playDeferred: Deferred, init: Function}}
         */
        var PlaybackSlot = {
            handle: null,
            entry: null,
            playDeferred: null,
            /**
             * @param {mt.player.VideoHandle} handle
             * @param {mt.model.QueueEntry} entry
             * @param {Deferred} playDeferred
             */
            init: function (handle, entry, playDeferred) {
                this.handle = handle;
                this.entry = entry;
                this.playDeferred = playDeferred;
            }
        };

        /** @type {mt.player.PlayersPool} */
        var playersPool = null;
        /** @type {PlaybackSlot} */
        var previousSlot = null;
        /** @type {PlaybackSlot} */
        var currentSlot = null;
        /** @type {PlaybackSlot} */
        var nextSlot = null;
        /**  @type {boolean} */
        var playing = false;

        mtPlayerPoolProvider.get().then(function (pool) {
            playersPool = pool;
        });

        /**
         * Executes the video transition steps :
         * - starts the prepared video
         * - references the prepared video as the new current one
         * - cross fades the videos (out the current one / in the prepared one)
         */
        function executeTransition() {
            previousSlot = currentSlot;
            currentSlot = nextSlot;
            nextSlot = null;

            if (previousSlot) {
                previousSlot.handle.out(mtConfiguration.transitionDuration).done(function (handle) {
                    if (previousSlot.handle === handle) {
                        $rootScope.$apply(function () {
                            // prevents race condition: handle that just finished the out is still the current slot one
                            previousSlot = null;
                        });
                    }
                });
            }

            // if there is a a current video start it, else it's the end of the sequence
            if (currentSlot) {
                playing = true;
                currentSlot.handle.in(mtConfiguration.transitionDuration);

                // notify that we started to play the new entry
                currentSlot.playDeferred.resolve();

                // when the video starts playing, position the playback head and start loading the next one
                mtQueueManager.positionPlaybackEntry(currentSlot.entry);
                var nextQueueEntry = mtQueueManager.nextEntry();
                if (nextQueueEntry) {
                    loadQueueEntry(nextQueueEntry, false);
                }
            } else {
                // end of the road
                playing = false;
            }
        }

        function executeComingNext() {
            $rootScope.$broadcast(mt.events.UpdateComingNextRequest, {
                currentVideo: currentSlot.entry.video,
                nextVideo: nextSlot.entry.video
            });
        }

        /**
         * Properly clears the next slot if needed by disposing it and clearing all the references to it.
         */
        function ensureNextSlotCleared() {
            if (nextSlot) {
                logger.debug('A handle (%s) for next video has been prepared, we need to dispose it', nextSlot.handle.uid);

                // the next video has already been prepared, we have to dispose it before preparing a new one
                nextSlot.handle.dispose();
                nextSlot = null;
            }
        }

        /**
         * Switches the queue between playing and paused. Handles the case where the queue was not playing.
         */
        function playbackToggle() {
            if (currentSlot) {
                if (playing) {
                    playing = false;
                    if (previousSlot) {
                        // in transition
                        previousSlot.handle.pause();
                    }
                    currentSlot.handle.pause();
                } else {
                    playing = true;
                    if (previousSlot) {
                        // in transition
                        previousSlot.handle.unpause();
                    }
                    currentSlot.handle.unpause();
                }
            } else {
                // if play action is requested on a non playing queue, grab the first item and force play
                var queueEntry = mtQueueManager.nextEntry();
                if (queueEntry) {
                    loadQueueEntry(queueEntry, true);
                }
            }
        }

        /**
         * Converts a milliseconds "relative" time (negative means from the end) to an "absolute" time (milliseconds
         * from the end).
         *
         * @param {number} relTime
         * @param {number} duration
         * @returns {number}
         */
        function relativeTimeToAbsolute(relTime, duration) {
            return relTime > 0 ? relTime : duration + relTime;
        }

        /**
         * @param {mt.model.QueueEntry} queueEntry
         * @param {boolean} forcePlay
         * @returns {promise} resolved when the loaded video starts playing
         */
        function loadQueueEntry(queueEntry, forcePlay) {

            var nextPlayDeferred = $q.defer();

            logger.debug('Start request for video %s received with forcePlay flag %s', queueEntry.video.id, forcePlay);

            var transitionStartTime = relativeTimeToAbsolute(mtConfiguration.transitionStartTime, queueEntry.video.duration);
            var comingNextStartTime = relativeTimeToAbsolute(mtConfiguration.comingNextStartTime, queueEntry.video.duration);
            logger.debug('Preparing a video %s, the coming next cue will start at %d, the transition cue will start at %d', queueEntry.video.id, comingNextStartTime, transitionStartTime);

            nextSlot = Object.create(PlaybackSlot);
            nextSlot.init(
                playersPool.prepareVideo({
                    id: queueEntry.video.id,
                    provider: queueEntry.video.provider,
                    coarseDuration: queueEntry.video.duration
                }, [
                    {time: comingNextStartTime, callback: function () {
                        $rootScope.$apply(function () {
                            executeComingNext();
                        });
                    }},
                    {time: transitionStartTime, callback: function () {
                        // starts the next prepared video and cross fade
                        $rootScope.$apply(function () {
                            executeTransition();
                        });
                    }}
                ]),
                queueEntry,
                nextPlayDeferred
            );

            var nextLoadJQDeferred = nextSlot.handle.load();

            if (forcePlay) {
                nextLoadJQDeferred.done(function () {
                    $rootScope.$apply(function () {
                        executeTransition();
                    });
                });
            }

            nextLoadJQDeferred.fail(function () {
                $rootScope.$apply(function () {
                    mtAlert.warning('Unable to preload "' + _.escape(nextSlot.entry.video.title) + '". Will be skipped.', 5000);

                    // flag the entry so that the we know that this entry is not valid
                    nextSlot.entry.skippedAtRuntime = true;
                    nextSlot.playDeferred.reject();

                    // now get the entry after the failed one and load it
                    var nextEntry = mtQueueManager.nextEntry(nextSlot.entry);

                    ensureNextSlotCleared();

                    if (nextEntry) {
                        loadQueueEntry(nextEntry, forcePlay);
                    }
                });
            });

            return nextPlayDeferred.promise;
        }

        function clear() {
            ensureNextSlotCleared();

            if (currentSlot) {
                playing = false;
                currentSlot.handle.dispose();
                currentSlot = null;
            }
        }

        // watch on collection change only (we don't want this watcher to be called when an entry property is updated)
        $rootScope.$watchCollection(function () {
            return mtQueueManager.queue.entries;
        }, function () {
            if (mtQueueManager.queue.entries.length === 0) {
                // the queue is empty, probably just cleared, do the same for the player
                clear();
            } else if (currentSlot) {
                // we want to know if the next queue entry changed so that we can tell the video player manager to prepare it
                var nextQueueEntry = mtQueueManager.nextEntry();

                if (nextQueueEntry) {
                    var needReplacingNextHandle;

                    if (!nextSlot) {
                        if (nextQueueEntry) {
                            // we were a the last position in the queue and a video was added just after
                            needReplacingNextHandle = true;
                        }
                    } else {
                        // is the next prepared handle stall ?
                        needReplacingNextHandle = nextSlot.entry !== nextQueueEntry;
                    }

                    if (needReplacingNextHandle) {
                        logger.debug('Need to replace the next video handle it was made obsolete by queue update');

                        // a change in queue require the player to query for the next video
                        ensureNextSlotCleared();
                        loadQueueEntry(nextQueueEntry, false);
                    }
                } else {
                    ensureNextSlotCleared();
                }
            }
        });

        return {
            get playing() {
                return  playing;
            },

            /**
             * Prepares the next video to ensure smooth transition.
             *
             * If forcePlay parameter is set to true it plays the video as soon as it is buffered enough.
             *
             * @param {mt.model.QueueEntry} queueEntry
             * @param {boolean} forcePlay
             * @returns {promise} resolved when the loaded entry starts playing, rejected in case of error
             */
            loadQueueEntry: function (queueEntry, forcePlay) {
                return loadQueueEntry(queueEntry, forcePlay);
            },

            playbackToggle: function () {
                playbackToggle();
            },

            clear: function () {
                clear();
            }
        };
    });
})(mt);