(function (mt) {
    mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngResource'])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(true);
        }).run(function ($rootScope, mtLoggerFactory) {
            var wordCharRegExp = /\w/;
            document.addEventListener('keyup', function (evt) {
                var convertedString = String.fromCharCode(evt.which);
                if (wordCharRegExp.test(convertedString)) {
                    $rootScope.$apply(function () {
                        $rootScope.$broadcast(mt.events.OpenSearchFrameRequest, {typedChar: convertedString});
                    });
                }
            });

            // executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application
            // that it is ready
            window.onYouTubeIframeAPIReady = function () {
                var playersPool = new mt.player.PlayersPool(function () {
                    var playerDiv = document.createElement('div');
                    playerDiv.classList.add('mt-player-frame');
                    document.getElementById('mt-video-window').appendChild(playerDiv);
                    return playerDiv;
                }, mtLoggerFactory.logger('PlayersPool'));

                $rootScope.$apply(function () {
                    $rootScope.$broadcast(mt.events.PlayersPoolReady, playersPool);
                });
            };
        });

    mt.events = {
        LoadPlaylistEntryRequest: 'LoadPlaylistEntryRequest',
        NextPlaylistEntryRequest: 'NextPlaylistEntryRequest',
        OpenSearchFrameRequest: 'OpenSearchFrameRequest',
        AppendVideoToPlaylistRequest: 'AppendVideoToPlaylistRequest',
        PlayersPoolReady: 'PlayersPoolReady',
        PlaylistModified: 'PlaylistModified',
        PlaylistEntryActivated: 'PlaylistEntryActivated'
    };

    mt.model = {
        Video: function () {
            this.id = undefined;
            this.title = undefined;
            this.thumbnailUrl = undefined;
            this.duration = undefined;
            this.viewCount = undefined;
            this.provider = undefined;
        },
        PlaylistEntry: function () {
            this.id = undefined;
            this.video = undefined;
        }
    };

    mt.tools = {__uniqueIdCounter: 0};
    mt.tools.findWhere = function (array, attrs) {
        var result = array.filter(function (value) {
            for (var key in attrs) {
                if (attrs[key] !== value[key]) return false;
            }
            return true;
        });
        return result.length > 0 ? result[0] : null;
    };
    mt.tools.uniqueId = function () {
        return 'mt_uid_' + mt.tools.__uniqueIdCounter++;
    };
})(window.mt = window.mt || {});