(function (mt) {
    'use strict';

    /**
     * @ngdoc directive
     * @name mt.directive:mtScrollable
     * @restrict A
     *
     * Declares a scrollable container that can be manipulated thanks to its controller. The attribute value is an unique
     * name that can be used to get the directive controller from the {@link mtScrollablesRegistry}.
     *
     * An anchor string declared on children elements thanks to the "mt-scrollable-anchor" attribute can be then used
     * when calling {@link mtScrollable.mtScrollableController#putInViewPort(string)} to scroll until the child element
     * is visible.
     */
    mt.MixTubeApp.directive('mtScrollable', function ($window, $rootScope, mtScrollablesRegistry, BASE_TRANSITION_DURATION, EASE_IN_OUT_FN) {

        return {
            restrict: 'A',
            controller: function ($scope, $element, $attrs) {

                var scrollableName = $attrs.mtScrollable;
                var scrollableElement = $element;

                if (!scrollableName || scrollableName.trim().length === 0) {
                    throw new Error('mtScrollable expected a non empty string as attribute value');
                }

                mtScrollablesRegistry.register(scrollableName, this);
                $scope.$on('$destroy', function () {
                    mtScrollablesRegistry.unregister(scrollableName);
                });

                function transitionScrollTop(duration, scrollOffset) {
                    // store the scroll position at the beginning of the transition
                    var scrollStart = scrollableElement[0].scrollTop;

                    var startTs = null;
                    (function requestNextFrame() {
                        $window.requestAnimationFrame(function (frameTs) {
                            if (startTs === null) {
                                startTs = frameTs;
                            }

                            var progress = (frameTs - startTs) / duration;

                            if (progress > 0) {
                                var frameScrollOffset = scrollOffset * EASE_IN_OUT_FN(progress);
                                scrollableElement[0].scrollTop = scrollStart + frameScrollOffset;
                            }

                            if (progress < 1) {
                                requestNextFrame();
                            }
                        });
                    })();
                }

                function putElementInViewPort(target) {
                    var scrollViewRect = scrollableElement[0].getBoundingClientRect();
                    var targetRect = target[0].getBoundingClientRect();

                    var offset = 0;
                    if (targetRect.top < scrollViewRect.top) {
                        offset = targetRect.top - scrollViewRect.top;
                    } else if (scrollViewRect.bottom < targetRect.bottom) {
                        offset = targetRect.bottom - scrollViewRect.bottom;
                    }

                    if (offset !== 0) {
                        transitionScrollTop(BASE_TRANSITION_DURATION, offset);
                    }
                }

                function putAnchorInViewPort(anchor) {
                    var target = mt.utils.querySelector(scrollableElement, '[mt-anchor=' + anchor + ']');
                    if (target.length > 0) {
                        putElementInViewPort(target);
                    }
                }

                /**
                 * Ensures the given target is visible in the view port by scrolling the scrollable.
                 *
                 * @param {(string|jqLite)} target could be an anchor define by "mt-anchor" attribute or a jqLite element
                 */
                this.putInViewPort = function (target) {
                    if (angular.isElement(target)) {
                        putElementInViewPort(target);
                    } else if (angular.isString(target)) {
                        putAnchorInViewPort(target);
                    } else {
                        throw new Error('The "putInViewPort" method from mtScrollable only accepts strings or jQLite elements');
                    }
                };
            }
        };
    });
})(mt);