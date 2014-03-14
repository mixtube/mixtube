(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtOrchestrator', function ($q, $rootScope, mtQueueManager, mtMediaElementsPool) {

        /**
         * Duration of the whole cross-fade in seconds
         *
         * @const
         * @type {number}
         */
        var CROSS_FADE_DURATION = 3;

        var _pendingPlayer = null;
        var _runningPlayers = [];

        function freePlayer(player) {
            player.popcorn.destroy();
            player.mediaElementWrapper.release();
        }

        /**
         * Fades out, free and remove the currently running players from the list
         */
        function stopRunningPlayers() {
            _runningPlayers.forEach(function (runningPlayer) {
                runningPlayer.popcorn.fade({direction: 'out', duration: CROSS_FADE_DURATION, done: function () {
                    freePlayer(runningPlayer);
                    _.remove(_runningPlayers, runningPlayer);
                    $rootScope.$digest();
                }});
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
                // makes really sure a call to play will start the video instantaneously by forcing the player to buffer
                popcorn.play();
                popcorn.one('playing', function () {
                    popcorn.pause();
                    deferred.resolve(_pendingPlayer);
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

                // registers a cue to install auto cross-fade
                popcorn.cue(crossFadeTime, function () {
                    stopRunningPlayers();
                    if (_pendingPlayer) {
                        startPendingPlayer();
                    }
                    $rootScope.$digest();
                });
                popcorn.play();
                popcorn.fade({direction: 'in', duration: CROSS_FADE_DURATION});

                // promote the pending player to the running players list
                _runningPlayers.push(_pendingPlayer);

                _pendingPlayer = null;

                _.defer(function () {
                    // prepare (preload) the next player so that the upcoming auto cross-fade will run smoothly
                    preparePendingAuto();
                });

                deferred.resolve();
            }

            return deferred.promise;
        }

        function skipTo(queueEntry) {
            return preparePending(queueEntry).then(function () {
                stopRunningPlayers();
                return startPendingPlayer();
            });
        }

        return {
            skipTo: skipTo,

            get runningQueueEntry() {
                if (!_runningPlayers.length) {
                    return null;
                }

                return _.last(_runningPlayers).queueEntry;
            }
        };
    });
})(mt);