(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtSmartImg', function ($animate) {

        return {
            restrict: 'E',
            link: function (scope, iElement, iAttrs) {

                var bSize = 'contains';
                if (iAttrs.crop === 'fill') {
                    bSize = 'cover';
                }

                var image = angular.element('<img>')[0];
                image.src = iAttrs.src;
                image.onload = function () {
                    scope.$apply(function () {
                        $animate.removeClass(iElement, 'mt-loading');
                    });
                };

                $animate.addClass(iElement, 'mt-loading');

                iElement.css({
                    'background-image': 'url(' + iAttrs.src + ')',
                    'background-size': bSize
                });
            }
        };
    });
})(mt);