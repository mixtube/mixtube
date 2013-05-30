(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp.controller('mtRootController', function ($scope, $location, $timeout, mtQueueManager, mtUserInteractionManager) {

        /**
         * Stores the serialized version of the queue. Useful to check the new url state against the internal state to prevent
         * infinite loops when changing the url internally.
         *
         * @type {string}
         */
        var serializedQueue;

        /** type {mt.model.Queue} */
        $scope.queue = mtQueueManager.queue;

        $scope.$watch('queue', function (newVal, oldVal) {
            // this test is here to prevent to serialize during the init phase
            if (!angular.equals(newVal, oldVal)) {
                var newSerializedQueue = mtQueueManager.serialize();
                if (!angular.equals(serializedQueue, newSerializedQueue)) {
                    serializedQueue = newSerializedQueue;
                    $location.search({queue: serializedQueue});
                }
            }
        }, true);

        $scope.$watch(function () {
            return $location.search().queue
        }, function (newSerializedQueue) {
            if (!angular.equals(serializedQueue, newSerializedQueue)) {
                serializedQueue = newSerializedQueue;
                // change initiated by user (back / forward etc.), need to be deserialized
                mtQueueManager.deserialize(serializedQueue);
            }
        }, true);

        $scope.mouseStarted = function () {
            mtUserInteractionManager.mouseStarted();
        };

        $scope.mouseStopped = function () {
            mtUserInteractionManager.mouseStopped();
        };
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

    mt.MixTubeApp.controller('mtQueueFrameCtrl', function ($scope, $rootScope, $q, mtQueueManager, mtYoutubeClient, mtUserInteractionManager, mtLoggerFactory) {

        var logger = mtLoggerFactory.logger('mtQueueFrameCtrl');

        /** @type {number}*/
        $scope.activePosition = 0;

        $scope.$on(mt.events.NextQueueEntryRequest, function (evt, data) {
            logger.debug('Next queue entry request received');

            mtQueueManager.nextValidQueueEntry($scope.activePosition).then(function (queueEntry) {
                $rootScope.$broadcast(mt.events.LoadQueueEntryRequest, {queueEntry: queueEntry, autoplay: data.initialization});
            });
        });

        $scope.$on(mt.events.QueueEntryActivated, function (evt, data) {
            var activeQueueEntry = _.first(_.where($scope.queue.entries, {id: data.queueEntryId}));
            $scope.activePosition = $scope.queue.entries.indexOf(activeQueueEntry);
        });

        $scope.queueEntryClicked = function (queueEntry) {
            $rootScope.$broadcast(mt.events.LoadQueueEntryRequest, {queueEntry: queueEntry, autoplay: true});
        };

        $scope.removeQueueEntryClicked = function (queueEntry) {
            mtQueueManager.removeEntry(queueEntry);
        };

        $scope.clearQueueButtonClicked = function () {
            mtQueueManager.clear();
            $scope.activeQueueEntry = undefined;
        };

        $scope.openSearchButtonClicked = function () {
            $rootScope.$broadcast(mt.events.OpenSearchFrameRequest);
        };

        $scope.mouseEntered = function () {
            mtUserInteractionManager.enteredQueueFrame();
        };

        $scope.mouseLeaved = function () {
            mtUserInteractionManager.leavedQueueFrame();
        };

        $scope.isUserInteracting = function () {
            return mtUserInteractionManager.userInteracting;
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

    mt.MixTubeApp.controller('mtComingNextCtrl', function ($scope, $timeout, mtConfiguration) {

        /** @type {boolean} */
        $scope.comingNextVisible = false;
        /** @type {string} */
        $scope.titleCurrent = undefined;
        /** @type {string} */
        $scope.titleNext = undefined;

        var hideTimeoutPromise;

        $scope.$on(mt.events.UpdateComingNextRequest, function (evt, data) {
            $timeout.cancel(hideTimeoutPromise);
            $scope.comingNextVisible = true;
            $scope.titleCurrent = data.currentVideo.title;
            // if no next video, clear the next title
            $scope.titleNext = data.nextVideo ? data.nextVideo.title : undefined;

            hideTimeoutPromise = $timeout(function () {
                $scope.comingNextVisible = false;
            }, mtConfiguration.comingNextDuration);
        });
    });

    mt.MixTubeApp.controller('mtVideoPlayerWindowCtrl', function ($rootScope, mtPlayerPoolProvider, mtLoggerFactory, mtConfiguration) {

        var logger = mtLoggerFactory.logger('mtVideoPlayerWindowCtrl');

        var thisCtrl = {};

        /** @type {mt.player.PlayersPool} */
        thisCtrl.playersPool = undefined;
        /** @type {mt.player.VideoHandle} */
        thisCtrl.currentVideoHandle = undefined;
        /** @type {mt.player.Video} */
        thisCtrl.currentVideo = undefined;
        /** @type {mt.player.VideoHandle} */
        thisCtrl.nextVideoHandle = undefined;
        /** @type {mt.player.Video} */
        thisCtrl.nextVideo = undefined;
        /**  @type {boolean} */
        thisCtrl.playing = false;
        /** @type {Object.<string, string>} */
        thisCtrl.queueEntryIdByHandleId = {};

        mtPlayerPoolProvider.get().then(function (playersPool) {
            thisCtrl.playersPool = playersPool;
        });

        /**
         * Returns the queue entry id that is associated to the given video handle id, and removes the mapping from the dictionary.
         *
         * @param {string} videoHandleId
         * @return {string}
         */
        var peekQueueEntryIdByHandleId = function (videoHandleId) {
            var activatedQueueEntryId = thisCtrl.queueEntryIdByHandleId[videoHandleId];
            delete thisCtrl.queueEntryIdByHandleId[videoHandleId];
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
            if (thisCtrl.currentVideoHandle) {
                thisCtrl.currentVideoHandle.out(mtConfiguration.transitionDuration).done(function (videoHandle) {
                    videoHandle.dispose();
                });
            }

            thisCtrl.currentVideoHandle = thisCtrl.nextVideoHandle;
            thisCtrl.currentVideo = thisCtrl.nextVideo;
            thisCtrl.nextVideoHandle = undefined;
            thisCtrl.nextVideo = undefined;

            // if there is a a current video start it, else it's the end of the sequence
            if (thisCtrl.currentVideoHandle) {
                thisCtrl.playing = true;
                notifyPlayingChanged();
                thisCtrl.currentVideoHandle.in(mtConfiguration.transitionDuration);

                // now that the new video is running ask for the next one
                $rootScope.$apply(function () {
                    $rootScope.$broadcast(mt.events.QueueEntryActivated, {
                        queueEntryId: peekQueueEntryIdByHandleId(thisCtrl.currentVideoHandle.id)
                    });
                    $rootScope.$broadcast(mt.events.NextQueueEntryRequest, {initialization: false});
                });
            } else {
                // end of the road
                thisCtrl.playing = false;
                notifyPlayingChanged();
            }
        };

        var triggerComingNext = function () {
            $rootScope.$apply(function () {
                $rootScope.$broadcast(mt.events.UpdateComingNextRequest, {
                    currentVideo: thisCtrl.currentVideo,
                    nextVideo: thisCtrl.nextVideo
                });
            });
        };

        /**
         * Properly clears the next video handle by disposing it and clearing all the references to it.
         */
        var clearNextVideoHandle = function () {
            logger.debug('A handle (%s) for next video has been prepared, we need to dispose it', thisCtrl.nextVideoHandle.uid);

            // the next video has already been prepared, we have to dispose it before preparing a new one
            peekQueueEntryIdByHandleId(thisCtrl.nextVideoHandle.id);
            thisCtrl.nextVideoHandle.dispose();
            thisCtrl.nextVideoHandle = undefined;
            thisCtrl.nextVideo = undefined;
        };

        var playbackToggle = function () {
            if (thisCtrl.currentVideoHandle) {
                if (thisCtrl.playing) {
                    thisCtrl.playing = false;
                    notifyPlayingChanged();
                    thisCtrl.currentVideoHandle.pause();
                } else {
                    thisCtrl.playing = true;
                    notifyPlayingChanged();
                    thisCtrl.currentVideoHandle.unpause();
                }
            } else {
                $rootScope.$broadcast(mt.events.NextQueueEntryRequest, {initialization: true});
            }
        };

        var relativeTimeToAbsolute = function (relTime, duration) {
            return relTime > 0 ? relTime : duration + relTime;
        };

        var loadQueueEntry = function (queueEntry, autoplay) {
            logger.debug('Start request for video %s received with autoplay flag %s', queueEntry.video.id, autoplay);

            var transitionStartTime = relativeTimeToAbsolute(mtConfiguration.transitionStartTime, queueEntry.video.duration);
            var comingNextStartTime = relativeTimeToAbsolute(mtConfiguration.comingNextStartTime, queueEntry.video.duration);
            logger.debug('Preparing a video %s, the coming next cue will start at %d, the transition cue will start at %d', queueEntry.video.id, comingNextStartTime, transitionStartTime);

            thisCtrl.nextVideoHandle = thisCtrl.playersPool.prepareVideo({
                id: queueEntry.video.id,
                provider: queueEntry.video.provider,
                coarseDuration: queueEntry.video.duration
            }, [
                {time: comingNextStartTime, callback: function () {
                    triggerComingNext();
                }},
                {time: transitionStartTime, callback: function () {
                    // starts the next prepared video and cross fade
                    executeTransition();
                }}
            ]);
            thisCtrl.nextVideo = queueEntry.video;

            thisCtrl.queueEntryIdByHandleId[thisCtrl.nextVideoHandle.id] = queueEntry.id;

            var nextLoadDeferred = thisCtrl.nextVideoHandle.load();

            if (autoplay) {
                nextLoadDeferred.done(function () {
                    executeTransition();
                });
            }
        };

        var clear = function () {
            if (thisCtrl.nextVideoHandle) {
                clearNextVideoHandle();
            }
            if (thisCtrl.currentVideoHandle) {
                thisCtrl.playing = false;
                notifyPlayingChanged();
                thisCtrl.currentVideoHandle.dispose();
                thisCtrl.currentVideoHandle = undefined;
                thisCtrl.currentVideo = undefined;
            }
        };

        var update = function (modifiedPositions, activePosition) {
            // filter only the positions that may require an action
            var relevantPositions = modifiedPositions.filter(function (position) {
                return activePosition + 1 === position;
            });

            logger.debug('Received a QueueModified event with relevant position %s', JSON.stringify(relevantPositions));

            if (relevantPositions.length > 0) {
                // a change in queue require the player to query for the next video
                if (thisCtrl.nextVideoHandle) {
                    clearNextVideoHandle();
                }
                $rootScope.$broadcast(mt.events.NextQueueEntryRequest, {initialization: false});
            }
        };

        var notifyPlayingChanged = function () {
            $rootScope.$broadcast(mt.events.PlaybackStateChanged, {playing: thisCtrl.playing});
        };

        $rootScope.$on(mt.events.QueueModified, function (event, data) {
            // todo orphan listener, won't receive any event since it was removed
            update(data.modifiedPositions, data.activePosition);
        });

        $rootScope.$on(mt.events.LoadQueueEntryRequest, function (event, data) {
            loadQueueEntry(data.queueEntry, data.autoplay);
        });

        $rootScope.$on(mt.events.PlaybackToggleRequest, function () {
            playbackToggle();
        });

        $rootScope.$on(mt.events.QueueCleared, function () {
            // todo orphan listener, won't receive any event since it was removed
            clear();
        });
    });

    mt.MixTubeApp.controller('mtSearchCtrl', function ($scope, $rootScope, $timeout, mtYoutubeClient, mtConfiguration, mtKeyboardShortcutManager, mtUserInteractionManager, mtQueueManager) {

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

        /**
         * Opens the search frame and optionally input the first char.
         *
         * @param {string=} firstChar the first char to fill the input with
         */
        var open = function (firstChar) {
            mtKeyboardShortcutManager.enterContext('search');
            $scope.searchVisible = true;
            $scope.searchTerm = firstChar;
            $scope.searchTermFocused = true;

        };

        $scope.$on(mt.events.OpenSearchFrameRequest, function (evt, data) {
            if (!$scope.searchVisible) {
                open(data ? data.typedChar : '');
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

        $scope.$watch('searchVisible', function (newSearchVisible) {
            if (newSearchVisible) {
                mtUserInteractionManager.searchOpened();
            } else {
                mtUserInteractionManager.searchClosed();
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
        $scope.appendResultToQueue = function (video) {
            mtQueueManager.appendVideo(video);
        };

        $scope.close = function () {
            mtKeyboardShortcutManager.leaveContext('search');
            $scope.searchVisible = false;
        };

        mtKeyboardShortcutManager.register('search', 'esc', $scope.close);
    });
})(mt);