(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtInteractiveChrome', function (mtInteractiveChromesManager) {
        return {
            restrict: 'A',
            link: function (iScope, iElement) {
                var entered = false;

                function mouseLeaveHandler() {
                    iScope.$apply(function () {
                        mtInteractiveChromesManager.chromeInteractionEnded();
                    });
                    entered = false;
                }

                function mouseEnterHandler() {
                    iScope.$apply(function () {
                        mtInteractiveChromesManager.chromeInteractionBegan();
                    });
                    entered = true;
                }

                iElement.on('mouseenter', mouseEnterHandler).on('mouseleave', mouseLeaveHandler);

                // make sure mw notify when an element is destroyed while the pointer was over it
                iScope.$on('$destroy', mouseLeaveHandler);
            }
        };
    });

})(mt);