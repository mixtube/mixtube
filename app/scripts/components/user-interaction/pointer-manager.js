(function (mt) {
    'use strict';

    function PointerManagerFactory($timeout, $swipe, $document) {

        var MOVE_THRESHOLD = 5;
        var MOVE_DELAY = 200;

        var pointerPosition = {x: 0, y: 0};
        var mouseMoving = false;
        var moveStoppedTO = null;

        var handlers = [];


        activate();


        function listenMove(handler) {
            handlers.push(handler);
            return function unlisten() {
                _.remove(handlers, handler);
            }
        }

        function isPointerInRect(/*ClientRect*/ rect) {
            return rect.left < pointerPosition.x && pointerPosition.x < rect.right
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
            var touchInteraction = false;
            $swipe.bind($document, {
                start: function (coord, evt) {
                    if (evt.type === 'touchstart') {
                        // will allow to filter out mousemove event that behaves too weirdly in touch based interaction
                        touchInteraction = true;
                    }
                    pointerPosition.x = evt.x;
                    pointerPosition.y = evt.y;
                    mouseMoved();
                }
            });
            $document
                .on('touchend touchcancel', function () {
                    touchInteraction = false;
                })
                .on('mousemove', function (evt) {
                    if (!touchInteraction) {
                        var moved = Math.abs(evt.clientX - pointerPosition.x) > MOVE_THRESHOLD
                            || Math.abs(evt.clientY - pointerPosition.y) > MOVE_THRESHOLD;
                        pointerPosition.x = evt.clientX;
                        pointerPosition.y = evt.clientY;
                        if (moved) {
                            mouseMoved();
                        }
                    }
                });
        }

        /**
         * @name PointerManager
         */
        var PointerManager = {

            isPointerInRect: isPointerInRect,

            listenMove: listenMove
        };

        return PointerManager;
    }

    mt.MixTubeApp.factory('PointerManager', PointerManagerFactory);
})(mt);