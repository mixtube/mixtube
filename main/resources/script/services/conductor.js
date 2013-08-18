(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtConductor', function ($rootScope, $q, mtPlayerPoolProvider, mtQueueManager, mtYoutubeClient, mtConfiguration, mtLoggerFactory, mtAlert) {
        var logger = mtLoggerFactory.logger('mtConductor');

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
        function executeTransition(transitionDuration) {
            previousSlot = currentSlot;
            currentSlot = nextSlot;
            nextSlot = null;

            if (previousSlot) {
                previousSlot.handle.out(transitionDuration).done(function (handle) {
                    if (previousSlot && previousSlot.handle === handle) {
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
                currentSlot.handle.in(transitionDuration);

                // notify that we started to play the new entry
                currentSlot.playDeferred.resolve();

                // when the video starts playing, start loading the next one
                var nextEntry = mtQueueManager.closestValidEntry(currentSlot.entry);
                if (nextEntry) {
                    prepareNextSlot(nextEntry, false);
                }
            } else {
                // end of the road
                playing = false;
            }
        }

        function executeComingNext() {
            $rootScope.$broadcast(mt.events.UpdateComingNextRequest, {
                currentVideo: currentSlot.entry.video,
                nextVideo: nextSlot ? nextSlot.entry.video : null
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
                var firstEntry = mtQueueManager.closestValidEntry();
                if (firstEntry) {
                    prepareNextSlot(firstEntry, true);
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
         * @param {mt.model.QueueEntry} nextQueueEntry
         * @param {boolean} forcePlay
         * @returns {promise} resolved when the loaded video starts playing
         */
        function prepareNextSlot(nextQueueEntry, forcePlay) {

            var nextPlayDeferred = $q.defer();

            logger.debug('Start request for video %s received with forcePlay flag %s', nextQueueEntry.video.id, forcePlay);

            nextSlot = Object.create(PlaybackSlot);
            nextSlot.init(
                playersPool.prepareVideo({
                    id: nextQueueEntry.video.id,
                    provider: nextQueueEntry.video.provider,
                    coarseDuration: nextQueueEntry.video.duration
                }),
                nextQueueEntry,
                nextPlayDeferred
            );

            if (currentSlot) {
                // there is a current slot we need to treat its cues

                if (!forcePlay) {
                    var transitionStartTime = relativeTimeToAbsolute(mtConfiguration.transitionStartTime, currentSlot.entry.video.duration);
                    var comingNextStartTime = relativeTimeToAbsolute(mtConfiguration.comingNextStartTime, currentSlot.entry.video.duration);
                    logger.debug('Preparing a video %s, the coming next cue will start at %d, the transition cue will start at %d of the previous video',
                        nextQueueEntry.video.id, comingNextStartTime, transitionStartTime);

                    //  regular prepare next slot so we define the cues for transitions on the current slot
                    currentSlot.handle.defineCue('commingNext', {
                        time: comingNextStartTime,
                        callback: function () {
                            $rootScope.$apply(function () {
                                executeComingNext();
                            });
                        }});
                    currentSlot.handle.defineCue('transition', {
                        time: transitionStartTime, callback: function () {
                            // starts the next prepared video and cross fade
                            $rootScope.$apply(function () {
                                executeTransition(mtConfiguration.transitionDuration);
                            });
                        }});
                } else {
                    // programmed cues (transitions here) are obsolete
                    currentSlot.handle.removeCue('commingNext');
                    currentSlot.handle.removeCue('transition');
                }
            }

            var nextLoadJQDeferred = nextSlot.handle.load();
            nextLoadJQDeferred.fail(function () {
                $rootScope.$apply(function () {
                    mtAlert.warning('Unable to preload "' + _.escape(nextSlot.entry.video.title) + '". Will be skipped.', 5000);

                    // flag the entry so that the we know that this entry is not valid
                    nextSlot.entry.skippedAtRuntime = true;
                    nextSlot.playDeferred.reject();

                    // now get the entry after the failed one and load it
                    var nextEntry = mtQueueManager.closestValidEntry(nextSlot.entry);

                    ensureNextSlotCleared();

                    if (nextEntry) {
                        prepareNextSlot(nextEntry, forcePlay);
                    }
                });
            });

            if (forcePlay) {
                nextLoadJQDeferred.done(function () {
                    $rootScope.$apply(function () {
                        executeTransition(mtConfiguration.transitionDuration);
                    });
                });
            }

            return nextPlayDeferred.promise;
        }

        function clear() {
            ensureNextSlotCleared();

            if (currentSlot) {
                executeTransition(0);
            }
        }

        // watch on collection change only (we don't want this watcher to be called when an entry property is updated)
        $rootScope.$watchArray(function () {
            return mtQueueManager.queue.entries;
        }, function (newEntries, oldEntries) {
            if (newEntries.length === 0) {
                // the queue is empty, probably just cleared, do the same for the player
                clear();
            } else if (currentSlot) {
                if (newEntries.indexOf(currentSlot.entry) === -1) {
                    // the current playing entry has just been removed
                    ensureNextSlotCleared();
                    // play the entry that is now at the position where was the removed entry
                    prepareNextSlot(mtQueueManager.closestValidEntry(newEntries[oldEntries.indexOf(currentSlot.entry)], true), true);
                } else {
                    // we want to know if the next queue entry changed so that we can tell the video player manager to prepare it
                    var nextEntry = mtQueueManager.closestValidEntry(currentSlot.entry);

                    if (nextEntry) {
                        var needReplacingNextHandle;

                        if (!nextSlot) {
                            if (nextEntry) {
                                // we were a the last position in the queue and a video was added just after
                                needReplacingNextHandle = true;
                            }
                        } else {
                            // is the next prepared handle stall ?
                            needReplacingNextHandle = nextSlot.entry !== nextEntry;
                        }

                        if (needReplacingNextHandle) {
                            logger.debug('Need to replace the next video handle it was made obsolete by queue update');

                            // a change in queue require the player to query for the next video
                            ensureNextSlotCleared();
                            prepareNextSlot(nextEntry, false);
                        }
                    } else {
                        ensureNextSlotCleared();
                    }
                }
            }
        });

        return {
            get playing() {
                return  playing;
            },

            /**
             * The current entry.
             *
             * @returns {mt.model.QueueEntry}
             */
            get playbackEntry() {
                return currentSlot ? currentSlot.entry : null;
            },

            /**
             * Plays the given entry as soon as the video is buffered enough.
             *
             * @param {mt.model.QueueEntry} queueEntry
             * @returns {promise} resolved when the entry starts playing, rejected in case of error
             */
            forceQueueEntryPlay: function (queueEntry) {
                ensureNextSlotCleared();
                return prepareNextSlot(queueEntry, true);
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