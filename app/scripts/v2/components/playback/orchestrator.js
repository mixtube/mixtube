(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtOrchestrator', function ($q, $rootScope, $timeout, mtQueueManager, mtMediaElementsPool) {

        function Playback() {
            this._status = Playback.Status.STOPPED;
            this._resumeDeferred = $q.defer();
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
                this._resumeDeferred.promise.then(cb);
            },

            pause: function () {
                this._status = Playback.Status.PAUSED;
                this._resumeDeferred = $q.defer();
            },

            resume: function () {
                this._status = Playback.Status.PLAYING;
                this._resumeDeferred.resolve();
            },

            stop: function () {
                this._status = Playback.Status.STOPPED;
                this._resumeDeferred.reject();
            }
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
            this._disposed = false;
        }

        Player.CROSS_FADE_DURATION = 3;
        Player.AUTO_CROSS_FADE_CUE_ID = 'autoCrossFadeCue';
        Player.prototype = {

            _checkNotDisposed: function () {
                if (this._disposed) throw new Error('This player has been disposed and can not be used anymore');
            },

            dispose: function () {
                if (!this._disposed) {
                    this._disposed = true;
                    this.popcorn.destroy();
                    this.mediaElementWrapper.release();
                    this.popcorn = null;
                    this.mediaElementWrapper = null;
                }
            },

            /**
             * @param {{autoCrossFadeCb: function}} options
             */
            play: function (options) {
                this._checkNotDisposed();

                var player = this;
                var crossFadeTime = 15;

                // registers a cue to install auto cross-fade
                player.popcorn.cue(player.AUTO_CROSS_FADE_CUE_ID, crossFadeTime, function autoCrossFadeCueCb() {
                    $rootScope.$apply(function () {
                        options.autoCrossFadeCb();
                    });
                });

                player.popcorn.play();
                player.popcorn.fade({direction: 'in', duration: Player.CROSS_FADE_DURATION});
            },

            stop: function () {
                this._checkNotDisposed();

                var player = this;
                var deferred = $q.defer();

                // remove the auto cross fade cue to avoid auto cross fading while stopping a player
                player.popcorn.removeTrackEvent(Player.AUTO_CROSS_FADE_CUE_ID);

                // fade out and free the player
                player.popcorn.fade({direction: 'out', duration: Player.CROSS_FADE_DURATION, done: function () {
                    $rootScope.$apply(function () {
                        player.dispose();
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
            this._prepareDeferred = $q.defer();
            this._forgotten = false;
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
                            request._prepareDeferred.promise.catch(function () {
                                player.dispose();
                            });

                            // the request is ready (has no effect if the request has been aborted already)
                            request._prepareDeferred.resolve(player);
                        });
                    });
                });

                mediaElementWrapper.get().src = 'http://www.youtube.com/watch?v=' + request.queueEntry.video.id;
            },

            forget: function () {
                this._prepareDeferred.reject();
            },

            whenReady: function (callback) {
                this._prepareDeferred.promise.then(callback);
            },

            whenFinished: function (callback) {
                this._prepareDeferred.promise.finally(callback);
            }
        };

        /**
         * The orchestrator's current playback state
         *
         * @type {Playback}
         */
        var _playback = new Playback();

        /** @type {Player} */
        var _runningPlayer = null;
        /** @type {Array.<Player>} */
        var _stoppingPlayers = [];


        /** @type {PreparePlayerRequest} */
        var _preparePendingRq = null;

        /**
         * The entry currently in preparation for which the loading has been triggered by a manual "move to" call.
         *
         * It is only used for the public API, this has not interest internally.
         *
         * @type {mt.model.QueueEntry}
         */
        var _movedToEntry = null;


        /**
         * Iterates through all the running and stopping player and execute the given callback on each item.
         *
         * @param {function(Player)} cb
         */
        function forEachActivePlayers(cb) {
            if (_runningPlayer) {
                cb(_runningPlayer);
            }
            _stoppingPlayers.forEach(function (player) {
                cb(player);
            });
        }

        /**
         * Checks if the player delivered by the given request is not stale regarding the orchestrator pending player
         * preparing request.
         *
         * If the player is stale, the callback is not executed and the player is freed.
         *
         * @param {?PreparePlayerRequest} preparePlayerRequest
         * @param {function(Player)} cb
         */
        function whenPreparePendingRequestReady(preparePlayerRequest, cb) {
            if (preparePlayerRequest) {
                preparePlayerRequest.whenReady(function (player) {
                    if (player !== _preparePendingRq) {
                        // todo check if that branch is used at all
                        player.dispose();
                    } else {
                        cb(player);
                    }
                });
            }
        }

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

        /**
         * Stops the running player and free it after fading it out.
         */
        function stopRunning() {
            if (_runningPlayer) {
                var player = _runningPlayer;
                _runningPlayer = null;

                stopPlayer(player)
                    .then(function () {
                        if (!_runningPlayer) {
                            // end of the road: nothing has been started while stopping the player
                            _playback.stop();
                        }
                    });
            }
        }

        function preparePending(queueEntry) {
            if (_preparePendingRq) {
                _preparePendingRq.forget();
            }
            _preparePendingRq = new PreparePlayerRequest(queueEntry);
            _preparePendingRq.prepare();
        }

        function preparePendingAuto() {
            var nextQueueEntry = null;
            if (_runningPlayer) {
                nextQueueEntry = mtQueueManager.closestValidEntry(_runningPlayer.queueEntry, false);
            }
            if (!nextQueueEntry) {
                preparePending(nextQueueEntry);
            }
        }

        /**
         * Cross fades to the new video obtained through the preparing request for the pending player.
         *
         * Cross fading will take place once the pending player is prepared and the orchestrator is playing.
         */
        function eventuallyCrossFadeToPending() {
            whenPreparePendingRequestReady(_preparePendingRq, function (player) {
                _playback.whenPlaying(function () {

                    // fade out the currently playing video
                    stopRunning();

                    // promote the pending player to the running players list
                    _runningPlayer = player;

                    // actually start the player
                    player.play({autoCrossFadeCb: eventuallyCrossFadeToPending});

                    // prepare (preload) the next player so that the upcoming auto cross-fade will run smoothly
                    $timeout(function () {
                        preparePendingAuto();
                    });
                });
            });
        }

        function moveTo(queueEntry) {
            preparePending(queueEntry);
            eventuallyCrossFadeToPending();

            _movedToEntry = queueEntry;
            _preparePendingRq.whenFinished(function () {
                _movedToEntry = null;
            })
        }

        function pause() {
            forEachActivePlayers(function (player) {
                player.popcorn.pause();
            });
            _playback.pause();
        }

        function resume() {
            forEachActivePlayers(function (player) {
                player.popcorn.play();
            });
            _playback.resume();
        }

        function play() {
            _playback.resume();
        }

        function freePending() {
            _preparePendingRq.forget();
            _preparePendingRq = null;
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
                    // the queue is empty, probably just cleared, do the same for the players abd
                    freePending();
                    stopRunning();
                } else {
                    var removedEntries = _.difference(oldEntries, newEntries);

                    if (_preparePendingRq && _.contains(removedEntries, _preparePendingRq.queueEntry)) {

                        // keep a ref to the pending queue entry
                        var pendingQueueEntry = _preparePendingRq.queueEntry;

                        freePending();

                        // prepare the entry that is now at the position of the removed entry
                        var entryToPrepare = findReplacingEntry(newEntries, oldEntries, pendingQueueEntry);
                        if (entryToPrepare) {
                            preparePending(entryToPrepare);
                        }
                    }

                    if (_runningPlayer && _.contains(removedEntries, _runningPlayer.queueEntry)) {
                        // prepare the entry that is now at the position of the removed entry
                        var entryToMoveTo = findReplacingEntry(newEntries, oldEntries, _runningPlayer.queueEntry);
                        if (entryToMoveTo) {
                            moveTo(entryToMoveTo);
                        } else {
                            stopRunning();
                        }
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
                return _runningPlayer && _runningPlayer.queueEntry;
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
                return _movedToEntry;
            },

            /**
             * @returns {Playback}
             */
            get playback() {
                return _playback;
            },

            /**
             * @param {mt.model.QueueEntry} queueEntry
             */
            skipTo: function (queueEntry) {
                if (_playback.paused) {
                    resume();
                } else if (_playback.stopped) {
                    play();
                }

                moveTo(queueEntry);
            },

            togglePlayback: function () {
                if (_playback.playing) {
                    pause();
                } else if (_playback.paused) {
                    resume();
                } else if (_playback.stopped) {
                    var queueEntry = mtQueueManager.closestValidEntry();
                    if (queueEntry) {
                        play();
                        moveTo(queueEntry);
                    }
                }
            }
        };
    });
})(mt);