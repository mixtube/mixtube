(function (mt) {
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

        /**
         * @const
         * @type {number}
         */
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

        $scope.requestFullscreen = function () {
            document.getElementById('mt-video-window').webkitRequestFullscreen();
        }
    });
})(mt);