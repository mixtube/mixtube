(function (mt, undefined) {
    'use strict';

    // simple event listener directives for focus and blur events type
    ['blur', 'focus'].forEach(function (evtName) {
        var directiveName = 'mt' + mt.tools.capitalize(evtName);
        mt.MixTubeApp.directive(directiveName, function ($parse) {
            return function (scope, elmt, attr) {
                var fn = $parse(attr[directiveName]);
                elmt.bind(evtName, function (event) {
                    scope.$apply(function () {
                        fn(scope, {$event: event});
                    });
                });
            };
        });
    });

    // ensures that the element (most likely an input) is focused.
    var focusWhenName = 'mtFocusWhen';
    mt.MixTubeApp.directive(focusWhenName, function ($parse, $timeout) {
        var defaultConfig = {selectTextOnFocus: false};

        return function (scope, elmt, attrs) {
            scope.$watch(attrs[focusWhenName], function (value) {
                $timeout(function () {
                    var action = value ? 'focus' : 'blur';
                    elmt[action]();
                    if (attrs['select-text-on-focus'] && action === 'focus') {
                        elmt.select();
                    }
                }, 50);
            }, true);
        };
    });

    // intercept rendering initiated by ngModel directive in order to focus the element on model change
    // it is useful to enforce good sequencing of focus then value affectation to get a proper caret position (FF and IE)
    mt.MixTubeApp.directive('mtFocusOnRender', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                var saved$render = ngModelCtrl.$render;
                ngModelCtrl.$render = function () {
                    element.focus();
                    saved$render();
                };
            }
        };
    });

    // mouse start and stop directive which are mouse move listener with debouncing for respectively leading and
    // trailing edge of the wait period defined by the related attribute "debounce"
    [
        {name: 'start', debounceParams: {leading: true, trailing: false}},
        {name: 'stop', debounceParams: {leading: false, trailing: true}}
    ].forEach(function (descriptor) {
            var directiveName = 'mtMouse' + descriptor.name;

            mt.MixTubeApp.directive(directiveName, function ($parse) {
                return function (scope, elmt, attr) {

                    var fn = $parse(attr[directiveName]);

                    // get the debounce wait value (default value if unspecified is 500ms)
                    var waitTime = parseInt(attr.debounce, 10) || 500;

                    elmt.bind('mousemove', _.debounce(function (evt) {
                        scope.$apply(function () {
                            fn(scope, {$event: evt});
                        });
                    }, waitTime, descriptor.debounceParams));
                };
            });
        });

    mt.MixTubeApp.directive('mtScrollview', function () {

        /**
         * Return the given element ClientRect including the margins.
         *
         * @param {jQuery} $elem
         * @returns {ClientRect}
         */
        function getWholeClientRect($elem) {
            var rect = angular.copy($elem[0].getBoundingClientRect());
            rect.top -= parseFloat($elem.css('margin-top'));
            rect.bottom += parseFloat($elem.css('margin-bottom'));
            rect.left -= parseFloat($elem.css('margin-left'));
            rect.rigth += parseFloat($elem.css('margin-right'));
            return rect;
        }

        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            template: '<div ng-transclude></div>',
            controller: function ($element) {
                var scrollViewRect = $element[0].getBoundingClientRect();

                this.scrollIntoView = function ($targetElement) {
                    var targetRect = getWholeClientRect($targetElement);
                    $element.animate({scrollTop: targetRect.top - scrollViewRect.top}, 'fast');
                };
            }
        };
    });

    var scrollIntoViewIfName = 'mtScrollIntoViewIf';
    mt.MixTubeApp.directive(scrollIntoViewIfName, function ($timeout) {
        return {
            restrict: 'A',
            require: '^mtScrollview',
            link: function (scope, element, attrs, mtScrollviewCtrl) {
                scope.$watch(attrs[scrollIntoViewIfName], function (value) {
                    if (value) {
                        $timeout(function () {
                            mtScrollviewCtrl.scrollIntoView(element);
                        }, 0);
                    }
                });
            }
        };
    });

    mt.MixTubeApp.directive('mtCarousel', function ($window, mtAnimationHooksManager) {

        // once for all register the animation hooks to let the parent carousel be notified when a sub element enter
        mtAnimationHooksManager.hooks.enter.after.push(function (element) {
            var mtCarouselCtrl = element.controller('mtCarousel');
            if (mtCarouselCtrl) {
                mtCarouselCtrl.itemEntered(element);
            }
        });

        return {
            restrict: 'A',
            replace: true,
            transclude: true,
            template: '<div ng-transclude></div>',
            controller: function ($element) {

                var carousel = $element;

                /**
                 * Pick the carousel item available at the given x position.
                 *
                 * @param {number} x the position
                 * @returns {HTMLElement} the item at the position or undefined if none found
                 */
                function rawItemFromPosition(x) {
                    var items = carousel.find('.mt-queue-item');
                    return _.findWhere(items, function (item, idx) {
                        var itemRect = item.getBoundingClientRect();
                        return idx === 0 && itemRect.left > x || itemRect.left <= x && itemRect.right >= x;
                    });
                }

                this.backward = function () {
                    var toBringUp = rawItemFromPosition(-carousel[0].getBoundingClientRect().width);
                    if (toBringUp) {
                        this.bringUp(angular.element(toBringUp));
                    }
                };

                this.forward = function () {
                    var toBringUp = rawItemFromPosition(carousel[0].getBoundingClientRect().width);
                    if (toBringUp) {
                        this.bringUp(angular.element(toBringUp));
                    }
                };

                this.bringUp = function (toBringUp) {
                    var viewPortRect = carousel[0].getBoundingClientRect();
                    var toBringUpRect = toBringUp[0].getBoundingClientRect();

                    if (toBringUpRect.left < viewPortRect.left || viewPortRect.right < toBringUpRect.right) {
                        // the element to bring up is outside of the view port
                        // we want to make it the first visible item in the view port
                        var list = carousel.find('.mt-queue-list');
                        var listRect = list[0].getBoundingClientRect();
                        var newPosition = listRect.left - toBringUpRect.left;
                        list.animate({left: newPosition});
                    }
                };

                this.itemEntered = function (enteredElement) {
                   // this.bringUp(angular.element(enteredElement));
                };
            }
        };
    });

    mt.MixTubeApp.directive('mtCarouselHandle', function () {
        return {
            restrict: 'A',
            require: '^mtCarousel',
            link: function (scope, element, attrs, mtCarouselCtrl) {
                if (attrs.mtCarouselHandle === 'backward') {
                    element.bind('click', function () {
                        mtCarouselCtrl.backward();
                    });
                } else if (attrs.mtCarouselHandle === 'forward') {
                    element.bind('click', function () {
                        mtCarouselCtrl.forward();
                    });
                }
            }
        };
    });

    mt.MixTubeApp.directive('mtCarouselBringUpIf', function () {
        return {
            restrict: 'A',
            require: '^mtCarousel',
            link: function (scope, element, attrs, mtCarouselCtrl) {
                scope.$watch(attrs.mtCarouselBringUpIf, function watchBringUpIf(bringUp) {
                    if (bringUp) {
                        mtCarouselCtrl.bringUp(element);
                    }
                });
            }
        };
    });

    // a duration formatter that takes a duration in milliseconds and returns a formatted duration like "h:mm"
    mt.MixTubeApp.filter('mtDuration', function () {
        // reuse the date object between invocation since it is only used as a formatting tool
        var singletonDate = new Date(0, 0, 0, 0, 0, 0, 0);
        // time that represent the absolute zero for date, all fields to zero
        // needs to be computed because of timezones differences
        var absoluteDateZero = singletonDate.getTime();

        return function (time) {
            if (isNaN(time)) {
                return '';
            }

            // reset the time to the zero to calculate durations
            singletonDate.setTime(absoluteDateZero);
            singletonDate.setMilliseconds(time);

            return (singletonDate.getHours() * 60 + singletonDate.getMinutes()).toString(10) + ':' + mt.tools.leftPad(singletonDate.getSeconds().toString(10), 2, '0');
        }
    });
})(mt);