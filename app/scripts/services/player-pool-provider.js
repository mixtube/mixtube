(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtPlayerPoolProvider', function ($rootScope, $q, $document, mtLoggerFactory) {
        var deferred = $q.defer();

        // executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application that it is ready
        var playersPool = new mt.player.PlayersPool(function () {
            var playerDiv = angular.element('<div class="mt-video-player-instance"></div>');
            mt.tools.querySelector($document, '.mt-video-player-window').append(playerDiv);
            return playerDiv[0];
        }, mtLoggerFactory.logger('PlayersPool'));

        mtLoggerFactory.logger('mtMixTubeApp#run').debug('Youtube iFrame API ready and players pool created');

        deferred.resolve(playersPool);

        return {
            'get': function () {
                return deferred.promise;
            }
        }
    });
})(mt);