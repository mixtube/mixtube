(function (mt) {
    mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngResource']).run(function ($rootScope) {
        var wordCharRegExp = /\w/;
        document.addEventListener('keyup', function (evt) {
            var convertedString = String.fromCharCode(evt.which);
            if (wordCharRegExp.test(convertedString)) {
                $rootScope.$apply(function () {
                    $rootScope.$broadcast(mt.events.OpenSearchFrameRequest, {typedChar: convertedString});
                });
            }
        });
    });

    mt.events = {
        LoadVideoRequest: 'LoadVideoRequest',
        NextVideoInstanceRequest: 'NextVideoInstanceRequest',
        PlayersPoolReady: 'PlayersPoolReady',
        OpenSearchFrameRequest: 'OpenSearchFrameRequest'
    };

    mt.model = {
        Video: function (id, provider, thumbnailUrl) {
            this.id = id;
            this.provider = provider;
            this.thumbnailUrl = thumbnailUrl;
        }
    };

// executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application
// that it is ready
    window.onYouTubeIframeAPIReady = function () {
        var playersPool = new mt.player.PlayersPool(function () {
            var playerDiv = document.createElement('div');
            playerDiv.classList.add('mt-player-frame');
            document.getElementById('mt-video-window').appendChild(playerDiv);
            return playerDiv;
        });

        var rootScope = angular.element(document).scope();
        rootScope.$apply(function () {
            rootScope.$broadcast(mt.events.PlayersPoolReady, playersPool);
        });
    };
})(window.mt = window.mt || {});