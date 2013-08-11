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

    mt.MixTubeApp.directive('mtCarousel', function ($rootScope, $window, $timeout) {

        var CAROUSEL_EXPRESSION_REGEXP = /^\s*(.+)\s+in\s+(.*?)\s*$/;
        var CSS_PREFIXES = ['-webkit-', ''];
        var EASE_IN_OUT_QUART = 'cubic-bezier(.77,0,.175,1)';

        /**
         * @param {string} expression
         * @returns {{valueIdentifier: string, listIdentifier: string}}
         */
        function parseRepeatExpression(expression) {
            var match = expression.match(CAROUSEL_EXPRESSION_REGEXP);
            if (!match) {
                throw new Error('Expected itemRepeat in form of "_item_ in _array_" but got "' + expression + '".');
            }
            return {
                valueIdentifier: match[1],
                listIdentifier: match[2]
            };
        }

        /**
         * @param {jQuery} target
         * @param {function()} callback
         * @returns {{disconnect: function()}}
         */
        function observeChildList(target, callback) {
            if (window.hasOwnProperty('MutationObserver')) {
                return new MutationObserver(function () {
                    $rootScope.$apply(function () {
                        callback();
                    });
                }).observe(target[0], { childList: true });
            } else {
                // only IE10 in the range of supported browsers
                // todo remove once IE11 has been released
                target.bind('DOMNodeInserted.mtCarousel DOMNodeRemoved.mtCarousel', function () {
                    // we need to let time for the node to be rendered before calling the callback
                    $timeout(function () {
                        callback();
                    }, 0);
                });

                return {
                    disconnect: function () {
                        target.unbind('DOMNodeInserted.mtCarousel DOMNodeRemoved.mtCarousel');
                    }
                };
            }
        }

        return {
            restrict: 'E',
            replace: true,
            transclude: 'element',
            scope: true,
            template: function (tElement, tAttr) {
                return '<div class="mt-carousel-container">' +
                    '    <div class="mt-carousel-slider">' +
                    '        <div class="mt-carousel-list">' +
                    '            <div class="mt-carousel-bucket js-mt-carousel-item-bucket" ng-repeat="' + tAttr.bucketsRepeat + '" ' +
                    '                 mt-internal-bring-bucket-up-when="' + tAttr.bringBucketUpWhen + '" ' +
                    '                 ng-animate="' + tAttr.bucketsAnimate + '"></div>' +
                    '            <div class="mt-carousel-bucket js-mt-carousel-remainder-bucket"></div>' +
                    '        </div>' +
                    '    </div>' +
                    '</div>';
            },
            controller: function ($scope, $element) {

                var self = this;
                var carousel = $element;
                var slider = carousel.find('.mt-carousel-slider');
                var savedList = [];

                // allows to animate the slider
                CSS_PREFIXES.forEach(function (prefix) {
                    slider.css(prefix + 'transition', prefix + 'transform .5s ' + EASE_IN_OUT_QUART);
                });

                $scope.backwardAvailable = false;
                $scope.forwardAvailable = false;

                /**
                 * Pick the best carousel bucket available around the given x position.
                 *
                 * @param {number} x the position
                 * @returns {HTMLElement} the item at the position or undefined if none found
                 */
                function rawBucketFromPosition(x) {
                    return _.findWhere(carousel.find('.mt-carousel-bucket'), function (bucket) {
                        var bucketRect = bucket.getBoundingClientRect();
                        if (x > 0) {
                            // in forward we want the half visible bucket at the very right
                            // means the first bucket where the right edge position is higher that the looked for position
                            return x < bucketRect.right;
                        } else {
                            // in backward we want the fully visible bucket at 1 view port width distance from the left
                            // means the first bucket where the left edge position is higher that the looked for position
                            return x < bucketRect.left;
                        }
                    });
                }

                function page(forward) {
                    // works because the carousel is full width
                    var toBringUp = rawBucketFromPosition(carousel[0].getBoundingClientRect().width * (forward ? 1 : -1));
                    if (toBringUp) {
                        self.bringUp(angular.element(toBringUp));
                    }
                }

                function computeHandlesAvailability() {
                    var sliderRect = slider[0].getBoundingClientRect();
                    var carouselRect = carousel[0].getBoundingClientRect();

                    $scope.backwardAvailable = sliderRect.left < carouselRect.left;
                    $scope.forwardAvailable = carouselRect.right < sliderRect.right;
                }

                self.computeSizeRelated = function () {
                    computeHandlesAvailability();
                };

                self.bucketsUpdated = function (newList) {
                    if (angular.isArray(newList)) {
                        if (savedList.length < newList.length) {
                            // some buckets were added, we want to detect the index of the first one
                            // bellow the proper way to do it but because we now that we only add bucket at the end

                            var addedBucketIndex = -1;
                            for (var idx = 0; idx < savedList.length; idx++) {
                                if (savedList[idx] !== newList[idx]) {
                                    // found a different, save the index and break
                                    addedBucketIndex = idx;
                                    break;
                                }
                            }
                            if (addedBucketIndex === -1) {
                                // unsuccessful search means the new bucket is in the not yet explored part of the new list
                                addedBucketIndex = savedList.length;
                            }

                            // the bucket has been just added bring it up
                            self.bringUp(carousel.find('.mt-carousel-bucket').eq(addedBucketIndex));
                        }

                        // shallow copy the list for next change detection
                        savedList = newList.slice();
                    }
                };

                self.bringUp = function (toBringUp) {
                    var viewPortRect = carousel[0].getBoundingClientRect();
                    var toBringUpRect = toBringUp[0].getBoundingClientRect();

                    if (toBringUpRect.left < viewPortRect.left || viewPortRect.right < toBringUpRect.right) {
                        // the element to bring up is outside of the view port
                        // we want to make it the first visible item in the view port
                        var sliderRect = slider[0].getBoundingClientRect();
                        var newPosition = sliderRect.left - toBringUpRect.left;

                        CSS_PREFIXES.forEach(function (prefix) {
                            slider.css(prefix + 'transform', 'translateX(' + newPosition + 'px)');
                        });

                        // listen for end of transition to compute handles availability
                        slider.one('transitionend.mtCarousel', function () {
                            $scope.$apply(function () {
                                computeHandlesAvailability();
                            });
                        });

                    }
                };

                self.backward = function () {
                    page(false);
                };

                self.forward = function () {
                    page(true);
                };
            },
            compile: function (tElement, tAttr, originalLinker) {
                // we get the original directive outer HTML by executing the linker on a empty scope
                var tOriginal = originalLinker($rootScope.$new(true));
                var tHandles = tOriginal.find('handle');
                var tRenderer = tOriginal.find('renderer');
                var tRemainder = tOriginal.find('remainder');

                tElement.append(tHandles.contents());
                tElement.find('.js-mt-carousel-item-bucket').append(tRenderer.contents());
                tElement.find('.js-mt-carousel-remainder-bucket').append(tRemainder.contents());

                return function link(scope, element, attr, carouselCtrl) {
                    // react to items list changes
                    var identifiers = parseRepeatExpression(attr.bucketsRepeat);

                    scope.$watchCollection(identifiers.listIdentifier, function (newList) {
                        // works only with list of bucket
                        carouselCtrl.bucketsUpdated(newList);
                    });

                    // react to window resizing
                    var window = angular.element($window);
                    window.bind('resize.mtCarousel', _.debounce(function () {
                        scope.$apply(function () {
                            carouselCtrl.computeSizeRelated();
                        });
                    }, 100));

                    // react to bucket insertion/removal
                    var bucketListObserver = observeChildList(element.find('.mt-carousel-list'), function () {
                        carouselCtrl.computeSizeRelated();
                    });

                    scope.$on('$destroy', function () {
                        window.unbind('resize.mtCarousel');
                        bucketListObserver.disconnect();
                    });

                    // methods that can be used by sub components
                    scope.backward = function () {
                        carouselCtrl.backward();
                    };
                    scope.forward = function () {
                        carouselCtrl.forward();
                    };
                }
            }
        };
    });

    mt.MixTubeApp.directive('mtInternalBringBucketUpWhen', function () {
        return {
            restrict: 'A',
            require: '^mtCarousel',
            link: function (scope, element, attrs, carouselCtrl) {
                scope.$watch(attrs.mtInternalBringBucketUpWhen, function watchBringUpIf(bringUp) {
                    if (bringUp) {
                        carouselCtrl.bringUp(element);
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