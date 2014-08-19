(function (mt) {
    'use strict';

    function mtInteractiveChrome(InteractiveChromesManager, PointerManager) {
        return {
            restrict: 'A',
            scope: {
                mtInteractiveChrome: '='
            },
            link: function (scope, iElement, iAttrs) {

                var removeFn = InteractiveChromesManager.addInteractiveChrome(
                    {
                        isInteracted: function () {
                            return scope.mtInteractiveChrome ||
                            PointerManager.isPointerInRect(iElement[0].getBoundingClientRect());
                        }
                    });

                // make sure mw notify when an element is destroyed
                scope.$on('$destroy', removeFn);
            }
        };
    }

    mt.MixTubeApp.directive('mtInteractiveChrome', mtInteractiveChrome);

})(mt);