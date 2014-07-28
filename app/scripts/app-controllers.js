(function (mt) {
    'use strict';

    mt.MixTubeApp.controller('mtRootCtrl',
        function ($interval, $scope, $location, mtKeyboardShortcutManager, mtQueueManager, mtSearchInputsRegistry,
                  mtNotificationCentersRegistry, mtOrchestrator, mtUserInteractionManager, mtQueuesRegistry, mtConfiguration) {

            var rootCtrl = this;

            /**
             * Stores the serialized version of the queue. Useful to check the new url state against the internal state to prevent
             * infinite loops when changing the url internally.
             *
             * @type {string}
             */
            var serializedQueue;

            rootCtrl.queueLoading = false;

            // the queue, the search and the focused entry term are declared in the scope (instead of the root controller)
            // so that they can be read, written and watched from any controller
            /** @type {mt.model.Queue} */
            $scope.props.queue = mtQueueManager.queue;

            /** @type {string}*/
            $scope.props.searchTerm = null;
            /** @type {boolean}*/
            $scope.props.searchShown = false;

            rootCtrl.getRunningQueueEntry = function () {
                return mtOrchestrator.runningQueueEntry;
            };

            rootCtrl.getLoadingQueueEntry = function () {
                return mtOrchestrator.loadingQueueEntry;
            };

            rootCtrl.isPlaying = function () {
                return mtOrchestrator.playing;
            };

            rootCtrl.isUserInteracting = function () {
                return mtUserInteractionManager.userInteracting;
            };

            /**
             * @param {boolean=} showOrHide if not given it will toggle the visibility
             */
            rootCtrl.toggleSearch = function (showOrHide) {
                $scope.props.searchShown = _.isUndefined(showOrHide) ? !$scope.props.searchShown : showOrHide;

                if ($scope.props.searchShown) {
                    // reset search term before showing the search input
                    $scope.props.searchTerm = null;
                    mtKeyboardShortcutManager.enterScope('search');
                } else {
                    mtKeyboardShortcutManager.leaveScope('search');
                }

                mtSearchInputsRegistry('search').ready(function (searchInput) {
                    searchInput.toggle($scope.props.searchShown);
                });
            };

            rootCtrl.togglePlayback = function () {
                mtOrchestrator.togglePlayback();
            };

            // hide the input search at startup
            rootCtrl.toggleSearch(false);

            // register the global space shortcut
            mtKeyboardShortcutManager.register('space', function (evt) {
                evt.preventDefault();
                mtOrchestrator.togglePlayback();
            });

            mtKeyboardShortcutManager.register('search', 'esc', function (evt) {
                evt.preventDefault();
                rootCtrl.toggleSearch(false);
            });

            $scope.$watch('props.queue', function (newVal, oldVal) {
                // this test is here to prevent to serialize during the init phase
                if (newVal !== oldVal) {
                    var newSerializedQueue = mtQueueManager.serialize();
                    if (serializedQueue !== newSerializedQueue) {
                        serializedQueue = newSerializedQueue;
                        // replace queue parameter but keep the rest
                        $location.search(angular.extend({}, $location.search(), {queue: serializedQueue}));
                    }
                }
            }, true);

            $scope.$watch(function () {
                return $location.search().queue;
            }, function (newSerializedQueue) {
                if (serializedQueue !== newSerializedQueue) {
                    serializedQueue = newSerializedQueue;
                    // change initiated by user (back / forward etc.), need to be deserialized
                    rootCtrl.queueLoading = true;
                    mtQueueManager.deserialize(serializedQueue)
                        .catch(function (message) {
                            mtNotificationCentersRegistry('notificationCenter').ready(function (notificationCenter) {
                                notificationCenter.error(message);
                            });
                        }).finally(function () {
                            rootCtrl.queueLoading = false;
                        });
                }
            });

            $scope.$watch(function () {
                return mtOrchestrator.runningQueueEntry;
            }, function (runningQueueEntry, oldVal) {
                if (runningQueueEntry !== oldVal) {
                    mtQueuesRegistry('queue').ready(function (queue) {
                        queue.focusEntry(runningQueueEntry);
                    });
                }
            });
        });

    mt.MixTubeApp.controller('mtSearchResultsCtrl', function ($scope, $rootScope, $timeout, $sce, mtYoutubeClient) {

        var searchResultsCtrl = this;

        /**
         * @const
         * @type {number}
         */
        var INSTANT_SEARCH_DELAY = 500;

        /** @type {number} */
        var searchRequestCount = 0;
        /** @type {promise} */
        var instantSearchPromise = null;

        /**
         * The user already executed one search. Used to hide the results pane until there is something to show.
         *
         * @type {boolean}
         */
        searchResultsCtrl.inSearch = false;
        /** @type {Object.<string, Array.<mt.model.Video>>} */
        searchResultsCtrl.results = null;
        /** @type {Object.<string, boolean>} */
        searchResultsCtrl.pending = null;
        /** @type {Object.<string, boolean>} */
        searchResultsCtrl.delivered = null;

        function reset() {
            searchResultsCtrl.inSearch = false;
            searchResultsCtrl.results = {youtube: []};
            searchResultsCtrl.pending = {youtube: false};
            searchResultsCtrl.delivered = {youtube: false};
        }

        function search(term) {
            // store the current request count
            var startSearchRequestCount = searchRequestCount;


            // reset the results to trigger the animation
            searchResultsCtrl.results.youtube = [];

            searchResultsCtrl.inSearch = true;
            searchResultsCtrl.pending.youtube = true;

            mtYoutubeClient.searchVideosByQuery(term, function (videos) {
                // check if the request is outdated, it is a workaround until Angular provides a way to cancel requests
                if (searchRequestCount === startSearchRequestCount) {
                    searchResultsCtrl.pending.youtube = false;
                    searchResultsCtrl.delivered.youtube = true;
                    searchResultsCtrl.results.youtube = videos;
                }
            });
        }

        // when the user types we automatically execute the search
        $scope.$watch('props.searchTerm', function (newSearchTerm) {
            if (newSearchTerm !== null) {

                // new inputs so we stop the previous request
                $timeout.cancel(instantSearchPromise);

                searchResultsCtrl.delivered.youtube = false;

                // if the search has to be longer than two characters
                if (newSearchTerm.length > 2) {
                    searchRequestCount++;

                    $timeout.cancel(instantSearchPromise);
                    instantSearchPromise = $timeout(function () {
                        search(newSearchTerm);
                    }, INSTANT_SEARCH_DELAY);
                }
            }
        });

        // ensures everything is cleared when the search is hidden
        $scope.$watch('props.searchShown', function (searchShown) {
            if (!searchShown) {
                // new inputs so we stop the previous request
                $timeout.cancel(instantSearchPromise);
                reset();
            }
        });


        searchResultsCtrl.shouldShowSearchResultPanel = function () {
            return $scope.props.searchShown && searchResultsCtrl.inSearch;
        };

        searchResultsCtrl.trust = function (url) {
            return $sce.trustAsResourceUrl(url);
        };

        reset();
    });

    mt.MixTubeApp.controller('mtSearchResultCtrl', function ($scope, $timeout, mtQueueManager, mtQueuesRegistry, mtOrchestrator) {

        /**
         * @const
         * @type {number}
         */
        var CONFIRMATION_DURATION = 4000;

        var searchResultCtrl = this;
        var tmoPromise = null;

        searchResultCtrl.shouldShowConfirmation = false;
        searchResultCtrl.countBeforePlayback = null;

        /**
         * @param {mt.model.Video} video
         */
        searchResultCtrl.appendResultToQueue = function (video) {

            var queueEntry = mtQueueManager.appendVideo(video);

            if (mtOrchestrator.runningQueueEntry) {
                var entries = mtQueueManager.queue.entries;
                searchResultCtrl.countBeforePlayback = entries.indexOf(queueEntry) - entries.indexOf(mtOrchestrator.runningQueueEntry);
            } else {
                searchResultCtrl.countBeforePlayback = null;
            }

            mtQueuesRegistry('queue').ready(function (queue) {
                queue.focusEntry(queueEntry);
            });

            searchResultCtrl.shouldShowConfirmation = true;
            $timeout.cancel(tmoPromise);
            tmoPromise = $timeout(function () {
                searchResultCtrl.shouldShowConfirmation = false;
            }, CONFIRMATION_DURATION);
        };
    });

    mt.MixTubeApp.controller('mtQueueCtrl', function (mtOrchestrator, mtQueueManager) {

        var queueCtrl = this;

        /**
         * @param {number} queueIndex
         */
        queueCtrl.playQueueEntry = function (queueIndex) {
            mtOrchestrator.skipTo(queueIndex);
        };

        /**
         * @param {mt.model.QueueEntry} queueEntry
         */
        queueCtrl.removeQueueEntry = function (queueEntry) {
            mtQueueManager.removeEntry(queueEntry);
        };
    });

    mt.MixTubeApp.controller('mtDebuggingCtrl',
        function (mtConfiguration, mtKeyboardShortcutManager, mtNotificationCentersRegistry) {

            function notification(message) {
                mtNotificationCentersRegistry('notificationCenter').ready(function (notificationCenter) {
                    notificationCenter.error(message);
                });
            }

            if (mtConfiguration.debugNotifications) {
                // register the global space shortcut
                mtKeyboardShortcutManager.register('ctrl+n', function (evt) {
                    evt.preventDefault();
                    notification('Debugging: Test notification');
                });
            }
        });
})(mt);