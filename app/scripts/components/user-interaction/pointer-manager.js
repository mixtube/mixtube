(function (mt) {
    'use strict';

    function PointerManagerFactory($rootScope, $timeout, $document) {

        var MOVE_THRESHOLD = 5;
        var MOVE_DELAY = 200;

        var pointerPosition = {x: 0, y: 0};
        var mouseMoving = false;
        var moveStoppedTO = null;

        var handlers = [];

        var mouseDetected = false;


        activate();


        function bindMove(handler) {
            handlers.push(handler);
            return function unlisten() {
                _.remove(handlers, handler);
            }
        }

        function isPointerInRect(/*ClientRect*/ rect) {
            return pointerPosition.x !== null && pointerPosition.y !== null
            && rect.left < pointerPosition.x && pointerPosition.x < rect.right
            && rect.top < pointerPosition.y && pointerPosition.y < rect.bottom;
        }

        function notifyMoveEvent(event) {
            for (var idx = 0; idx < handlers.length; idx++) {
                var handler = handlers[idx];
                if (event in handler) {
                    handler[event]();
                }
            }
        }

        function moveStoppedTOCb() {
            mouseMoving = false;
            notifyMoveEvent('stop');
        }

        function mouseMoved() {
            if (!mouseMoving) {
                mouseMoving = true;
                notifyMoveEvent('start');
            }

            // and the end of the timeout trigger mouseEndMove
            $timeout.cancel(moveStoppedTO);
            moveStoppedTO = $timeout(moveStoppedTOCb, MOVE_DELAY, false);
        }

        function activate() {

            (function mouseDetection() {
                var mouseMoveCount = 0;

                function down() {
                    mouseMoveCount = 0;
                }

                $document
                    .on('mousedown', down)
                    .on('mousemove', function move() {
                        if (++mouseMoveCount > 1) {
                            $document
                                .off('mousedown', down)
                                .off('mousemove', move);
                            $rootScope.$apply(function () {
                                mouseDetected = true;
                            });
                        }
                    });
            })();


            $document
                .on('click', function () {
                    pointerPosition.x = pointerPosition.y = null;

                    mouseMoved();
                })
                .on('mousemove', function (evt) {
                    var moved = Math.abs(evt.clientX - pointerPosition.x) > MOVE_THRESHOLD
                        || Math.abs(evt.clientY - pointerPosition.y) > MOVE_THRESHOLD;
                    pointerPosition.x = evt.clientX;
                    pointerPosition.y = evt.clientY;
                    if (moved) {
                        mouseMoved();
                    }
                });
        }

        /**
         * @name PointerManager
         */
        var PointerManager = {

            /**
             * Is a mouse based interaction detected.
             *
             * The detection mechanism is inspired by https://github.com/stucox/Modernizr/blob/hover/feature-detects/device/hover.js
             * where we try to detect two consecutive "mousemove" events without an intervening "mousedown" event. This sequence
             * is not possible with a touch (only) interaction based device.
             *
             * @returns {boolean}
             */
            get mouseDetected() {
                return mouseDetected;
            },

            isPointerInRect: isPointerInRect,

            bindMove: bindMove
        };

        return PointerManager;
    }

    mt.MixTubeApp.factory('PointerManager', PointerManagerFactory);
})(mt);