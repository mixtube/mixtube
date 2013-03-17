(function (mt) {


    mt.MixTubeApp.controller('mtPlaylistCtrl', function ($scope, $rootScope, $q, mtYoutubeClient, mtLogger) {

        /**  @type {mt.model.PlaylistEntry} */
        $scope.activePlaylistEntry = undefined;
        /**  @type {Array.<mt.model.PlaylistEntry>} */
        $scope.playlistEntries = mt.tools.TEST_VIDEOS.map(function (video) {
            var playlistEntry = new mt.model.PlaylistEntry();
            playlistEntry.id = mt.tools.uniqueId();
            playlistEntry.video = video;
            return playlistEntry;
        });

        /**
         * Finds the first next video in the playlist that still exist.
         *
         * Video can be removed from the remote provider so we have to check that before loading a video to prevent
         * playback interruption.
         *
         * @param {number} startPosition the position from where to start to look for the next valid video
         * @return {Promise} a promise with that provides the video instance when an existing video is found
         */
        var findNextValidPlaylistEntry = function (startPosition) {
            var deferred = $q.defer();

            var tryPosition = startPosition + 1;
            if (tryPosition < $scope.playlistEntries.length) {
                var playlistEntry = $scope.playlistEntries[tryPosition];
                mtYoutubeClient.pingVideoById(playlistEntry.video.id).then(function (videoExists) {
                    if (videoExists) {
                        deferred.resolve(playlistEntry);
                    } else {
                        findNextValidPlaylistEntry(tryPosition).then(deferred.resolve);
                    }
                });
            } else {
                deferred.reject();
            }

            return deferred.promise;
        };

        var triggerPlaylistModified = function (modifiedPositions) {
            var activePosition = $scope.playlistEntries.indexOf($scope.activePlaylistEntry);
            $rootScope.$broadcast(mt.events.PlaylistModified, {
                activePosition: activePosition,
                modifiedPositions: modifiedPositions
            });
        };


        $scope.$on(mt.events.NextPlaylistEntryRequest, function () {
            mtLogger.debug('Next playlist entry request received');

            var activePosition = $scope.playlistEntries.indexOf($scope.activePlaylistEntry);
            findNextValidPlaylistEntry(activePosition).then(function (playlistEntry) {
                $rootScope.$broadcast(mt.events.LoadPlaylistEntryRequest, {playlistEntry: playlistEntry, autoplay: false});
            });
        });

        $scope.$on(mt.events.AppendVideoToPlaylistRequest, function (evt, data) {
            var playlistEntry = new mt.model.PlaylistEntry();
            playlistEntry.id = mt.tools.uniqueId();
            playlistEntry.video = data.video;
            $scope.playlistEntries.push(playlistEntry);
            triggerPlaylistModified([$scope.playlistEntries.length - 1]);
        });

        $scope.$on(mt.events.PlaylistEntryActivated, function (evt, data) {
            $scope.activePlaylistEntry = mt.tools.findWhere($scope.playlistEntries, {id: data.playlistEntryId});
        });

        $scope.playlistEntryClicked = function (playlistEntry) {
            $scope.activePlaylistEntryIdx = $scope.playlistEntries.indexOf(playlistEntry);
            $rootScope.$broadcast(mt.events.LoadPlaylistEntryRequest, {playlistEntry: playlistEntry, autoplay: true});
        };

        $scope.removePlaylistEntryClicked = function (playlistEntry) {
            var index = $scope.playlistEntries.indexOf(playlistEntry);
            $scope.playlistEntries.splice(index, 1);
            triggerPlaylistModified([index]);
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
        /** @type {Object.<string, string>} */
        $scope.playlistEntryIdByHandleId = {};

        /**
         * Returns the playlist entry id that is associated to the given video handle id, and removes the mapping from the dictionary.
         *
         * @param {string} videoHandleId
         * @return {string}
         */
        var peekPlaylistEntryIdByHandleId = function (videoHandleId) {
            var activatedPlaylistEntryId = $scope.playlistEntryIdByHandleId[videoHandleId];
            delete $scope.playlistEntryIdByHandleId[videoHandleId];
            return activatedPlaylistEntryId;
        };

        var next = function () {
            if ($scope.currentVideoHandle) {
                $scope.currentVideoHandle.out(TRANSITION_DURATION).done(function (videoHandle) {
                    videoHandle.dispose();
                });
            }

            $scope.currentVideoHandle = $scope.nextVideoHandle;
            $scope.nextVideoHandle = undefined;

            // if there is a a current video start it, else it's the end of the sequence
            if ($scope.currentVideoHandle) {
                $scope.currentVideoHandle.in(TRANSITION_DURATION);

                // now that the new video is running ask for the next one
                $rootScope.$apply(function () {
                    $rootScope.$broadcast(mt.events.PlaylistEntryActivated, {
                        playlistEntryId: peekPlaylistEntryIdByHandleId($scope.currentVideoHandle.id)
                    });
                    $rootScope.$broadcast(mt.events.NextPlaylistEntryRequest);
                });
            }
        };

        $scope.$on(mt.events.PlayersPoolReady, function (event, players) {
            $scope.playersPool = players;
        });

        $scope.$on(mt.events.PlaylistModified, function (event, data) {
            // filter only the positions that may require a action
            var relevantPositions = data.modifiedPositions.filter(function (position) {
                return data.activePosition + 1 === position;
            });

            mtLogger.debug('Received a PlaylistModified event with relevant position %s', JSON.stringify(relevantPositions));

            if (relevantPositions.length > 0) {
                // a change in playlist require the player to query for the next video
                if ($scope.nextVideoHandle) {
                    mtLogger.debug('A handle (%s) for next video is prepared, we need to dispose it', $scope.nextVideoHandle.uid);

                    // the next video was already prepared, we have to dispose it before preparing a new one
                    peekPlaylistEntryIdByHandleId($scope.nextVideoHandle.id);
                    $scope.nextVideoHandle.dispose();
                    $scope.nextVideoHandle = undefined;
                }
                $rootScope.$broadcast(mt.events.NextPlaylistEntryRequest);
            }
        });

        $scope.$on(mt.events.LoadPlaylistEntryRequest, function (event, data) {
            var playlistEntry = data.playlistEntry;

            mtLogger.debug('Start request for video %s received with autoplay flag %s', playlistEntry.video.id, data.autoplay);

            var transitionStartTime = 'duration' in $location.search() ? parseInt($location.search().duration, 10)
                : playlistEntry.video.duration - TRANSITION_DURATION;
            mtLogger.debug('Preparing a video %s, the transition cue will start at %d', playlistEntry.video.id, transitionStartTime);

            $scope.nextVideoHandle = $scope.playersPool.prepareVideo({
                id: playlistEntry.video.id,
                provider: playlistEntry.video.provider,
                coarseDuration: playlistEntry.video.duration
            }, [
                {time: transitionStartTime, callback: function () {
                    // starts the next prepared video at 5 seconds from the end of the current one and cross fade
                    next();
                }}
            ]);

            $scope.playlistEntryIdByHandleId[$scope.nextVideoHandle.id] = playlistEntry.id;

            var nextLoadDeferred = $scope.nextVideoHandle.load();

            if (data.autoplay) {
                nextLoadDeferred.done(function () {
                    next();
                });
            }
        });

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
        $scope.youtubeSearchResults = mt.tools.TEST_VIDEOS;
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