window.mt = window.mt || {};

mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngResource']);

mt.events = {
    StartVideoPlayback: 'StartVideoPlayback',
    NeedNextVideoInstance: 'NeedNextVideoInstance',
    YouTubePlayerReady: 'YouTubePlayerReady'
};

mt.model = {
    Video: function (id, provider, thumbnailUrl) {
        this.id = id;
        this.provider = provider;
        this.thumbnailUrl = thumbnailUrl;
    }
};


window.onYouTubeIframeAPIReady = function () {
    var PLAYERS_TOTAL_COUNT = 2;
    var players = [];

    var onReady = function (event) {
        // the target is the YT.Player
        players.push(new mt.player.Player(event.target));
        if (players.length === PLAYERS_TOTAL_COUNT) {
            // when all players a ready, dispatch the event
            var rootScope = angular.element(document).scope();
            rootScope.$apply(function () {
                rootScope.$broadcast(mt.events.YouTubePlayerReady, players);
            });
        }
    };

    for (var idx = 0; idx < PLAYERS_TOTAL_COUNT; idx++) {
        new YT.Player('mt-player-' + idx, {
            height: '390',
            width: '640',
            playerVars: {
                controls: 0,
                showinfo: 0,
                iv_load_policy: 3,
                disablekb: 1
            },
            events: {
                onReady: onReady
            }
        });
    }
};

