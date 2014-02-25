(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtOrchestrator', function ($q, mtQueueManager, mtMediaElementsPool) {

        return {
            skipTo: function (queueEntry) {

                var playingDeferred = $q.defer();

                var wrapper = mtMediaElementsPool(queueEntry.video.provider);
                var popcorn = Popcorn(wrapper.get());

                popcorn.on('loadedmetadata', function () {
                    popcorn.fade({direction: 'in', start: 0, duration: 5});
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