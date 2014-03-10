(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtOrchestrator', function ($q, mtQueueManager, mtMediaElementsPool) {

        var _pendingPlayer = null;
        var _runningPlayers = [];

        function freePlayer(player) {
            player.popcorn.destroy();
            player.wrapper.release();
        }

        /**
         * Fades out, free and remove the currently running players from the list
         */
        function initiateRunningPlayersTermination() {
            _runningPlayers.forEach(function (runningPlayer) {
                runningPlayer.popcorn.fade({direction: 'out', duration: 5, done: function () {
                    freePlayer(runningPlayer);
                    _.remove(_runningPlayers, runningPlayer);
                }});
            });
        }

        function preparePending(queueEntry) {
            var deferred = $q.defer();

            var wrapper = mtMediaElementsPool(queueEntry.video.provider);
            var popcorn = Popcorn(wrapper.get());

            // if there is already a pending player we want to cancel: most recent request always wins
            if (_pendingPlayer) {
                freePlayer(_pendingPlayer);
            }
            _pendingPlayer = {wrapper: wrapper, popcorn: popcorn};

            popcorn.on('canplay', function preparePendingCanPlayCb() {
                popcorn.off('canplay', preparePendingCanPlayCb);
                deferred.resolve();
            });

            wrapper.get().src = 'http://www.youtube.com/watch?v=' + queueEntry.video.id;

            return deferred.promise;
        }

        /**
         * @returns {promise}
         */
        function startPending() {
            var deferred = $q.defer();
            var popcorn = _pendingPlayer.popcorn;

            if (popcorn.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
                // safety checking: there is a race condition here and it shouldn't happen
                deferred.reject(new Error('The pending popcorn instance is not ready to be play started'));
            } else {
                // register the cue to initiate the transition before the end (auto cross-fade)
                popcorn.cue(popcorn.duration() - 5, function () {

                });
                popcorn.play();
                popcorn.fade({direction: 'in', duration: 5});
                initiateRunningPlayersTermination();
                // promote the pending player to the running players list
                _runningPlayers.push(_pendingPlayer);
                _pendingPlayer = null;
                deferred.resolve();
            }

            return deferred.promise;
        }

        return {
            skipTo: function (queueEntry) {

                return preparePending(queueEntry).then(function () {
                    return startPending();
                });

//                var playingDeferred = $q.defer();
//
//                var wrapper = mtMediaElementsPool(queueEntry.video.provider);
//                var popcorn = Popcorn(wrapper.get());
//
//                if (_pendingPlayer) {
//                    freePlayer(_pendingPlayer);
//                }
//                _pendingPlayer = {wrapper: wrapper, popcorn: popcorn};
//
//                popcorn.on('loadedmetadata', function () {
//                    popcorn.cue(popcorn.duration() - 5, function () {
//                        play(_pendingPlayer.popcorn);
//                    });
//                });
//
//                popcorn.on('canplay', function () {
//                    play(_pendingPlayer.popcorn);
//                    playingDeferred.resolve();
//                });
//
//                wrapper.get().src = 'http://www.youtube.com/watch?v=' + queueEntry.video.id;
//
//                return playingDeferred.promise;
            }
        };
    });
})(mt);