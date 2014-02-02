(function (mt) {
    'use strict';

    mt.MixTubeApp.controller('mtRootCtrl', function ($scope, $location, mtQueueManager) {

        var ctrl = this;

        /**
         * Stores the serialized version of the queue. Useful to check the new url state against the internal state to prevent
         * infinite loops when changing the url internally.
         *
         * @type {string}
         */
        var serializedQueue;

        ctrl.queueLoading = false;

        // the queue, the search and the focused entry term are declared in the scope (instead of the root controller)
        // so that they can be read, written and watched from any controller
        /** @type {mt.model.Queue} */
        $scope.props.queue = mtQueueManager.queue;
        /** @type {mt.model.QueueEntry} */
        $scope.props.focusedEntry = null;
        /** @type {string}*/
        $scope.props.searchTerm = null;

        $scope.$watch('props.queue', function (newVal, oldVal) {
            // this test is here to prevent to serialize during the init phase
            if (!angular.equals(newVal, oldVal)) {
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
                ctrl.queueLoading = true;
                mtQueueManager.deserialize(serializedQueue)
                    .catch(function (message) {
                        // todo add notification
//                    mtAlert.error(message);
                    }).finally(function () {
                        ctrl.queueLoading = false;
                    });
            }
        }, true);
    });

    mt.MixTubeApp.controller('mtSearchCtrl', function ($scope, $rootScope, $timeout, mtYoutubeClient, mtConfiguration) {

        var ctrl = this;

        /**
         * @const
         * @type {number}
         */
        var INSTANT_SEARCH_DELAY = 500;

        /** @type {number} */
        var searchRequestCount = 0;
        /** @type {promise} */
        var instantSearchPromise = null;

        /** @type {boolean} */
        ctrl.searchShown = mtConfiguration.initialSearchOpen;

        /** @type {Object.<string, Array.<mt.model.Video>>} */
        ctrl.results = {youtube: []};
        /** @type {Object.<string, boolean>} */
        ctrl.pending = {youtube: false};
        /** @type {Object.<string, boolean>} */
        ctrl.delivered = {youtube: false};

        function search(term) {
            // store the current request count
            var startSearchRequestCount = searchRequestCount;

            ctrl.pending.youtube = true;
            mtYoutubeClient.searchVideosByQuery(term, function (videos) {
                // check if the request is outdated, it is a workaround until Angular provides a way to cancel requests
                if (searchRequestCount === startSearchRequestCount) {
                    ctrl.pending.youtube = false;
                    ctrl.delivered.youtube = true;
                    ctrl.results.youtube = videos;
                }
            });
        }

        // when the user types we automatically execute the search
        $scope.$watch('props.searchTerm', function (newSearchTerm) {
            if (newSearchTerm !== null) {
                // ensure search panel is open when triggering a search
                ctrl.searchShown = true;

                // new inputs so we stop the previous request
                $timeout.cancel(instantSearchPromise);

                ctrl.delivered.youtube = false;

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
    });

    mt.MixTubeApp.controller('mtSearchResultCtrl', function ($scope, $timeout, mtQueueManager, mtScrollablesManager) {

        /**
         * @const
         * @type {number}
         */
        var CONFIRMATION_DURATION = 4000;

        var ctrl = this;
        var tmoPromise = null;

        ctrl.confirmationShown = false;

        /**
         * @param {mt.model.Video} video
         */
        ctrl.appendResultToQueue = function (video) {

            var queueEntry = mtQueueManager.appendVideo(video);

            // execute at the end of the current digest loop so that the entry is really inserted in the queue
            // by the ngRepeat directive reacting to the queue change
            $scope.$$postDigest(function () {
                mtScrollablesManager('queue').putInViewPort(queueEntry.id);
            });

            ctrl.confirmationShown = true;
            $timeout.cancel(tmoPromise);
            tmoPromise = $timeout(function () {
                ctrl.confirmationShown = false;
            }, CONFIRMATION_DURATION);
        };
    });

    mt.MixTubeApp.controller('mtQueueEntryCtrl', function ($timeout, mtQueueManager) {

        var ctrl = this;

        ctrl.showSpinner = false;

        /**
         * @param {mt.model.QueueEntry} queueEntry
         */
        ctrl.playQueueEntry = function (queueEntry) {
            ctrl.pending = true;

            $timeout(function () {
                ctrl.pending = false;
            }, 2000);
        };

        /**
         * @param {mt.model.QueueEntry} queueEntry
         */
        ctrl.removeQueueEntry = function (queueEntry) {
            mtQueueManager.removeEntry(queueEntry);
        };
    });
})(mt);