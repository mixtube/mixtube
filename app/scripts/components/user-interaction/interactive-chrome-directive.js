(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtInteractiveChrome', function (mtInteractiveChromesManager) {

        function updateInteractionState(state) {
            if (state) {
                mtInteractiveChromesManager.chromeInteractionBegan();
            } else {
                mtInteractiveChromesManager.chromeInteractionEnded();
            }
        }

        var updateInteractionStarted = _.partial(updateInteractionState, true);
        var updateInteractionEnded = _.partial(updateInteractionState, false);

        return {
            restrict: 'A',
            link: function (scope, iElement, iAttrs) {

                // if an expression is provided watch it to get the state (truthy / falsy) else use mouse enter / leave
                // to detect interaction
                if (iAttrs.mtInteractiveChrome) {
                    scope.$watch(iAttrs.mtInteractiveChrome, updateInteractionState);
                } else {
                    iElement.on({
                        mouseenter: function () {
                            scope.$apply(updateInteractionStarted);
                        },
                        mouseleave: function () {
                            scope.$apply(updateInteractionEnded);
                        }
                    });
                }

                // make sure mw notify when an element is destroyed
                scope.$on('$destroy', updateInteractionEnded);
            }
        };
    });

})(mt);