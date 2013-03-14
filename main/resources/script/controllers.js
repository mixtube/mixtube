(function (mt) {
    var staticVideosInstances = [
        {"id": "nSrPHC2yoQE", "title": "ROHFF INTERVIEW EXCLUSIVE - 1ER COUPLET DU CLASH SUR BOOBA ET DATE DE SORTIE DU PDRG", "thumbnailUrl": "https://i.ytimg.com/vi/nSrPHC2yoQE/mqdefault.jpg", "duration": 817000, "viewCount": "14215", "provider": "youtube", "publisherName": "Reskype Contenders / Rapandclash"},
        {"id": "XoygscHpDgw", "title": "Booba : tout sur le clash avec Rohff et La Fouine [2013]", "thumbnailUrl": "https://i.ytimg.com/vi/XoygscHpDgw/mqdefault.jpg", "duration": 408000, "viewCount": "485427", "provider": "youtube", "publisherName": "MusiqueMag"},
        {"id": "mzNczfOxDGo", "title": "Booba VS La Fouine et Dixon (Banlieue Sale)", "thumbnailUrl": "https://i.ytimg.com/vi/mzNczfOxDGo/mqdefault.jpg", "duration": 141000, "viewCount": "1987857", "provider": "youtube", "publisherName": "Booba"},
        {"id": "ElxmUn4QZP0", "title": "De Boulbi à Miami, documentaire sur Booba ( Officiel, qualité HD )", "thumbnailUrl": "https://i.ytimg.com/vi/ElxmUn4QZP0/mqdefault.jpg", "duration": 3182000, "viewCount": "161994", "provider": "youtube", "publisherName": "Chaîne de D3moniac38"},
        {"id": "6lQaTSZa_Vc", "title": "Booba vs. La Fouine à Miami [Analyse de la vidéo]", "thumbnailUrl": "https://i.ytimg.com/vi/6lQaTSZa_Vc/mqdefault.jpg", "duration": 237000, "viewCount": "138098", "provider": "youtube", "publisherName": "Jamil Hassan"},
        {"id": "Ww9UGWypR6k", "title": "Booba frappe La Fouine et Dixon à Miami (ralentis et explications)", "thumbnailUrl": "https://i.ytimg.com/vi/Ww9UGWypR6k/mqdefault.jpg", "duration": 241000, "viewCount": "18542", "provider": "youtube", "publisherName": "Sevenair Sentinel"},
        {"id": "2x3A6pBrOgA", "title": "La Fouine dans T.P.A.M.P parle de la bagarre BOOBA vs LA FOUINE et DIXON (banlieue sale)", "thumbnailUrl": "https://i.ytimg.com/vi/2x3A6pBrOgA/mqdefault.jpg", "duration": 840000, "viewCount": "170917", "provider": "youtube", "publisherName": "clourdiciabonnetoi"},
        {"id": "tsk1zuf5g9o", "title": "Les deux versions de Booba Vs. La Fouine & Dixon", "thumbnailUrl": "https://i.ytimg.com/vi/tsk1zuf5g9o/mqdefault.jpg", "duration": 298000, "viewCount": "41176", "provider": "youtube", "publisherName": "AtlasOffishial │ Entertainement channel !"},
        {"id": "AFNEBA8sLJ0", "title": "Booba - Maître Yoda", "thumbnailUrl": "https://i.ytimg.com/vi/AFNEBA8sLJ0/mqdefault.jpg", "duration": 277000, "viewCount": "4314914", "provider": "youtube", "publisherName": "Booba"},
        {"id": "FLFL_qt9gRg", "title": "LIM SOUTIEN BOOBA", "thumbnailUrl": "https://i.ytimg.com/vi/FLFL_qt9gRg/mqdefault.jpg", "duration": 711000, "viewCount": "8555", "provider": "youtube", "publisherName": "BOOBAOFFICIALMUSIC"},
        {"id": "TRjffvEsVA8", "title": "La fouine vs Booba - Vrai histoire [ Vidéo Entière ]", "thumbnailUrl": "https://i.ytimg.com/vi/TRjffvEsVA8/mqdefault.jpg", "duration": 178000, "viewCount": "12192", "provider": "youtube", "publisherName": "Vericsnake : Abonnez vous à la chaine"},
        {"id": "Jt_mfcf0ztg", "title": "Booba - A.C. Milan", "thumbnailUrl": "https://i.ytimg.com/vi/Jt_mfcf0ztg/mqdefault.jpg", "duration": 281000, "viewCount": "11814756", "provider": "youtube", "publisherName": "Booba"},
        {"id": "LMrEEj9_Zaw", "title": "cortex reagit a la baguarre booba vs la fouine !!!", "thumbnailUrl": "https://i.ytimg.com/vi/LMrEEj9_Zaw/mqdefault.jpg", "duration": 106000, "viewCount": "77958", "provider": "youtube", "publisherName": "Chaîne de cortex91officiel"},
        {"id": "3q3vTegg9yc", "title": "Booba - T.L.T", "thumbnailUrl": "https://i.ytimg.com/vi/3q3vTegg9yc/mqdefault.jpg", "duration": 311000, "viewCount": "5505947", "provider": "youtube", "publisherName": "Booba"},
        {"id": "XVuDoruuH5g", "title": "Booba VS La Fouine et Dixon par KAS'PROD", "thumbnailUrl": "https://i.ytimg.com/vi/XVuDoruuH5g/mqdefault.jpg", "duration": 140000, "viewCount": "65236", "provider": "youtube", "publisherName": "KASPROD"},
        {"id": "35FbLhYG86M", "title": "Booba - Tombé pour elle", "thumbnailUrl": "https://i.ytimg.com/vi/35FbLhYG86M/mqdefault.jpg", "duration": 340000, "viewCount": "10199843", "provider": "youtube", "publisherName": "Booba"},
        {"id": "bunATd9KWOc", "title": "Dam16 - Booba est un grand a moi mais je ne suis pas son petit part 1", "thumbnailUrl": "https://i.ytimg.com/vi/bunATd9KWOc/mqdefault.jpg", "duration": 601000, "viewCount": "48027", "provider": "youtube", "publisherName": "N-DA-HOOD.COM"},
        {"id": "alA6RVBi3_0", "title": "Ce que pense VRAIMENT la rue du clash BOOBA , LA FOUINE , ROHFF !!!", "thumbnailUrl": "https://i.ytimg.com/vi/alA6RVBi3_0/mqdefault.jpg", "duration": 1081000, "viewCount": "147849", "provider": "youtube", "publisherName": "VANTARD - CHAINE OFFICIELLE ;)"},
        {"id": "oBbHo8b4FDc", "title": "Booba feat Kaaris - Kalash", "thumbnailUrl": "https://i.ytimg.com/vi/oBbHo8b4FDc/mqdefault.jpg", "duration": 270000, "viewCount": "4113900", "provider": "youtube", "publisherName": "Booba"},
        {"id": "9YwN5ywiF20", "title": "Rohff : 1er Couplet Reponse Du Clash De Booba", "thumbnailUrl": "https://i.ytimg.com/vi/9YwN5ywiF20/mqdefault.jpg", "duration": 78000, "viewCount": "2928", "provider": "youtube", "publisherName": "Swagg TV"}
    ];

// todo rename timeline to playlist
    mt.MixTubeApp.controller('mtTimelineCtrl', function ($scope, $rootScope, $q, mtYoutubeClient, mtLogger) {

        /**  @type {number} */
        $scope.currentVideoInstanceIdx = 0;
        /**  @type {Array} */
        $scope.videoInstances = angular.copy(staticVideosInstances);

        $scope.$on(mt.events.NextVideoInstanceRequest, function () {
            mtLogger.debug('Next video instance request received');

            $scope.findNextExistingVideoInstance().then(function (videoInstance) {
                $rootScope.$broadcast(mt.events.LoadVideoRequest, {videoInstance: videoInstance, autoplay: false});
            });
        });

        $scope.$on(mt.events.AppendVideoToPlaylistRequest, function (evt, data) {
            $scope.videoInstances.push(data.video);
            $scope.triggerPlaylistModified();
        });

        $scope.$on(mt.events.VideoStarted, function (evt, data) {
            $scope.currentVideoInstanceIdx = $scope.videoInstances.indexOf(data.videoInstance);
        });

        $scope.triggerPlaylistModified = function () {
            $rootScope.$broadcast(mt.events.PlaylistModified, {
                currentPosition: $scope.currentVideoInstanceIdx,
                modifiedPositions: [$scope.currentVideoInstanceIdx + 1]
            });
        };

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

            if ($scope.currentVideoInstanceIdx < $scope.videoInstances.length) {
                var videoInstance = $scope.videoInstances[$scope.currentVideoInstanceIdx + 1];

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

        $scope.removeVideoInstanceClicked = function (videoInstance) {
            var index = $scope.videoInstances.indexOf(videoInstance);
            $scope.videoInstances.splice(index, 1);

            $scope.triggerPlaylistModified();
        };

        $scope.isCurrent = function (videoInstance) {
            return videoInstance === $scope.videoInstances[$scope.currentVideoInstanceIdx];
        };
    });

    mt.MixTubeApp.controller('mtVideoPlayerStageCtrl', function ($scope, $rootScope, $location, mtLogger) {

        /**
         * @type {number}
         * @const
         */
        var TRANSITION_DURATION = 1000;

        /** @type {mt.player.PlayersPool} */
        $scope.playersPool = undefined;
        /** @type {mt.player.VideoHandle} */
        $scope.currentVideoHandle = undefined;

        $scope.$on(mt.events.PlayersPoolReady, function (event, players) {
            $scope.playersPool = players;
        });

        $scope.$on(mt.events.PlaylistModified, function (event, data) {
            // filter only the positions that may require a action
            var relevantPositions = data.modifiedPositions.filter(function (position) {
                return data.currentPosition + 1 === position;
            });

            mtLogger.debug('Received a PlaylistModified event with relevant position %s', JSON.stringify(relevantPositions));

            if (relevantPositions.length > 0) {
                // a change in playlist require the player to query for the next video
                if ($scope.nextVideoHandle) {
                    mtLogger.debug('A handle (%s) for next video is prepared, we need to dispose it', $scope.nextVideoHandle.uid);

                    // the next video was already prepared, we have to dispose it before preparing a new one
                    $scope.nextVideoHandle.dispose();
                }
                $rootScope.$broadcast(mt.events.NextVideoInstanceRequest);
            }
        });

        $scope.$on(mt.events.LoadVideoRequest, function (event, data) {
            mtLogger.debug('Start request for video %s received with autoplay flag %s', data.videoInstance.id, data.autoplay);

            var transitionStartTime = 'duration' in $location.search() ? parseInt($location.search().duration, 10) : data.videoInstance.duration - TRANSITION_DURATION;
            mtLogger.debug('Preparing a video %s, the transition cue will start at %d', data.videoInstance.id, transitionStartTime);

            $scope.nextVideoHandle = $scope.playersPool.prepareVideo(data.videoInstance, {
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
                    $rootScope.$broadcast(mt.events.VideoStarted, {videoInstance: $scope.currentVideoHandle.key});
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
         * @param {mt.model.Video} video
         */
        $scope.appendResultToPlaylist = function (video) {
            $rootScope.$broadcast(mt.events.AppendVideoToPlaylistRequest, {video: video});
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