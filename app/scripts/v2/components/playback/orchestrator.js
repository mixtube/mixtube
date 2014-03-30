(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtOrchestrator', function ($q, $rootScope, $timeout, mtQueueManager, mtMediaElementsPool) {

        /**
         * A enumeration of possible playback state values.
         *
         * We use meaningful string values for debugging purpose.
         *
         * @enum {string}
         */
        var PlaybackState = {
            PLAYING: 'PLAYING',
            PAUSED: 'PAUSED',
            STOPPED: 'STOPPED'
        };

        /**
         * Duration of the whole cross-fade in seconds
         *
         * @const
         * @type {number}
         */
        var CROSS_FADE_DURATION = 3;

        /**
         * The id used by popcorn to reference the auto cross fade cue
         *
         * @const
         * @type {string}
         */
        var AUTO_CROSS_FADE_CUE_ID = 'autoCrossFadeCue';

        /**
         * The orchestrator's current playback state
         *
         * @type {PlaybackState}
         */
        var _playback = PlaybackState.STOPPED;

        /**
         * A deferred that retains a "move to" operation when the "preparation" of the video finished while the
         * orchestrator was in pause. By resolving this continuation we can proceed to the next step: cross fading the
         * prepared video.
         *
         * @type {Deferred}
         */
        var _moveToContinuation = $q.defer();

        /**
         * @typedef {Object} Player
         * @property {mtMediaElementWrapper} mediaElementWrapper
         * @property {Popcorn} popcorn
         * @property {mt.model.QueueEntry} queueEntry
         * @property {boolean} stopping
         */

        /**  @type {Player}*/
        var _pendingPlayer = null;
        /** @type {Player} */
        var _runningPlayer = null;
        /** @type {Array.<Player>} */
        var _stoppingPlayers = [];


        var _preparePendingPlayerRq = {
            count: 0,
            queueEntry: null
        };

        /**
         * The entry currently in preparation for which the loading has been triggered by a manual skip to call.
         *
         * @type {mt.model.QueueEntry}
         */
        var skippedToEntry = null;

        function freePlayer(player) {
            player.popcorn.destroy();
            player.mediaElementWrapper.release();
        }

        /**
         * Promotes the given player to the stopping list, fades out and frees it.
         *
         * @param {Player} player
         * @return {Promise} resolved when the player stopped (fade out included)
         */
        function stopPlayer(player) {
            var deferred = $q.defer();

            _stoppingPlayers.push(player);

            // remove the auto cross fade cue to avoid auto cross fading while stopping a player
            player.popcorn.removeTrackEvent(AUTO_CROSS_FADE_CUE_ID);

            // fade out and free the player
            player.popcorn.fade({direction: 'out', duration: CROSS_FADE_DURATION, done: function () {
                $rootScope.$apply(function () {
                    freePlayer(player);
                    _.remove(_stoppingPlayers, player);
                    deferred.resolve();
                });
            }});

            return deferred.promise;
        }

        function freePendingPlayer() {
            freePlayer(_pendingPlayer);
            _pendingPlayer = null;
        }

        function stopRunningPlayer() {
            var promise = _runningPlayer ? stopPlayer(_runningPlayer) : $q.when();
            _runningPlayer = null;
            return promise;
        }

        function pausePlayers() {
            if (_runningPlayer) {
                _runningPlayer.popcorn.pause();
            }
            _stoppingPlayers.forEach(function (player) {
                player.popcorn.pause();
            });
        }

        function resumePlayers() {
            if (_runningPlayer) {
                _runningPlayer.popcorn.play();
            }
            _stoppingPlayers.forEach(function (player) {
                player.popcorn.play();
            });
        }

        /**
         * Creates a player and makes sure it will be able to start playing straight by forcing preload.
         *
         * @param {mt.model.QueueEntry} queueEntry
         * @returns {Promise} resolved when the player is created and ready to play
         */
        function preparePlayer(queueEntry) {
            var deferred = $q.defer();

            var mediaElementWrapper = mtMediaElementsPool(queueEntry.video.provider);
            var popcorn = Popcorn(mediaElementWrapper.get());

            var player = {mediaElementWrapper: mediaElementWrapper, popcorn: popcorn, queueEntry: queueEntry, stopping: false};

            popcorn.one('canplay', function preparePlayerCanPlayCb() {
                $rootScope.$apply(function () {
                    // makes really sure a call to play will start the video instantaneously by forcing the player to buffer
                    popcorn.play();
                    popcorn.one('playing', function preparePlayerPlayingCb() {
                        popcorn.pause();
                        deferred.resolve(player);
                    });
                });
            });

            mediaElementWrapper.get().src = 'http://www.youtube.com/watch?v=' + queueEntry.video.id;

            return deferred.promise;
        }

        function preparePendingPlayer(queueEntry) {
            _preparePendingPlayerRq.queueEntry = queueEntry;
            var rqCount = ++_preparePendingPlayerRq.count;

            // if there is already a pending player we want to cancel: most recent request always wins
            if (_pendingPlayer) {
                freePendingPlayer();
            }

            return preparePlayer(queueEntry).then(function (player) {
                if (rqCount !== _preparePendingPlayerRq.count) {
                    freePlayer(player);
                    return $q.reject(new Error('The preparing request [' + rqCount + '] has been made stale by another newer one'));
                } else {
                    _pendingPlayer = player;
                }
            });
        }

        function preparePendingPlayerAuto() {
            var nextQueueEntry = null;

            if (_runningPlayer) {
                var runningQueueEntry = _runningPlayer.queueEntry;
                nextQueueEntry = mtQueueManager.closestValidEntry(runningQueueEntry, false);
            }

            if (!nextQueueEntry) {
                return $q.reject(new Error('There is not any next queue entry to prepare'));
            }

            return preparePendingPlayer(nextQueueEntry);
        }

        /**
         * @returns {Promise}
         */
        function startPendingPlayer() {
            var deferred = $q.defer();
            var popcorn = _pendingPlayer.popcorn;

            if (popcorn.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
                // safety checking: there is a race condition here and it shouldn't happen
                deferred.reject(new Error('The pending popcorn instance is not ready to be play started'));
            } else {

                var duration = popcorn.duration();
                var crossFadeTime = 15;

                // promote the pending player to the running players list
                _runningPlayer = _pendingPlayer;
                _pendingPlayer = null;

                // prepare (preload) the next player so that the upcoming auto cross-fade will run smoothly
                $timeout(function () {
                    preparePendingPlayerAuto();
                });

                // registers a cue to install auto cross-fade
                popcorn.cue(AUTO_CROSS_FADE_CUE_ID, crossFadeTime, function autoCrossFadeCueCb() {
                    $rootScope.$apply(function () {
                        crossFadeToPendingPlayer();
                    });
                });

                // actually start the player
                popcorn.play();
                popcorn.fade({direction: 'in', duration: CROSS_FADE_DURATION});

                deferred.resolve();
            }

            return deferred.promise;
        }

        function crossFadeToPendingPlayer() {
            var stoppingPromise = stopRunningPlayer();

            stoppingPromise.then(function stoppingRunningPlayerCb() {
                if (!_runningPlayer) {
                    // end of the road: nothing has been started while stopping the player
                    _playback = PlaybackState.STOPPED;
                }
            });

            if (_pendingPlayer) {
                startPendingPlayer();
            }
        }

        function moveTo(queueEntry) {
            // when the pending is ready and the playback is resumed we can proceed
            return preparePendingPlayer(queueEntry)
                .then(function moveToContinueCb() {
                    if (_playback === PlaybackState.PLAYING) {
                        crossFadeToPendingPlayer();
                    } else if (_playback === PlaybackState.PAUSED) {
                        // the orchestrator is now paused so we retains the next steps until someone resume or cancel
                        // the "moveTo" request
                        _moveToContinuation = $q.defer();
                        _moveToContinuation.promise.then(crossFadeToPendingPlayer);
                    }
                });
        }

        function skipTo(queueEntry) {
            if (_playback === PlaybackState.PAUSED) {
                _moveToContinuation.reject();
                resume();
            } else if (_playback === PlaybackState.STOPPED) {
                play();
            }

            skippedToEntry = queueEntry;
            moveTo(queueEntry).then(function () {
                skippedToEntry = null;
            });
        }

        function pause() {
            pausePlayers();
            _playback = PlaybackState.PAUSED;
        }

        function resume() {
            resumePlayers();
            _playback = PlaybackState.PLAYING;
        }

        function play() {
            _playback = PlaybackState.PLAYING;
        }

        /**
         * Returns the closest valid entry replacing the one just removed or null if there is not.
         *
         * @param {Array.<mt.model.QueueEntry>} newEntries
         * @param {Array.<mt.model.QueueEntry>} oldEntries
         * @param {mt.model.QueueEntry} removedEntry
         * @returns {?mt.model.QueueEntry}
         */
        function findReplacingEntry(newEntries, oldEntries, removedEntry) {
            var oldIndex = oldEntries.indexOf(removedEntry);
            if (oldIndex >= newEntries.length) {
                return null;
            }

            return mtQueueManager.closestValidEntry(newEntries[oldIndex], true);
        }

        $rootScope.$watchCollection(function () {
            return mtQueueManager.queue.entries;
        }, function entriesWatcherChangeHandler(newEntries, oldEntries) {
            if (newEntries && !angular.equals(newEntries, oldEntries)) {
                if (newEntries.length === 0) {
                    // the queue is empty, probably just cleared, do the same for the player
                    freePendingPlayer();
                    stopRunningPlayer();
                } else {
                    var removedEntries = _.difference(oldEntries, newEntries);

                    if (_.contains(removedEntries, _preparePendingPlayerRq.queueEntry)) {

                        // keep a ref to the pending queue entry
                        var requestedPendingQueueEntry = _preparePendingPlayerRq.queueEntry;

                        // make sure the current pending player is cleared
                        if (_pendingPlayer) {
                            freePendingPlayer();
                        }

                        // prepare the entry that is now at the position of the removed entry
                        var entryToPrepare = findReplacingEntry(newEntries, oldEntries, requestedPendingQueueEntry);
                        if (entryToPrepare) {
                            preparePendingPlayer(entryToPrepare);
                        }
                    }

                    if (_runningPlayer && _.contains(removedEntries, _runningPlayer.queueEntry)) {
                        // prepare the entry that is now at the position of the removed entry
                        var entryToMoveTo = findReplacingEntry(newEntries, oldEntries, _runningPlayer.queueEntry);
                        if (entryToMoveTo) {
                            skipTo(entryToMoveTo);
                        } else {
                            stopRunningPlayer();
                        }
                    }
                }
            }
        });

        return {

            get PlaybackState() {
                return PlaybackState;
            },

            /**
             * The currently loading queue entry.
             *
             * @returns {?mt.model.QueueEntry}
             */
            get runningQueueEntry() {
                if (!_runningPlayer) {
                    return null;
                }

                return _runningPlayer.queueEntry;
            },

            /**
             * The currently loading queue entry.
             *
             * This value is not null only if the loading has been initiated by a external action ie. not by
             * the orchestrator itself.
             *
             * @returns {?mt.model.QueueEntry}
             */
            get skippedToQueueEntry() {
                return skippedToEntry;
            },

            /**
             * @returns {PlaybackState}
             */
            get playback() {
                return _playback;
            },

            /**
             * @param {mt.model.QueueEntry} queueEntry
             */
            skipTo: skipTo,

            togglePlayback: function () {
                if (_playback === PlaybackState.PLAYING) {
                    pause();
                } else if (_playback === PlaybackState.PAUSED) {
                    _moveToContinuation.resolve();
                    resume();
                } else if (_playback === PlaybackState.STOPPED) {
                    var queueEntry = mtQueueManager.closestValidEntry();
                    if (queueEntry) {
                        play();
                        skippedToEntry = queueEntry;
                        moveTo(queueEntry).then(function () {
                            skippedToEntry = null;
                        });
                    }
                }
            }
        };
    });
})(mt);