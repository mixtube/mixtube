window.mt = window.mt || {};

mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngResource']);

mt.events = {
    LoadVideoRequest: 'LoadVideoRequest',
    NextVideoInstanceRequest: 'NextVideoInstanceRequest',
    PlayersPoolReady: 'PlayersPoolReady'
};

mt.model = {
    Video: function (id, provider, thumbnailUrl) {
        this.id = id;
        this.provider = provider;
        this.thumbnailUrl = thumbnailUrl;
    }
};


window.onYouTubeIframeAPIReady = function () {
    // usage
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

// todo rename timeline to playlist
mt.MixTubeApp.controller('mtTimelineCtrl', function ($scope, $rootScope, mtYoutubeClient, mtLogger) {

    $scope.currentVideoInstanceIdx = 0;

    $scope.videoInstances = [
//        {"id": "35FbLhYG86M", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/35FbLhYG86M/default.jpg", "duration": 340000},
        {"id": "35FbLhYG86M", "provider": "youtube", "thumbnailUrl": "https://i.ytimg.com/vi/35FbLhYG86M/default.jpg", "duration": 60000},
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

    $scope.$on(mt.events.NextVideoInstanceRequest, function () {
        mtLogger.debug('Next video instance request received');

        $scope.currentVideoInstanceIdx++;
        if ($scope.currentVideoInstanceIdx < $scope.videoInstances.length) {
            var videoInstance = $scope.videoInstances[$scope.currentVideoInstanceIdx];
            $rootScope.$broadcast(mt.events.LoadVideoRequest, {videoInstance: videoInstance, autoplay: false});
        }
    });

    $scope.videoInstanceClicked = function (videoInstance) {
        $scope.currentVideoInstanceIdx = $scope.videoInstances.indexOf(videoInstance);
        $rootScope.$broadcast(mt.events.LoadVideoRequest, {videoInstance: videoInstance, autoplay: true});
    };

    // used to generate a static array of videos for test purposes
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

    var TRANSITION_DURATION = 5000;

    /** @type {mt.player.PlayersPool} */
    $scope.playersPool = undefined;
    /** @type {mt.player.VideoHandle} */
    $scope.currentVideoHandle = undefined;

    $scope.$on(mt.events.PlayersPoolReady, function (event, players) {
        $scope.playersPool = players;
    });

    $scope.$on(mt.events.LoadVideoRequest, function (event, data) {
        mtLogger.debug('Start request for video %s received with autoplay flag %s', data.videoInstance.id, data.autoplay);

        var transitionStartTime = data.videoInstance.duration - TRANSITION_DURATION;
        mtLogger.debug('Preparing a video %s, the transition cue will start at %d', data.videoInstance.id, transitionStartTime);
        $scope.nextVideoHandle = $scope.playersPool.prepareVideo({
            id: data.videoInstance.id,
            provider: data.videoInstance.provider,
            coarseDuration: data.videoInstance.duration
        }, [
            {time: transitionStartTime, callback: function () {
                // starts the next prepared video at 5 seconds from the end of the current one and cross fade
                $scope.next();
            }}
        ]);

        var nextLoadDeferred = $scope.nextVideoHandle.load();

        if (data.autoplay) {
            nextLoadDeferred.done(function () {
                $scope.next();
            });
        }
    });

    $scope.next = function () {
        if ($scope.currentVideoHandle) {
            $scope.currentVideoHandle.out(TRANSITION_DURATION)
        }

        $scope.currentVideoHandle = $scope.nextVideoHandle;
        $scope.nextVideoHandle = undefined;

        // if there is a a current video start it, else it's the end of the sequence
        if ($scope.currentVideoHandle) {
            $scope.currentVideoHandle.in(TRANSITION_DURATION);

            // now that the new video is running ask for the next one
            $rootScope.$apply(function () {
                $rootScope.$broadcast(mt.events.NextVideoInstanceRequest);
            });
        }
    };

    $scope.requestFullscreen = function() {
        document.getElementById('mt-video-window').webkitRequestFullscreen();
    }
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