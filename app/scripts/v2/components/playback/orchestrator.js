(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtOrchestrator', function ($q, mtQueueManager, mtMediaElementsPool) {

        var runningPopcorns = [];

        return {
            skipTo: function (queueEntry) {

                var playingDeferred = $q.defer();

                var wrapper = mtMediaElementsPool(queueEntry.video.provider);
                var popcorn = Popcorn(wrapper.get());

                popcorn.on('loadedmetadata', function () {
                    popcorn.fade({direction: 'in', duration: 5});

                    runningPopcorns.forEach(function (runningPopcorns) {
                        runningPopcorns.fade({direction: 'out', duration: 5});
                    });

                    runningPopcorns = [popcorn];
                });

                popcorn.on('canplay', function () {
                    popcorn.play();
                    playingDeferred.resolve();
                });

                wrapper.get().src = 'http://www.youtube.com/watch?v=' + queueEntry.video.id;

                return playingDeferred.promise;
            }
        };
    });
})(mt);