// todo rename timeline to playlist
mt.MixTubeApp.controller('mtTimelineCtrl', function ($scope, $rootScope, mtYoutubeClient, mtLogger) {

    $scope.currentVideoInstanceIdx = 0;

    $scope.videoInstances = [
        {"id": "35FbLhYG86M", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/35FbLhYG86M/default.jpg", "duration": 340000},
        {"id": "ypU6RHVb_Gw", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/ypU6RHVb_Gw/default.jpg", "duration": 255000},
        {"id": "YiC5SeRfLYw", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/YiC5SeRfLYw/default.jpg", "duration": 282000},
        {"id": "-B8IKn-RrDc", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/-B8IKn-RrDc/default.jpg", "duration": 402000},
        {"id": "oBbHo8b4FDc", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/oBbHo8b4FDc/default.jpg", "duration": 270000},
        {"id": "wvLv_Pem0BA", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/wvLv_Pem0BA/default.jpg", "duration": 268000},
        {"id": "hhRWM-K5TD8", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/hhRWM-K5TD8/default.jpg", "duration": 258000},
        {"id": "NNrporSoQf8", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/NNrporSoQf8/default.jpg", "duration": 261000},
        {"id": "e3xXCfXxr70", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/e3xXCfXxr70/default.jpg", "duration": 192000},
        {"id": "XPhUUAjSKD8", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/XPhUUAjSKD8/default.jpg", "duration": 288000}
    ];

    $scope.$on(mt.events.NeedNextVideoInstance, function () {
        mtLogger.debug('Next video instance request received');

        $scope.currentVideoInstanceIdx++;
        if ($scope.currentVideoInstanceIdx < $scope.videoInstances.length) {
            var videoInstance = $scope.videoInstances[$scope.currentVideoInstanceIdx];
            $rootScope.$broadcast(mt.events.StartVideoPlayback, {videoInstance: videoInstance, immediate: false});
        }
    });

    $scope.videoInstanceClicked = function (videoInstance) {
        $scope.currentVideoInstanceIdx = $scope.videoInstances.indexOf(videoInstance);
        $rootScope.$broadcast(mt.events.StartVideoPlayback, {videoInstance: videoInstance, immediate: true});
    };

    $scope.testLoad = function () {
        mtYoutubeClient.searchVideosByQuery('booba').then(function (videoInstances) {
            var videosIds = videoInstances.map(function (videoInstance) {
                return videoInstance.id;
            });

            mtYoutubeClient.collectVideoDurationByIds(videosIds).then(function (durationsByIds) {
                videoInstances.forEach(function (videoInstance) {
                    videoInstance.duration = durationsByIds[videoInstance.id];
                });

                console.log(JSON.stringify(videoInstances));
            });
        });
    };

    //$scope.testLoad();
});

mt.MixTubeApp.controller('mtVideoPlayerStageCtrl', function ($scope, $rootScope, mtLogger) {

    /**
     * @type {Array.<mt.player.Player>}
     */
    $scope.players = [];
    $scope.currentPlayerIdx = 0;

    $scope.getCurrentPlayer = function () {
        return $scope.players[$scope.currentPlayerIdx];
    };

    $scope.getNextPlayer = function () {
        return $scope.players[$scope.currentPlayerIdx === 0 ? 1 : 0];
    };

    $scope.switchCurrentNextPlayers = function () {
        $scope.currentPlayerIdx = $scope.currentPlayerIdx === 0 ? 1 : 0;
    };

    var startAndCrossFade = function () {
        var nextPlayer = $scope.getNextPlayer();
        var lastPlayer = $scope.getCurrentPlayer();

        mtLogger.debug('Start cross fade operation from player %d to player %d', lastPlayer.instanceId, nextPlayer.instanceId);

        nextPlayer.in();
        lastPlayer.out();

        $scope.switchCurrentNextPlayers();

        // now that the new video is running ask for the next one
//        $rootScope.$apply(function () {
//            $rootScope.$broadcast(mt.events.NeedNextVideoInstance);
//        });

    };

    $scope.$on(mt.events.YouTubePlayerReady, function (event, players) {
        $scope.players = players;

        $scope.players.forEach(function (player) {
            player.addPlaybackProgressListener(10000, function () {
                // seems that we don't need apply here because there already is a dispatch

                mtLogger.debug('Progress listener executed, will start a cross fade operation');

                // here we assume that video was preload by the listener bellow
                startAndCrossFade();
            })
        });
    });

    $scope.$on(mt.events.StartVideoPlayback, function (event, data) {
        var nextPlayer = $scope.getNextPlayer();

        mtLogger.debug('Start request for video %s received with immediate flag %s, will be loaded on player', data.videoInstance.id, data.immediate, nextPlayer.instanceId);

        if (data.immediate) {
            nextPlayer.preloadVideoById(data.videoInstance.id, data.videoInstance.duration, startAndCrossFade);
        } else {
            nextPlayer.preloadVideoById(data.videoInstance.id, data.videoInstance.duration);
        }
    });
});

mt.MixTubeApp.factory('mtYoutubeClient', function ($resource, $q) {
    var iso8601RegExp = /PT(\d*)M(\d*)S/;

    /**
     * Converts a ISO8601 duration string to a duration in milliseconds.
     *
     * @param duration {string} 'PT#M#S' format where M and S refer to length in minutes and seconds
     * @return {number} the duration in milliseconds
     */
    function convertISO8601DurationToMillis(duration) {
        var execResult = iso8601RegExp.exec(duration);
        var minutes = parseInt(execResult[1]);
        var seconds = parseInt(execResult[2]);
        return (minutes * 60 + seconds) * 1000;
    }

    var searchResource = $resource('https://www.googleapis.com/youtube/v3/search',
        {
            key: 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg',
            maxResults: 10,
            type: 'video',
            part: 'id,snippet',
            callback: 'JSON_CALLBACK'
        }, {query: {method: 'JSONP', isArray: false}}
    );

    var videosResource = $resource('https://www.googleapis.com/youtube/v3/videos',
        {
            key: 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg',
            part: 'contentDetails',
            callback: 'JSON_CALLBACK'
        }, {query: {method: 'JSONP', isArray: false}}
    );

    return {
        /**
         * Searches the 10 first videos on youtube matching the query.
         *
         * @param {string} queryString the query as used for a classic youtube search
         * @return {Promise} a promise of {@link  mt.model.Video}
         */
        searchVideosByQuery: function (queryString) {
            var deferred = $q.defer();

            searchResource.query({q: queryString}, function (response) {
                var videos = [];
                response.items.forEach(function (item) {
                    videos.push(new mt.model.Video(item.id.videoId, 'youtube', item.snippet.thumbnails.default.url));
                });
                deferred.resolve(videos);
            }, deferred.reject);

            return deferred.promise;
        },

        /**
         * Fetches videos durations for the supplied ids. The durations are in milliseconds for convenience but the
         * precision is actually smaller (seconds).
         *
         * @param ids {Array.<string>} the videos ids
         * @return {Promise} a promise of the durations in milliseconds indexed by videos ids
         */
        collectVideoDurationByIds: function (ids) {
            var deferred = $q.defer();

            var durationById = {};

            videosResource.query({id: ids.join(',')}, function (response) {
                response.items.forEach(function (item) {
                    durationById[item.id] = convertISO8601DurationToMillis(item.contentDetails.duration);
                });
                deferred.resolve(durationById);
            }, deferred.reject);

            return deferred.promise;
        }
    };
});

mt.MixTubeApp.factory('mtLogger', function ($window) {
    function prependTime(arguments) {
        var now = new Date();
        var newArguments = [];
        newArguments[0] = '[%d:%d:%d] ' + arguments[0];
        newArguments[1] = now.getHours();
        newArguments[2] = now.getMinutes();
        newArguments[3] = now.getSeconds();
        for (var idx = 1; idx < arguments.length; idx++) {
            newArguments[idx + 3] = arguments[idx];
        }
        return newArguments;
    }

    return {
        log: function () {
            $window.console.log.apply($window.console, arguments)
        },
        dir: function () {
            $window.console.dir.apply($window.console, arguments)
        },
        debug: function () {
            $window.console.debug.apply($window.console, prependTime(arguments))
        }
    };
});