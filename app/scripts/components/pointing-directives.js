(function (mt) {
    'use strict';

    /**
     * @ngdoc directive
     * @name mt.directive:mtMouseInteractionDetection
     * @restrict A
     *
     * Adds the specified class to the element when a mouse based interaction is detected.
     *
     * The detection mechanism is inspired by https://github.com/stucox/Modernizr/blob/hover/feature-detects/device/hover.js
     * where we try to detect two consecutive "mousemove" events without an intervening "mousedown" event. This sequence
     * is not possible with a touch (only) interaction based device.
     */
    mt.MixTubeApp.directive('mtMouseInteractionDetection', function () {
        return {
            restrict: 'A',
            link: function (iScope, iElement, iAttrs) {

                var className = iAttrs.mtMouseInteractionDetection;
                if (!className) throw new Error('mtMouseInteractionDetection require an attribute value');

                var mouseMoveCount = 0;

                function mouseDownHandler() {
                    mouseMoveCount = 0;
                }

                iElement
                    .on('mousedown', mouseDownHandler)
                    .on('mousemove', function mouseMoveHandler() {
                        if (++mouseMoveCount > 1) {
                            iElement
                                .off('mousedown', mouseDownHandler)
                                .off('mousemove', mouseMoveHandler);
                            iElement.addClass(className);
                        }
                    });
            }
        };
    });

    // we using the ngTouch module the original ngClick directive is dropped in favor of an the touch one. This touch
    // ngClick calls the callback in an asynchronous what can be undesired sometimes. This directive is here to offer the
    // ''default ngClick behavior
    mt.MixTubeApp.directive('mtClickSync', function ($parse) {
        return {
            compile: function ($element, attr) {
                var fn = $parse(attr.mtClickSync);
                return function (scope, element) {
                    element.on('click', function (event) {
                        scope.$apply(function () {
                            fn(scope, {$event: event});
                        });
                    });
                };
            }
        };
    });

    mt.MixTubeApp.directive('mtClickActiveClass', function () {
        return function postLink(scope, iElement, iAttrs) {
            var activeClassName = iAttrs.mtClickActiveClass;

            iElement
                // simulates ngTouch behavior for active class
                .on('touchstart', function () {
                    iElement.addClass(activeClassName);
                })
                .on('touchend touchmove touchcancel', function () {
                    iElement.removeClass(activeClassName);
                });
        }
    });
})(mt);