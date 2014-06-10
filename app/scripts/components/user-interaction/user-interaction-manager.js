(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtUserInteractionManager', function ($rootScope, $timeout, $document, mtInteractiveChromesManager) {

        var MOVE_THRESHOLD = 5;
        var MOVE_DELAY = 200;
        var ACTIVITY_DELAY = 4000;

        var mouseMoving = false;
        var mouseStoppedTimeout = null;
        var lastMousePosition = null;

        // we consider the loading phase as activity so that it shows the chrome (better discoverability)
        var userInteracting = true;
        var userStoppedInteractingTimeout = null;

        $document.on('mousemove', function (evt) {

            var position = {x: evt.clientX, y: evt.clientY};

            if (lastMousePosition
                && (Math.abs(position.x - lastMousePosition.x) > MOVE_THRESHOLD
                    || Math.abs(position.y - lastMousePosition.y) > MOVE_THRESHOLD)) {

                if (!mouseMoving) {
                    $rootScope.$apply(function () {
                        mouseMoving = true;
                    });
                }

                $timeout.cancel(mouseStoppedTimeout);
                mouseStoppedTimeout = $timeout(function () {
                    mouseMoving = false;
                }, MOVE_DELAY);
            }

            lastMousePosition = position;
        });

        // add a delay before saying there is not interaction anymore
        $rootScope.$watch(function () {
            if (mouseMoving || mtInteractiveChromesManager.chromeInteracted) {
                $timeout.cancel(userStoppedInteractingTimeout);
                userStoppedInteractingTimeout = null;
                userInteracting = true;
            } else if (!userStoppedInteractingTimeout) {
                userStoppedInteractingTimeout = $timeout(function () {
                    userInteracting = false
                }, ACTIVITY_DELAY);
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
            }
        };
    });
})(mt);