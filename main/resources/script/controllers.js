(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp.controller('mtRootController', function ($scope, $location, $timeout, mtQueueManager, mtUserInteractionManager, mtAlert) {

        /**
         * Stores the serialized version of the queue. Useful to check the new url state against the internal state to prevent
         * infinite loops when changing the url internally.
         *
         * @type {string}
         */
        var serializedQueue;

        /** type {mt.model.Queue} */
        $scope.queue = mtQueueManager.queue;
        /** type {boolean} */
        $scope.loadingQueue = false;

        $scope.$watch('queue', function (newVal, oldVal) {
            // this test is here to prevent to serialize during the init phase
            if (!angular.equals(newVal, oldVal)) {
                var newSerializedQueue = mtQueueManager.serialize();
                if (!angular.equals(serializedQueue, newSerializedQueue)) {
                    serializedQueue = newSerializedQueue;
                    // replace queue parameter but keep the rest
                    $location.search(angular.extend({}, $location.search(), {queue: serializedQueue}));
                }
            }
        }, true);

        $scope.$watch(function () {
            return $location.search().queue
        }, function (newSerializedQueue) {
            if (!angular.equals(serializedQueue, newSerializedQueue)) {
                serializedQueue = newSerializedQueue;
                // change initiated by user (back / forward etc.), need to be deserialized
                $scope.loadingQueue = true;
                mtQueueManager.deserialize(serializedQueue).always(function () {
                    $scope.loadingQueue = false;
                }).then(null, function (message) {
                        mtAlert.error(message);
                    });
            }
        }, true);

        $scope.mouseStarted = function () {
            mtUserInteractionManager.mouseStarted();
        };

        $scope.mouseStopped = function () {
            mtUserInteractionManager.mouseStopped();
        };
    });

    mt.MixTubeApp.controller('mtQueueFrameCtrl', function ($scope, $rootScope, $q, mtQueueManager, mtConductor, mtYoutubeClient, mtUserInteractionManager, mtModal) {

        $scope.removeQueueEntryClicked = function (queueEntry) {
            mtQueueManager.removeEntry(queueEntry);
        };

        $scope.clearQueueButtonClicked = function () {
            mtModal.confirm('Are you sure you want to clear the queue ?').then(function () {
                mtQueueManager.clear();
            });
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

        $scope.getPlaybackQueueEntry = function () {
            return mtConductor.playbackEntry;
        }
    });

    mt.MixTubeApp.controller('mtQueueItemCtrl', function ($scope, $q, mtConductor) {

        /**  @type {boolean} */
        $scope.playPending = false;

        $scope.queueEntryClicked = function (queueEntry) {
            $scope.playPending = true;
            var playPromise = mtConductor.forceQueueEntryPlay(queueEntry);
            playPromise.always(function () {
                $scope.playPending = false;
            });
        };
    });

    mt.MixTubeApp.controller('mtVideoPlayerControlsCtrl', function ($scope, $rootScope, mtKeyboardShortcutManager, mtConductor) {

        mtKeyboardShortcutManager.register('global', /\w/, function (evt) {
            $rootScope.$broadcast(mt.events.OpenSearchFrameRequest, {typedChar: String.fromCharCode(evt.which)});
        });

        // register the global space shortcut and directly enter the shortcuts context
        mtKeyboardShortcutManager.register('global', 'space', function (evt) {
            evt.preventDefault();
            mtConductor.playbackToggle();
        });

        mtKeyboardShortcutManager.enterContext('global');

        $scope.pauseButtonClicked = function () {
            mtConductor.playbackToggle();
        };

        $scope.isPlaying = function () {
            return mtConductor.playing;
        };
    });

    mt.MixTubeApp.controller('mtComingNextCtrl', function ($scope, $timeout, mtConductor, mtConfiguration) {

        /** @type {boolean} */
        $scope.comingNextVisible = false;
        /** @type {string} */
        $scope.titleCurrent = null;
        /** @type {string} */
        $scope.titleNext = null;

        var hideTimeoutPromise;

        $scope.$on(mt.events.UpdateComingNextRequest, function (evt, data) {
            $timeout.cancel(hideTimeoutPromise);
            $scope.comingNextVisible = true;
            $scope.titleCurrent = data.currentVideo.title;
            // if no next video, clear the next title
            $scope.titleNext = data.nextVideo ? data.nextVideo.title : null;

            hideTimeoutPromise = $timeout(function () {
                $scope.comingNextVisible = false;
            }, mtConfiguration.comingNextDuration);
        });
    });

    mt.MixTubeApp.controller('mtSearchCtrl', function ($scope, $rootScope, $timeout, mtYoutubeClient, mtConfiguration, mtKeyboardShortcutManager, mtUserInteractionManager, mtQueueManager) {

        /**
         * @const
         * @type {number}
         */
        var INSTANT_SEARCH_DELAY = 500;

        /** @type {string} */
        $scope.searchTerm = null;
        /** @type {Array.<mt.model.Video>} */
        $scope.youtubeSearchResults = null;
        /** @type {boolean} */
        $scope.searchVisible = mtConfiguration.initialSearchOpen;
        /** @type {promise} */
        $scope.instantSearchPromise = null;
        /** @type {number} */
        $scope.searchRequestCount = 0;
        /** @type {Object.<string, boolean>} */
        $scope.searchPending = {youtube: false};
        /** @type {Object.<string, boolean>} */
        $scope.searchResultsDelivered = {youtube: false};

        /**
         * Opens the search frame and optionally input the first char.
         *
         * @param {string=} firstChar the first char to fill the input with
         */
        var open = function (firstChar) {
            mtKeyboardShortcutManager.enterContext('search');
            $scope.searchVisible = true;
            $scope.searchTerm = firstChar;
        };

        $scope.$on(mt.events.OpenSearchFrameRequest, function (evt, data) {
            if (!$scope.searchVisible) {
                open(data ? data.typedChar : '');
            }
        });

        // when the user types we automatically execute the search
        $scope.$watch('searchTerm', function (newSearchTerm) {
            if (newSearchTerm !== null) {
                // new inputs so we stop the previous request
                $timeout.cancel($scope.instantSearchPromise);

                mtUserInteractionManager.searchActiveKeepAlive();

                $scope.searchResultsDelivered.youtube = false;

                // if the search has to be longer than two characters
                if (newSearchTerm.length > 2) {
                    $scope.searchRequestCount++;

                    $timeout.cancel($scope.instantSearchPromise);
                    $scope.instantSearchPromise = $timeout(function () {
                        $scope.search();
                    }, INSTANT_SEARCH_DELAY);
                }
            }
        });

        $scope.$watch('searchVisible', function (newSearchVisible) {
            if (newSearchVisible) {
                mtUserInteractionManager.searchActiveKeepAlive();
            } else {
                $scope.searchTerm = null;
                mtUserInteractionManager.searchClosed();
            }
        });

        // close the search pane if the user is not interacting anymore
        $scope.$watch(function () {
            return mtUserInteractionManager.userInteracting
        }, function (newUserInteracting) {
            if (!newUserInteracting && $scope.searchVisible) {
                $scope.close();
            }
        });

        $scope.search = function () {
            // store the current request count
            var startSearchRequestCount = $scope.searchRequestCount;

            $scope.searchPending.youtube = true;
            mtYoutubeClient.searchVideosByQuery($scope.searchTerm, function (videos) {
                // check if the request is outdated, it is a workaround until Angular provides a way to cancel requests
                if ($scope.searchRequestCount === startSearchRequestCount) {
                    $scope.searchPending.youtube = false;
                    $scope.searchResultsDelivered.youtube = true;
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

        mtKeyboardShortcutManager.register('search', 'esc', function (evt) {
            evt.preventDefault();
            $scope.close();
        });
    });
})(mt);