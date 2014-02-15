(function (mt) {
    'use strict';

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
    })
})(mt);