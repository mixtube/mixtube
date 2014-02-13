(function (mt) {
    'use strict';

    'click'.split(' ').forEach(function (name) {
        var directiveName = 'mt' + mt.tools.capitalize(name) + 'Sync';

        mt.MixTubeApp.directive(directiveName, function ($parse) {
            return {
                compile: function ($element, attr) {
                    var fn = $parse(attr[directiveName]);
                    return function (scope, element) {
                        element.on(name, function (event) {
                            fn(scope, {$event: event});
                            scope.$digest();
                        });
                    };
                }
            };
        });
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
    })
})(mt);