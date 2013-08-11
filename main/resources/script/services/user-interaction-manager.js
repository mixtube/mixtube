(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtUserInteractionManager', function ($rootScope, $timeout) {
        /**
         * @const
         * @type {number}
         */
        var TRAILING_DELAY = 1000;
        /**
         * @const
         * @type {number}
         */
        var SEARCH_KEEP_ALIVE_DELAY = 10000;

        /** @type {boolean} */
        var userInteracting;
        /** @type {boolean} */
        var overQueueFrame;
        /** @type {boolean} */
        var mouseMoving;
        /** @type {boolean} */
        var searchActive;

        /** @type {promise} */
        var userInteractingPromise;
        /** @type {promise} */
        var searchActivePromise;

        // according to the interaction detected set to true or false with a delay
        $rootScope.$watch(function () {
            return overQueueFrame || mouseMoving || searchActive;
        }, function (newInteractionState) {
            if (newInteractionState) {
                $timeout.cancel(userInteractingPromise);
                userInteracting = true;
            } else {
                userInteractingPromise = $timeout(function () {
                    userInteracting = false;
                }, TRAILING_DELAY);
            }
        });

        return {
            /**
             * Is the user actively interacting with the UI.
             *
             * @returns {boolean}
             */
            get userInteracting() {
                return userInteracting;
            },
            enteredQueueFrame: function () {
                overQueueFrame = true;
            },
            leavedQueueFrame: function () {
                overQueueFrame = false;
            },
            mouseStarted: function () {
                mouseMoving = true;
                if (searchActive) {
                    // if the mouse moves when the search is active we keep the search alive
                    this.searchActiveKeepAlive();
                }
            },
            mouseStopped: function () {
                mouseMoving = false;
            },
            searchActiveKeepAlive: function () {
                $timeout.cancel(searchActivePromise);
                searchActive = true;
                searchActivePromise = $timeout(function () {
                    searchActive = false;
                }, SEARCH_KEEP_ALIVE_DELAY);
            },
            searchClosed: function () {
                $timeout.cancel(searchActivePromise);
                searchActive = false;
            }
        };
    });
})(mt);