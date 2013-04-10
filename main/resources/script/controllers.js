(function (mt) {

    mt.MixTubeApp.controller('mtRootController', function ($scope, $location, mtQueueManager) {
        $scope.queue = mtQueueManager.queue;

        $scope.$watch('queue', function (newVal, oldVal) {
            // this test is here to prevent to serialize during the init phase
            if (!angular.equals(newVal, oldVal)) {
                $location.search({queue: mtQueueManager.serialize()});
            }
        }, true);

        $scope.$on('$locationChangeSuccess', function () {
            // if the queue is available, deserialize it
            if ($location.search().hasOwnProperty('queue')) {
                mtQueueManager.deserialize($location.search().queue);
            }
        });
    });

    mt.MixTubeApp.controller('mtQueueMetaFormCtrl', function ($scope, mtQueueManager, mtKeyboardShortcutManager) {
        $scope.currentQueueName = mtQueueManager.queue.name;
        $scope.savedQueueName = undefined;
        $scope.defaultQueueName = 'Unnamed queue';
        $scope.edition = false;

        var save = function () {
            if ($scope.currentQueueName) {
                $scope.currentQueueName = $scope.currentQueueName.trim()
            }
            mtQueueManager.queue.name = $scope.currentQueueName;
            passivate();
        };

        var passivate = function () {
            $scope.edition = false;
            mtKeyboardShortcutManager.leaveContext('queueNameEdit');
        };

        var rollback = function () {
            $scope.currentQueueName = $scope.savedQueueName;
            passivate();
        };

        $scope.activate = function () {
            $scope.savedQueueName = $scope.currentQueueName = mtQueueManager.queue.name;
            $scope.edition = true;
            mtKeyboardShortcutManager.enterContext('queueNameEdit');
        };

        // can't bind save directly to blur because the blur event can be triggered after the input has been hidden
        // we need to check the edition mode before to prevent to save at the wrong time
        $scope.onInputBlur = function () {
            if ($scope.edition) {
                save();
            }
        };

        mtKeyboardShortcutManager.register('queueNameEdit', 'return', save);
        mtKeyboardShortcutManager.register('queueNameEdit', 'esc', rollback);
    });

    mt.MixTubeApp.controller('mtQueueCtrl', function ($scope, $rootScope, $q, mtQueueManager, mtYoutubeClient, mtLoggerFactory) {

        var logger = mtLoggerFactory.logger('mtQueueCtrl');

        /**  @type {mt.model.QueueEntry} */
        $scope.activeQueueEntry = undefined;

        /**
         * Finds the first next video in the queue that still exist.
         *
         * Video can be removed from the remote provider so we have to check that before loading a video to prevent
         * playback interruption.
         *
         * @param {number} startPosition the position from where to start to look for the next valid video
         * @return {Promise} a promise with that provides the video instance when an existing video is found
         */
        var findNextValidQueueEntry = function (startPosition) {
            var deferred = $q.defer();

            var tryPosition = startPosition + 1;
            if (tryPosition < $scope.queue.entries.length) {
                var queueEntry = $scope.queue.entries[tryPosition];
                mtYoutubeClient.pingVideoById(queueEntry.video.id).then(function (videoExists) {
                    if (videoExists) {
                        deferred.resolve(queueEntry);
                    } else {
                        findNextValidQueueEntry(tryPosition).then(deferred.resolve);
                    }
                });
            } else {
                deferred.reject();
            }

            return deferred.promise;
        };

        var triggerQueueModified = function (modifiedPositions) {
            var activePosition = $scope.queue.entries.indexOf($scope.activeQueueEntry);
            $rootScope.$broadcast(mt.events.QueueModified, {
                activePosition: activePosition,
                modifiedPositions: modifiedPositions
            });
        };

        $scope.$on(mt.events.NextQueueEntryRequest, function (evt, data) {
            logger.debug('Next queue entry request received');

            var activePosition = $scope.queue.entries.indexOf($scope.activeQueueEntry);
            findNextValidQueueEntry(activePosition).then(function (queueEntry) {
                $rootScope.$broadcast(mt.events.LoadQueueEntryRequest, {queueEntry: queueEntry, autoplay: data.initialization});
            });
        });

        $scope.$on(mt.events.AppendVideoToQueueRequest, function (evt, data) {
            var queueEntry = new mt.model.QueueEntry();
            queueEntry.id = mt.tools.uniqueId();
            queueEntry.video = data.video;
            $scope.queue.entries.push(queueEntry);
            triggerQueueModified([$scope.queue.entries.length - 1]);
        });

        $scope.$on(mt.events.QueueEntryActivated, function (evt, data) {
            $scope.activeQueueEntry = _.findWhere($scope.queue.entries, {id: data.queueEntryId});
        });

        $scope.queueEntryClicked = function (queueEntry) {
            $rootScope.$broadcast(mt.events.LoadQueueEntryRequest, {queueEntry: queueEntry, autoplay: true});
        };

        $scope.removeQueueEntryClicked = function (queueEntry) {
            var index = $scope.queue.entries.indexOf(queueEntry);
            $scope.queue.entries.splice(index, 1);
            triggerQueueModified([index]);
        };

        $scope.newQueueButtonClicked = function () {
            $scope.queue.entries = [];
            $scope.activeQueueEntry = undefined;
            $rootScope.$broadcast(mt.events.QueueCleared);
        };
    });

    mt.MixTubeApp.controller('mtVideoPlayerControlsCtrl', function ($scope, $rootScope, mtKeyboardShortcutManager) {

        /**  @type {boolean} */
        $scope.playing = false;

        var broadcastToggleRequest = function () {
            $rootScope.$broadcast(mt.events.PlaybackToggleRequest);
        };

        // register the global space shortcut and directly enter the shortcuts context
        mtKeyboardShortcutManager.register('global', 'space', function () {
            broadcastToggleRequest();
        });
        mtKeyboardShortcutManager.enterContext('global');

        $scope.$on(mt.events.PlaybackStateChanged, function (evt, data) {
            $scope.playing = data.playing;
        });

        $scope.pauseButtonClicked = function () {
            broadcastToggleRequest();
        }
    });

    mt.MixTubeApp.controller('mtVideoPlayerStageCtrl', function ($scope, $rootScope, $location, mtLoggerFactory, mtConfiguration) {

        var logger = mtLoggerFactory.logger('mtVideoPlayerStageCtrl');

        /** @type {mt.player.PlayersPool} */
        $scope.playersPool = undefined;
        /** @type {mt.player.VideoHandle} */
        $scope.currentVideoHandle = undefined;
        /**  @type {boolean} */
        $scope.playing = false;
        /** @type {Object.<string, string>} */
        $scope.queueEntryIdByHandleId = {};

        /**
         * Returns the queue entry id that is associated to the given video handle id, and removes the mapping from the dictionary.
         *
         * @param {string} videoHandleId
         * @return {string}
         */
        var peekQueueEntryIdByHandleId = function (videoHandleId) {
            var activatedQueueEntryId = $scope.queueEntryIdByHandleId[videoHandleId];
            delete $scope.queueEntryIdByHandleId[videoHandleId];
            return activatedQueueEntryId;
        };

        /**
         * Executes the video transition steps :
         * - starts the prepared video
         * - references the prepared video as the new current one
         * - cross fades the videos (out the current one / in the prepared one)
         * - disposes the previous (the old current) video
         * - broadcasts events to notify if the new state
         * - sends a request to get the next video references
         */
        var executeTransition = function () {
            if ($scope.currentVideoHandle) {
                $scope.currentVideoHandle.out(mtConfiguration.transitionDuration).done(function (videoHandle) {
                    videoHandle.dispose();
                });
            }

            $scope.currentVideoHandle = $scope.nextVideoHandle;
            $scope.nextVideoHandle = undefined;

            // if there is a a current video start it, else it's the end of the sequence
            if ($scope.currentVideoHandle) {
                $scope.playing = true;
                $scope.currentVideoHandle.in(mtConfiguration.transitionDuration);

                // now that the new video is running ask for the next one
                $rootScope.$apply(function () {
                    $rootScope.$broadcast(mt.events.QueueEntryActivated, {
                        queueEntryId: peekQueueEntryIdByHandleId($scope.currentVideoHandle.id)
                    });
                    $rootScope.$broadcast(mt.events.NextQueueEntryRequest, {initialization: false});
                });
            } else {
                // end of the road
                $scope.playing = false;
            }
        };

        /**
         * Properly clears the next video handle by disposing it and clearing all the references to it.
         */
        var clearNextVideoHandle = function () {
            logger.debug('A handle (%s) for next video has been prepared, we need to dispose it', $scope.nextVideoHandle.uid);

            // the next video has already been prepared, we have to dispose it before preparing a new one
            peekQueueEntryIdByHandleId($scope.nextVideoHandle.id);
            $scope.nextVideoHandle.dispose();
            $scope.nextVideoHandle = undefined;
        };

        $scope.$watch('playing', function () {
            $rootScope.$broadcast(mt.events.PlaybackStateChanged, {playing: $scope.playing});
        });

        $scope.$on(mt.events.PlayersPoolReady, function (event, players) {
            $scope.playersPool = players;
        });

        $scope.$on(mt.events.QueueModified, function (event, data) {
            // filter only the positions that may require an action
            var relevantPositions = data.modifiedPositions.filter(function (position) {
                return data.activePosition + 1 === position;
            });

            logger.debug('Received a QueueModified event with relevant position %s', JSON.stringify(relevantPositions));

            if (relevantPositions.length > 0) {
                // a change in queue require the player to query for the next video
                if ($scope.nextVideoHandle) {
                    clearNextVideoHandle();
                }
                $rootScope.$broadcast(mt.events.NextQueueEntryRequest, {initialization: false});
            }
        });

        $scope.$on(mt.events.QueueCleared, function () {
            if ($scope.nextVideoHandle) {
                clearNextVideoHandle();
            }
            if ($scope.currentVideoHandle) {
                $scope.playing = false;
                $scope.currentVideoHandle.dispose();
                $scope.currentVideoHandle = undefined;
            }
        });

        $scope.$on(mt.events.LoadQueueEntryRequest, function (event, data) {
            var queueEntry = data.queueEntry;

            logger.debug('Start request for video %s received with autoplay flag %s', queueEntry.video.id, data.autoplay);

            var transitionStartTime = mtConfiguration.transitionStartTime > 0 ? mtConfiguration.transitionStartTime
                : queueEntry.video.duration + mtConfiguration.transitionStartTime;
            logger.debug('Preparing a video %s, the transition cue will start at %d', queueEntry.video.id, transitionStartTime);

            $scope.nextVideoHandle = $scope.playersPool.prepareVideo({
                id: queueEntry.video.id,
                provider: queueEntry.video.provider,
                coarseDuration: queueEntry.video.duration
            }, [
                {time: transitionStartTime, callback: function () {
                    // starts the next prepared video and cross fade
                    executeTransition();
                }}
            ]);

            $scope.queueEntryIdByHandleId[$scope.nextVideoHandle.id] = queueEntry.id;

            var nextLoadDeferred = $scope.nextVideoHandle.load();

            if (data.autoplay) {
                nextLoadDeferred.done(function () {
                    executeTransition();
                });
            }
        });

        $scope.$on(mt.events.PlaybackToggleRequest, function () {
            if ($scope.currentVideoHandle) {
                if ($scope.playing) {
                    $scope.playing = false;
                    $scope.currentVideoHandle.pause();
                } else {
                    $scope.playing = true;
                    $scope.currentVideoHandle.unpause();
                }
            } else {
                $rootScope.$broadcast(mt.events.NextQueueEntryRequest, {initialization: true});
            }
        });

        $scope.requestFullscreen = function () {
            document.getElementById('mt-video-window').webkitRequestFullscreen();
        }
    });

    mt.MixTubeApp.controller('mtSearchCtrl', function ($scope, $rootScope, $timeout, mtYoutubeClient, mtConfiguration, mtKeyboardShortcutManager) {

        /**
         * @const
         * @type {number}
         */
        var INSTANT_SEARCH_DELAY = 300;

        /** @type {string} */
        $scope.searchTerm = undefined;
        /** @type {boolean} */
        $scope.searchTermFocused = false;
        /** @type {Array.<mt.model.VideoSearchResult>} */
        $scope.youtubeSearchResults = mtConfiguration.initialSearchResults;
        /** @type {boolean} */
        $scope.searchVisible = mtConfiguration.initialSearchOpen;
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
         * @param {mt.model.VideoSearchResult} video
         */
        $scope.appendResultToQueue = function (video) {
            $rootScope.$broadcast(mt.events.AppendVideoToQueueRequest, {video: video});
        };

        /**
         * Opens the search frame and optionally input the first char.
         *
         * @param {string=} firstChar the first char to fill the input with
         */
        $scope.open = function (firstChar) {
            mtKeyboardShortcutManager.enterContext('search');
            $scope.searchVisible = true;
            $scope.searchTerm = firstChar;
            $scope.searchTermFocused = true;

        };

        $scope.close = function () {
            mtKeyboardShortcutManager.leaveContext('search');
            $scope.searchVisible = false;
        };

        mtKeyboardShortcutManager.register('search', 'esc', $scope.close);
    });
})(mt);