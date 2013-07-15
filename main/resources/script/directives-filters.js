(function (mt, undefined) {
    'use strict';

    // add an event property "redundantClick" to tell that if the click was done quickly after the first one
    // useful to filter out inadvertent in some scenario.
    mt.MixTubeApp.directive('ngClick', function () {
        return {
            restrict: 'A',
            priority: 10, // priority at 10 to be executed before the original angular click directive
            link: function (scope, element) {
                element.bind('click.mtLastClick', function (evt) {
                    var now = Date.now();
                    var lastClickTs = element.data('mtLastClickTS');
                    if (lastClickTs && now - lastClickTs < 500) {
                        evt.redundantClick = true;
                    }
                    element.data('mtLastClickTS', now);
                });
            }
        };
    });

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

    // intercept rendering initiated by ngModel directive in order to focus the element on model change
    // it is useful to enforce good sequencing of focus then value affectation to get a proper caret position (FF and IE)
    mt.MixTubeApp.directive('mtFocusOnRender', function ($timeout) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                var saved$render = ngModelCtrl.$render;
                ngModelCtrl.$render = function () {
                    // we need the input to be visible before set the value (and by focusing it thanks to model change)
                    // the only way from now is to protectively defer the affectation thanks to timeout
                    // for details see https://github.com/angular/angular.js/issues/1250#issuecomment-8604033
                    $timeout(function () {
                        element.focus();
                        saved$render();
                        if (attr.hasOwnProperty('autoSelect')) {
                            element[0].select();
                        }
                    }, 0);
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

    mt.MixTubeApp.directive('mtInlineEdit', function ($templateCache, $compile, $parse, mtKeyboardShortcutManager) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var inputFacetLinker = $compile($templateCache.get('mtInlineEditTemplate').trim());

                var mtInlineEditGet = $parse(attr.mtInlineEdit);
                var mtInlineEditSet = mtInlineEditGet.assign;

                // the insulated scope allows to choose when we want to send the updates to the parent model
                // we can't use a directive wide insulated scope because the display element may need some properties
                // from the parent scope to render
                var inputScope = scope.$new(true);
                inputScope.edition = false;
                inputScope.model = null;
                inputScope.blur = function () {
                    rollback();
                };

                function save() {
                    inputScope.edition = false;
                    mtInlineEditSet(scope, inputScope.model);
                    inputScope.model = null;
                }

                function rollback() {
                    inputScope.edition = false;
                    inputScope.model = null;
                }

                inputFacetLinker(inputScope, function (inputFacet) {
                    // register keyboard shortcut context for the input element
                    var keyboardShortcutContext = 'mtInlineEdit_' + inputScope.$id;
                    mtKeyboardShortcutManager.register(keyboardShortcutContext, 'return', function () {
                        save();
                    });
                    mtKeyboardShortcutManager.register(keyboardShortcutContext, 'esc', function () {
                        rollback();
                    });

                    // place the input just after de display element
                    element.after(inputFacet);

                    inputScope.$watch('edition', function (newEdition, oldEdition) {
                        if (newEdition !== oldEdition) {
                            if (newEdition) {
                                element.hide();
                                mtKeyboardShortcutManager.enterContext(keyboardShortcutContext);
                            } else {
                                mtKeyboardShortcutManager.leaveContext(keyboardShortcutContext);
                                element.show();
                            }
                        }
                    });

                    element.bind('click', function () {
                        inputScope.$apply(function () {
                            inputScope.edition = true;
                            inputScope.model = mtInlineEditGet(scope);
                        });
                    });
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

//    mt.MixTubeApp.directive('mtCarousel', function ($compile) {
//
//        var CAROUSEL_EXPRESSION_REGEXP = /^\s*(.+)\s+in\s+(.*?)\s*$/;
//
//        /**
//         * @param {string} expression
//         * @returns {{valueIdentifier: string, listIdentifier: string}}
//         */
//        function parseExpression(expression) {
//            var match = expression.match(CAROUSEL_EXPRESSION_REGEXP);
//            if (!match) {
//                throw new Error('Expected itemRepeat in form of "_item_ in _array_" but got "' + expression + '".');
//            }
//            return {
//                valueIdentifier: match[1],
//                listIdentifier: match[2]
//            };
//        }
//
//        return {
//            restrict: 'E',
//            replace: true,
//            transclude: true,
//            template: '<div class="mt-carousel-container">' +
//                '    <div class="mt-carousel-slider">' +
//                '        <div class="mt-carousel-list" ng-transclude></div>' +
//                '    </div>' +
//                '</div>',
//            controller: function () {
//                this.handleLinkers = [];
//                this.itemLinker = null;
//            },
//            compile: function (cElement, cAttr) {
//                var bucketTemplate = angular.element('<div class="mt-carousel-bucket" ng-repeat="' + cAttr.itemRepeat + '" ng-transclude></div>');
//
//                return function link(scope, element, attr, carouselCtrl) {
//                    var carouselElement = element;
//
//                    // no nice way to reuse "ng-repeat" logic so we copy it here
//                    var repeatExpression = attr.itemRepeat;
//                    var identifiers = parseExpression(repeatExpression);
//
//                    scope.$watchCollection(identifiers.listIdentifier, function () {
//                        // the content changed so we ensure that it is correctly displayed
//                        // the real construction of the list is by the carousel item
//                    });
//
//                    var bucketLinker = $compile(bucketTemplate, carouselCtrl.itemLinker);
//                    bucketLinker(scope, function (clone) {
////                        carouselElement.find('.mt-carousel-list');
//                        carouselElement.find('.mt-carousel-list').empty().append(clone);
//                    });
//                }
//            }
//        };
//    });

//    mt.MixTubeApp.directive('mtCarouselHandle', function () {
//        return {
//            restrict: 'A',
//            require: '^mtCarousel',
//            link: function (scope, element, attrs, mtCarouselCtrl) {
//                if (attrs.mtCarouselHandle === 'backward') {
//                    scope.handle = function () {
//                        mtCarouselCtrl.backward();
//                    };
//                } else if (attrs.mtCarouselHandle === 'forward') {
//                    scope.handle = function () {
//                        mtCarouselCtrl.forward();
//                    };
//                }
//            }
//        };
//    });

    mt.MixTubeApp.directive('mtCarousel', function ($compile) {

        var CAROUSEL_EXPRESSION_REGEXP = /^\s*(.+)\s+in\s+(.*?)\s*$/;

        /**
         * @param {string} expression
         * @returns {{valueIdentifier: string, listIdentifier: string}}
         */
        function parseExpression(expression) {
            var match = expression.match(CAROUSEL_EXPRESSION_REGEXP);
            if (!match) {
                throw new Error('Expected itemRepeat in form of "_item_ in _array_" but got "' + expression + '".');
            }
            return {
                valueIdentifier: match[1],
                listIdentifier: match[2]
            };
        }

        return {
            restrict: 'E',
            replace: true,
            transclude: 'element',
            template: '<div class="mt-carousel-container">' +
                '    <div class="mt-carousel-slider">' +
                '        <div class="mt-carousel-list" ng-transclude></div>' +
                '    </div>' +
                '</div>',
            controller: function () {
                this.handleLinkers = {};
                this.itemLinker = null;
            },
            compile: function (cElement, cAttr) {
                return function link(scope, element, attr, carouselCtrl) {
                    angular.forEach(carouselCtrl.handleLinkers, function (handleLinker) {
                        handleLinker(scope, function (handle) {
                            element.append(handle);
                        })
                    });

                    var bucketsLinker = $compile(
                        '<div class="mt-carousel-bucket" ng-repeat="' + cAttr.itemRepeat + '" ng-transclude></div>',
                        carouselCtrl.itemLinker
                    );
                    bucketsLinker(scope, function (buckets) {
                        element.find('.mt-carousel-list').append(buckets);
                    });
                }
            }
        };
    });


    mt.MixTubeApp.directive('mtCarouselHandle', function () {
        return {
            restrict: 'A',
            transclude: 'element',
            require: '^mtCarousel',
            compile: function (cElement, cAttr, cTransclude) {
                return function link(scope, element, attrs, carouselCtrl) {
                    carouselCtrl.handleLinkers[attrs.mtCarouselHandle] = cTransclude;
                };
            }
        };
    });

    mt.MixTubeApp.directive('mtCarouselItem', function () {
        return {
            restrict: 'A',
            transclude: 'element',
            require: '^mtCarousel',
            compile: function (cElement, cAttr, cTransclude) {
                return function link(scope, element, attr, carouselCtrl) {
                    carouselCtrl.itemLinker = cTransclude;
                    carouselCtrl.itemTemplate = cElement;
                }
            }
        };
    });

//    mt.MixTubeApp.directive('mtCarouselBringUpIf', function () {
//        return {
//            restrict: 'A',
//            require: '^mtCarousel',
//            link: function (scope, element, attrs, mtCarouselCtrl) {
//                scope.$watch(attrs.mtCarouselBringUpIf, function watchBringUpIf(bringUp) {
//                    if (bringUp) {
//                        mtCarouselCtrl.bringUp(element);
//                    }
//                });
//            }
//        };
//    });


//    mt.MixTubeApp.directive('mtCarouselItem', function ($compile) {
//        return {
//            restrict: 'A',
//            require: '^mtCarousel',
//            compile: function (cElement) {
//                return function link(scope, element, attr, carouselCtrl) {
//                    carouselCtrl.itemLinker = $compile(cElement);
////                    element.remove();
//                }
//            }
//        };
//    });

})(mt);