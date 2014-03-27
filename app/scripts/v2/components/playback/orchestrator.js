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

        var _pendingPlayer = null;
        var _runningPlayers = [];

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
         * Fades out, free and remove the currently running players from the list
         *
         * @return {promise} resolved when all the running players are stopped (fade out included)
         */
        function stopRunningPlayers() {
            var promises = _runningPlayers.map(function (runningPlayer) {
                var deferred = $q.defer();

                runningPlayer.popcorn.fade({direction: 'out', duration: CROSS_FADE_DURATION, done: function () {
                    $rootScope.$apply(function () {
                        freePlayer(runningPlayer);
                        _.remove(_runningPlayers, runningPlayer);
                        deferred.resolve();
                    });
                }});

                return deferred.promise;
            });

            return $q.all(promises);
        }

        function pausePlayers() {
            _runningPlayers.forEach(function (runningPlayer) {
                runningPlayer.popcorn.pause();
            });
        }

        function resumePlayers() {
            _runningPlayers.forEach(function (runningPlayer) {
                runningPlayer.popcorn.play();
            });
        }

        function preparePending(queueEntry) {
            var deferred = $q.defer();

            var mediaElementWrapper = mtMediaElementsPool(queueEntry.video.provider);
            var popcorn = Popcorn(mediaElementWrapper.get());

            // if there is already a pending player we want to cancel: most recent request always wins
            if (_pendingPlayer) {
                freePlayer(_pendingPlayer);
            }
            _pendingPlayer = {mediaElementWrapper: mediaElementWrapper, popcorn: popcorn, queueEntry: queueEntry};

            popcorn.one('canplay', function () {
                $rootScope.$apply(function () {
                    // makes really sure a call to play will start the video instantaneously by forcing the player to buffer
                    popcorn.play();
                    popcorn.one('playing', function () {
                        popcorn.pause();
                        deferred.resolve(_pendingPlayer);
                    });
                });
            });

            mediaElementWrapper.get().src = 'http://www.youtube.com/watch?v=' + queueEntry.video.id;

            return deferred.promise;
        }

        function preparePendingAuto() {
            var runningQueueEntry = _.last(_runningPlayers).queueEntry;
            var nextQueueEntry = mtQueueManager.closestValidEntry(runningQueueEntry, false);

            if (!nextQueueEntry) {
                return $q.reject(new Error('There is not any next queue entry to prepare'));
            }

            return preparePending(nextQueueEntry);
        }

        /**
         * @returns {promise}
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
                _runningPlayers.push(_pendingPlayer);
                _pendingPlayer = null;

                // prepare (preload) the next player so that the upcoming auto cross-fade will run smoothly
                $timeout(function () {
                    preparePendingAuto();
                });

                // registers a cue to install auto cross-fade
                popcorn.cue(crossFadeTime, function () {
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
            stopRunningPlayers()
                .then(function () {
                    if (!_runningPlayers.length) {
                        // end of the road: nothing has been started while stopping the players
                        _playback = PlaybackState.STOPPED;
                    }
                });

            if (_pendingPlayer) {
                startPendingPlayer();
            }
        }

        function moveTo(queueEntry) {
            // when the pending is ready and the playback is resumed when can proceed
            return preparePending(queueEntry)
                .then(function () {
                    if (_playback === PlaybackState.PLAYING) {
                        crossFadeToPendingPlayer();
                    } else if (_playback === PlaybackState.PAUSED) {
                        // the orchestrator is now paused so we retains the next steps
                        _moveToContinuation = $q.defer();
                        _moveToContinuation.promise.then(function () {
                            crossFadeToPendingPlayer();
                        });
                    }
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

        return {

            get PlaybackState() {
                return PlaybackState;
            },

            get runningQueueEntry() {
                if (!_runningPlayers.length) {
                    return null;
                }

                return _.last(_runningPlayers).queueEntry;
            },

            get skippedToQueueEntry() {
                return skippedToEntry;
            },

            /**
             * @returns {PlaybackState}
             */
            get playback() {
                return _playback;
            },

            skipTo: function (queueEntry) {
                if (_playback === PlaybackState.PLAYING) {
                } else if (_playback === PlaybackState.PAUSED) {
                    _moveToContinuation.reject();
                    resume();
                } else if (_playback === PlaybackState.STOPPED) {
                    play();
                } else {
                    throw new Error('Unknown PlaybackState: ' + _playback);
                }

                skippedToEntry = queueEntry;
                moveTo(queueEntry).then(function () {
                    skippedToEntry = null;
                });
            },

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