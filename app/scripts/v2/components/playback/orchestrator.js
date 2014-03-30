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
         *
         * @param {mtMediaElementWrapper} mediaElementWrapper
         * @param {Popcorn} popcorn
         * @param {mt.model.QueueEntry} queueEntry
         * @constructor
         */
        function Player(mediaElementWrapper, popcorn, queueEntry) {
            this.mediaElementWrapper = mediaElementWrapper;
            this.popcorn = popcorn;
            this.queueEntry = queueEntry;
        }

        Player.prototype = {
            AUTO_CROSS_FADE_CUE_ID: 'autoCrossFadeCue',

            free: function () {
                this.popcorn.destroy();
                this.mediaElementWrapper.release();
            },

            /**
             * @param {{autoCrossFadeCb: function}} options
             */
            play: function (options) {
                var player = this;
                var crossFadeTime = 15;

                // registers a cue to install auto cross-fade
                player.popcorn.cue(player.AUTO_CROSS_FADE_CUE_ID, crossFadeTime, function autoCrossFadeCueCb() {
                    $rootScope.$apply(function () {
                        options.autoCrossFadeCb();
                    });
                });

                player.popcorn.play();
                player.popcorn.fade({direction: 'in', duration: CROSS_FADE_DURATION});
            },

            stop: function () {
                var player = this;
                var deferred = $q.defer();

                // remove the auto cross fade cue to avoid auto cross fading while stopping a player
                player.popcorn.removeTrackEvent(player.AUTO_CROSS_FADE_CUE_ID);

                // fade out and free the player
                player.popcorn.fade({direction: 'out', duration: CROSS_FADE_DURATION, done: function () {
                    $rootScope.$apply(function () {
                        player.free();
                        deferred.resolve();
                    });
                }});

                return deferred.promise;
            }
        };

        /**
         * @param {mt.model.QueueEntry} queueEntry
         * @constructor
         */
        function PreparePlayerRequest(queueEntry) {
            this.queueEntry = queueEntry;
            this._readyDeferred = $q.defer();
        }

        PreparePlayerRequest.prototype = {
            prepare: function () {
                var request = this;

                var mediaElementWrapper = mtMediaElementsPool(request.queueEntry.video.provider);
                var popcorn = Popcorn(mediaElementWrapper.get());

                var player = new Player(mediaElementWrapper, popcorn, request.queueEntry);

                popcorn.one('canplay', function preparePlayerCanPlayCb() {
                    $rootScope.$apply(function () {
                        // makes really sure a call to play will start the video instantaneously by forcing the player to buffer
                        popcorn.play();
                        popcorn.one('playing', function preparePlayerPlayingCb() {
                            popcorn.pause();

                            // if the request has been aborted we free the player
                            request._readyDeferred.promise.catch(function () {
                                player.free();
                            });

                            // the request is ready (has no effect if the request has been aborted already)
                            request._readyDeferred.resolve(player);
                        });
                    });
                });

                mediaElementWrapper.get().src = 'http://www.youtube.com/watch?v=' + request.queueEntry.video.id;
            },

            abort: function () {
                this._readyDeferred.reject(new Error('PreparePlayerRequest has been aborted'));
            },

            ready: function (check, callback) {
                var request = this;
                return this._readyDeferred.promise.then(function () {
                    if (request === check()) {
                        callback();
                    } else {
                        request.abort();
                    }
                });
            }
        };

        /**
         * Duration of the whole cross-fade in seconds
         *
         * @const
         * @type {number}
         */
        var CROSS_FADE_DURATION = 3;

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

        /** @type {Player} */
        var _runningPlayer = null;
        /** @type {Array.<Player>} */
        var _stoppingPlayers = [];


        /** @type {PreparePlayerRequest} */
        var _preparePendingPlayerRq = null;

        /**
         * The entry currently in preparation for which the loading has been triggered by a manual skip to call.
         *
         * @type {mt.model.QueueEntry}
         */
        var skippedToEntry = null;

        /**
         * Promotes the given player to the stopping list, fades out and frees it.
         *
         * @param {Player} player
         * @return {Promise} resolved when the player stopped (fade out included)
         */
        function stopPlayer(player) {
            _stoppingPlayers.push(player);
            return player.stop().then(function () {
                _.remove(_stoppingPlayers, player);
            });
        }

        function stopRunningPlayer() {
            if (_runningPlayer) {
                var player = _runningPlayer;
                _runningPlayer = null;

                stopPlayer(player).then(function () {
                    if (!_runningPlayer) {
                        // end of the road: nothing has been started while stopping the player
                        _playback = PlaybackState.STOPPED;
                    }
                });
            }
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

        function preparePendingPlayer(queueEntry) {
            if (_preparePendingPlayerRq) {
                _preparePendingPlayerRq.abort();
            }
            _preparePendingPlayerRq = new PreparePlayerRequest(queueEntry);
            _preparePendingPlayerRq.prepare();
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

            preparePendingPlayer(nextQueueEntry);
        }

        function startPending() {
            if (!_preparePendingPlayerRq) {
                return;
            }

            _preparePendingPlayerRq.ready(function () {
                return _preparePendingPlayerRq;
            }, function (player) {
                // promote the pending player to the running players list
                _runningPlayer = player;

                // actually start the player
                player.play({autoCrossFadeCb: crossFadeToPending});

                // prepare (preload) the next player so that the upcoming auto cross-fade will run smoothly
                $timeout(function () {
                    preparePendingPlayerAuto();
                });
            });
        }

        function crossFadeToPending() {
            stopRunningPlayer();
            startPending();
        }

        function moveTo(queueEntry) {
            // when the pending is ready and the playback is resumed we can proceed
            preparePendingPlayer(queueEntry);

            return _preparePendingPlayerRq.ready(function () {
                return _preparePendingPlayerRq;
            }, function moveToContinueCb() {
                if (_playback === PlaybackState.PLAYING) {
                    crossFadeToPending();
                } else if (_playback === PlaybackState.PAUSED) {
                    // the orchestrator is now paused so we retains the next steps until someone resume or cancel
                    // the "moveTo" request
                    _moveToContinuation = $q.defer();
                    _moveToContinuation.promise.then(crossFadeToPending);
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

                    if (_preparePendingPlayerRq && _.contains(removedEntries, _preparePendingPlayerRq.queueEntry)) {

                        // keep a ref to the pending queue entry
                        var requestedPendingQueueEntry = _preparePendingPlayerRq.queueEntry;

                        // make sure the current pending player is cleared
                        freePendingPlayer();

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