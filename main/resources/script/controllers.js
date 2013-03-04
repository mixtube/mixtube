(function (mt) {
    var staticVideosInstances = [
        {"id": "INnGGiL03Qc", "title": "La Fouine dans Touche Pas A Mon Poste clash Booba et parle de la fusillade", "thumbnailUrl": "https://i.ytimg.com/vi/INnGGiL03Qc/default.jpg", "duration": 840000, "viewCount": "188200", "provider": "youtube"},
        {"id": "AFNEBA8sLJ0", "title": "Booba - Maître Yoda", "thumbnailUrl": "https://i.ytimg.com/vi/AFNEBA8sLJ0/default.jpg", "duration": 277000, "viewCount": "3676797", "provider": "youtube"},
        {"id": "3q3vTegg9yc", "title": "Booba - T.L.T", "thumbnailUrl": "https://i.ytimg.com/vi/3q3vTegg9yc/default.jpg", "duration": 311000, "viewCount": "5000245", "provider": "youtube"},
        {"id": "Jt_mfcf0ztg", "title": "Booba - A.C. Milan", "thumbnailUrl": "https://i.ytimg.com/vi/Jt_mfcf0ztg/default.jpg", "duration": 281000, "viewCount": "10624895", "provider": "youtube"},
        {"id": "yYoejv3aLKA", "title": "Sefyu s'exprime a propos du Clash Booba La Fouine Rohff FDP TLT ...", "thumbnailUrl": "https://i.ytimg.com/vi/yYoejv3aLKA/default.jpg", "duration": 560000, "viewCount": "19860", "provider": "youtube"},
        {"id": "bunATd9KWOc", "title": "Dam16 - Booba est un grand a moi mais je ne suis pas son petit part 1", "thumbnailUrl": "https://i.ytimg.com/vi/bunATd9KWOc/default.jpg", "duration": 601000, "viewCount": "20974", "provider": "youtube"},
        {"id": "35FbLhYG86M", "title": "Booba - Tombé pour elle", "thumbnailUrl": "https://i.ytimg.com/vi/35FbLhYG86M/default.jpg", "duration": 340000, "viewCount": "9763352", "provider": "youtube"},
        {"id": "alA6RVBi3_0", "title": "Ce que pense VRAIMENT la rue du clash BOOBA , LA FOUINE , ROHFF !!!", "thumbnailUrl": "https://i.ytimg.com/vi/alA6RVBi3_0/default.jpg", "duration": 1081000, "viewCount": "115864", "provider": "youtube"},
        {"id": "4D0lpDRKWo4", "title": "Interview Booba Exclu 22/02/2013 international Qualité (HD)", "thumbnailUrl": "https://i.ytimg.com/vi/4D0lpDRKWo4/default.jpg", "duration": 334000, "viewCount": "12029", "provider": "youtube"},
        {"id": "0GG0Vw5VD0Q", "title": "TLF clash Booba violent!", "thumbnailUrl": "https://i.ytimg.com/vi/0GG0Vw5VD0Q/default.jpg", "duration": 663000, "viewCount": "44283", "provider": "youtube"}
    ];

// todo rename timeline to playlist
    mt.MixTubeApp.controller('mtTimelineCtrl', function ($scope, $rootScope, $q, mtYoutubeClient, mtLogger) {

        $scope.currentVideoInstanceIdx = 0;

        $scope.videoInstances = staticVideosInstances;

        $scope.$on(mt.events.NextVideoInstanceRequest, function () {
            mtLogger.debug('Next video instance request received');
            $scope.findNextExistingVideoInstance().then(function (videoInstance) {
                $rootScope.$broadcast(mt.events.LoadVideoRequest, {videoInstance: videoInstance, autoplay: false});
            });
        });

        /**
         * Finds the first next video in the playlist that still exist.
         *
         * Video can be removed from the remote provider so we have to check that before loading a video to prevent
         * sequence interruption.
         *
         * @return {Promise} a promise with that provides the video instance when an existing video is found
         */
        $scope.findNextExistingVideoInstance = function () {
            var deferred = $q.defer();

            $scope.currentVideoInstanceIdx++;
            if ($scope.currentVideoInstanceIdx < $scope.videoInstances.length) {
                var videoInstance = $scope.videoInstances[$scope.currentVideoInstanceIdx];

                mtYoutubeClient.pingVideoById(videoInstance.id).then(function (videoExist) {
                    if (videoExist) {
                        deferred.resolve(videoInstance);
                    } else {
                        $scope.findNextExistingVideoInstance().then(deferred.resolve);
                    }
                });
            }

            return deferred.promise;
        };

        $scope.videoInstanceClicked = function (videoInstance) {
            $scope.currentVideoInstanceIdx = $scope.videoInstances.indexOf(videoInstance);
            $rootScope.$broadcast(mt.events.LoadVideoRequest, {videoInstance: videoInstance, autoplay: true});
        };

        // used to generate a static array of videos for test purposes
        $scope.testLoad = function () {
            mtYoutubeClient.searchVideosByQuery('booba').then(function (summarizedVideos) {
                var videosIds = summarizedVideos.map(function (summarizedVideo) {
                    return summarizedVideo.id;
                });

                mtYoutubeClient.listVideosByIds(videosIds).then(function (videos) {
                    console.log(JSON.stringify(videos));
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

    mt.MixTubeApp.controller('mtSearchCtrl', function ($scope, $rootScope, $timeout, mtYoutubeClient, mtLogger) {

        /**
         * @const
         * @type {number}
         */
        var INSTANT_SEARCH_DELAY = 300;

        /** @type {string} */
        $scope.searchTerm = undefined;
        /** @type {boolean} */
        $scope.searchTermFocused = false;
        /** @type {Array.<mt.model.Video>} */
        $scope.youtubeSearchResults = staticVideosInstances;
        /** @type {boolean} */
        $scope.searchVisible = true;
        /** @type {Promise} */
        $scope.instantSearchPromise = undefined;
        /** @type {number} */
        $scope.searchRequestCount = 0;

        $scope.$on(mt.events.OpenSearchFrameRequest, function (evt, data) {
            if (!$scope.searchVisible) {
                $scope.open(data.typedChar);
            }
        });

        // when the user types we automatically execute the search
        $scope.$watch('searchTerm', function (newSearchTerm) {
            // new inputs so we stop the previous request
            $timeout.cancel($scope.instantSearchPromise);

            // if the search has to be longer than two characters
            if (newSearchTerm && newSearchTerm.length > 2) {
                $scope.searchRequestCount++;

                $timeout.cancel($scope.instantSearchPromise);
                $scope.instantSearchPromise = $timeout(function () {
                    $scope.search();
                }, INSTANT_SEARCH_DELAY);
            }
        });

        $scope.search = function () {
            // store the current request count
            var startSearchRequestCount = $scope.searchRequestCount;

            mtYoutubeClient.searchVideosByQuery($scope.searchTerm, function (videos) {
                // check if the request is outdated, it is a workaround until Angular provides a way to cancel requests
                if ($scope.searchRequestCount === startSearchRequestCount) {
                    $scope.youtubeSearchResults = videos;
                }
            });
        };

        /**
         * Opens the search frame and optionally input the first char.
         *
         * @param {string=} firstChar the first char to fill the input with
         */
        $scope.open = function (firstChar) {
            $scope.searchVisible = true;
            $scope.searchTerm = firstChar;
            $scope.searchTermFocused = true;

        };

        $scope.close = function () {
            $scope.searchVisible = false;
        };
    });
})(mt);