(function (mt) {
    'use strict';

//    mt.MixTubeApp.controller('mtSearchResultCtrl', function ($scope, $timeout) {
//
//        $scope.searchResultProps = {confirmationShown: false, tmoPromise: null};
//
//        $scope.addItemToQueue = function () {
//            $scope.searchResultProps.confirmationShown = true;
//            $timeout.cancel($scope.searchResultProps.tmoPromise);
//            $scope.searchResultProps.tmoPromise = $timeout(function () {
//                $scope.searchResultProps.confirmationShown = false;
//            }, 4000);
//        }
//    });

//    mt.MixTubeApp.controller('mtBodyCtrl', function ($scope, $location) {
//
//        var _props = {
//            queueSize: 1,
//            queueItemsSrc: ['D874kQpNEpc', 'eU4ZvfkmOck', 'djE-BLrdDDc', 'jb6HZa151s8', 'a35rNEBNiO4', 'URpIzQedQio', '_sV0QuxOHoY'],
//            queueItems: []
//        };
//
//        $scope.props = {
//            showDebugBar: false,
//            showModal: false,
//            showNotification: false,
//            showSearch: false,
//            showChrome: false,
//            showPlayButton: true,
//            activeQueueItem: _props.queueItemsSrc[2],
//            get queueItems() {
//                return _props.queueItems;
//            }
//        };
//
//        $scope.toggleModal = function (lineCount) {
//            var lines = [0, 1, 2, 3, 4, 5, 6, 7];
//            $scope.props.modalLines = lines.slice(0, lineCount);
//            $scope.props.showModal = !$scope.props.showModal;
//        };
//
//        $scope.toggleNotification = function () {
//            $scope.props.showNotification = !$scope.props.showNotification;
//        };
//
//        $scope.toggleComingNext = function () {
//            $scope.props.showComingNext = !$scope.props.showComingNext;
//        };
//
//        $scope.toggleSearch = function () {
//            $scope.props.showSearch = !$scope.props.showSearch;
//            if ($scope.props.showSearch) {
//                $scope.props.showChrome = true;
//            }
//        };
//
//        $scope.appendQueueItem = function () {
//            _props.queueItems = _props.queueItemsSrc.slice(0, _props.queueSize++);
//        };
//
//        $scope.insertQueueItem = function () {
//            _props.queueItems.splice(1, 0, _props.queueItemsSrc[_props.queueSize++]);
//        };
//
//        $scope.removeQueueItem = function (queueItem) {
//            _props.queueItems.splice(_props.queueItems.indexOf(queueItem), 1);
//        };
//
//        $scope.switchActiveQueueItem = function () {
//            $scope.props.activeQueueItem
//                = $scope.props.activeQueueItem === _props.queueItemsSrc[2] ? _props.queueItemsSrc[4] : _props.queueItemsSrc[2];
//        };
//
//        $scope.toggleActivity = function () {
//            $scope.props.showChrome = !$scope.props.showChrome;
//        };
//
//        $scope.togglePlayButton = function () {
//            $scope.props.showPlayButton = !$scope.props.showPlayButton;
//        };
//
//        /**
//         * @returns {number} a "truthy" value means that we have to make sure given queue item is visible
//         */
//        $scope.shouldEnsureVisible = function (queueItem, isLast) {
//            // we return a number here to make sure the value change when the reason for making the element visible changes
//            // avoid the case where it was true before for another reason and say true but for the other reason
//            return isLast << 1 | queueItem === $scope.props.activeQueueItem;
//        };
//
//        $scope.$watch(function () {
//            return $location.search();
//        }, function (newSearch) {
//            $scope.props.showDebugBar = 'debug' in newSearch;
//        });
//
//        $scope.$watch('props.searchTerm', function (newVal) {
//            $scope.props.showSearch = !!newVal;
//        });
//    });

    /**
     * @ngdoc directive
     * @name mt.directive:mtMouseInteractionDetection
     * @restrict A
     *
     * Adds the specified class to the element when a mouse based interaction is detected.
     *
     * The detection mechanism is inspired by https://github.com/stucox/Modernizr/blob/hover/feature-detects/device/hover.js
     * where we try to detect two consecutive "mousemove" events without an intervening "mousedown" event. This sequence
     * is not possible with a touch (only) interaction based device.
     */
    mt.MixTubeApp.directive('mtMouseInteractionDetection', function () {
        return {
            restrict: 'A',
            link: function (iScope, iElement, iAttrs) {

                var className = iAttrs.mtMouseInteractionDetection;
                if (!className) throw new Error('mtMouseInteractionDetection require an attribute value');

                var mouseMoveCount = 0;

                function mouseDownHandler() {
                    mouseMoveCount = 0;
                }

                iElement
                    .on('mousedown', mouseDownHandler)
                    .on('mousemove', function mouseMoveHandler() {
                        if (++mouseMoveCount > 1) {
                            iElement
                                .off('mousedown', mouseDownHandler)
                                .off('mousemove', mouseMoveHandler);
                            iElement.addClass(className);
                        }
                    });
            }
        };
    });

    /**
     * @ngdoc directive
     * @name mt.directive:mtScrollable
     * @restrict A
     *
     * Declares a scrollable container that can be manipulated pragmatically thanks to {@link mtScrollablesManager}. The
     * attribute value is an unique name that is used to get the scrollable from {@link mtScrollablesManager}.
     *
     * An anchor string declared on children elements thanks to the "mt-scrollable-anchor" attribute can be then used
     * when calling {@link mtScrollablesManager.scrollable#ensureInViewPort(string)} to scroll until the child element
     * is visible.
     */
    mt.MixTubeApp.directive('mtScrollable', function ($window, $rootScope, mtScrollablesManager) {

        /**
         * A JS function equivalent of "cubic-bezier(.8, 0, .2, 1)"
         *
         * @constant
         */
        var EASE_IN_OUT = $window.BezierEasing(.8, 0, .2, 1);

        /**
         * @constant
         */
        var BASE_TRANSITION_DURATION = 200;

        return {
            restrict: 'A',
            controller: function ($scope, $element, $attrs) {

                var ctrl = this;
                var scrollView = $element;

//                mtScrollablesManager.register($attrs.mtScrollable, {
//                    ensureInViewPort: function (anchor) {
//                        // wait for the end of the next digest loop to make sure the insertion / removal of content is done
//                        $rootScope.$$postDigest(function () {
//                            var anchorElement = mt.tools.querySelector(scrollView, '[mt-scrollable-anchor=' + anchor + ']');
//                            var animationSemaphore = 0;
//
//                            function animateBefore() {
//                                animationSemaphore++;
//                            }
//
//                            function animateClose() {
//                                if (--animationSemaphore === 0) {
//                                    ctrl.ensureVisible(anchorElement);
//                                }
//                            }
//
//                            anchorElement
//                                .on('$animate:mtSized', function () {
//                                    ctrl.ensureVisible(anchorElement);
//                                });
////                                .on('$animate:close', animateClose);
//
//                            // $rootScope.$$postDigest(function () {
////                            setTimeout(function() {
////
////                                ctrl.ensureVisible(anchorElement);
////                            }, 1000);
//                            //});
//                        });
//                    }
//                });

                function transitionTiming(progress) {
                    return EASE_IN_OUT(progress);
                }

                function transitionScrollTop(scrollView, duration, scrollOffset) {
                    // store the scroll position at the beginning of the transition
                    var scrollStart = scrollView[0].scrollTop;

                    var startTs = null;
                    (function requestNextFrame() {
                        $window.requestAnimationFrame(function (frameTs) {
                            if (startTs === null) {
                                startTs = frameTs;
                            }

                            var progress = (frameTs - startTs) / duration;

                            if (progress > 0) {
                                var frameScrollOffset = scrollOffset * transitionTiming(progress);
                                scrollView[0].scrollTop = scrollStart + frameScrollOffset;
                            }

                            if (progress < 1) {
                                requestNextFrame();
                            }
                        });
                    })();
                }

                this.ensureVisible = function (target) {
                    var scrollViewRect = scrollView[0].getBoundingClientRect();
                    var targetRect = target[0].getBoundingClientRect();

                    var offset = 0;
                    if (targetRect.top < scrollViewRect.top) {
                        offset = targetRect.top - scrollViewRect.top;
                    } else if (scrollViewRect.bottom < targetRect.bottom) {
                        offset = targetRect.bottom - scrollViewRect.bottom;
                    }

                    if (offset !== 0) {
                        transitionScrollTop(scrollView, BASE_TRANSITION_DURATION, offset);
                    }
                }
            }
        };
    });

    /**
     * @ngdoc directive
     * @name mt.directive:mtSearchInput
     * @restrict A
     *
     * @description
     * A single usage directive that controls the sequencing of search input animation.
     *
     * Focus needs to be called inside a user initiated DOM event handler to show the virtual keyboard on mobile which
     * can't be guaranteed by AngularJS (because of the digestion loop).
     * On click on ".mt-search-input__button" we focus the real input first and then we start the animation of
     * ".mt-search-input". We are leveraging the regular ngHide animation so the required styles are the same.
     */
    mt.MixTubeApp.directive('mtSearchInput', function ($animate) {

        /**
         * @const
         * @type {string}
         */
        var NG_ACTIVE_CLASS_NAME = 'ng-click-active';

        return {
            restrict: 'A',
            link: function (iScope, iElement) {

                var searchInputForm = angular.element(iElement[0].querySelector('.mt-js-search-input__form'));
                var trigger = angular.element(iElement[0].querySelector('.mt-js-search-input__button'));
                var inputElmt = searchInputForm[0].querySelector('.mt-js-search-input__field');

                var hide = true;

                function sync() {
                    $animate[hide ? 'addClass' : 'removeClass'](searchInputForm, 'ng-hide');
                    inputElmt[hide ? 'blur' : 'focus']();
                }

                // we need to blur the field on form submit to hide the virtual keyboard on mobile
                searchInputForm.on('submit', function () {
                    inputElmt.blur();
                });

                // on mobile, focusing a field programatically only works from a click event handler dispatched directly by the browser
                trigger
                    .on('click', function () {
                        hide = !hide;
                        sync();
                    })
                    // simulates ngTouch behavior for active class
                    .on('touchstart', function () {
                        trigger.addClass(NG_ACTIVE_CLASS_NAME);
                    })
                    .on('touchend touchmove touchcancel', function () {
                        trigger.removeClass(NG_ACTIVE_CLASS_NAME);
                    });

                // sync at first rendering
                sync();
            }
        }
    });

    /**
     * @ngdoc animation
     * @name mt.animation:.mt-js-queue__entry__animation-repeat
     *
     * @description
     * A animation tailored for queue's items (enter and leave events).
     *
     * It actually doesn't rely on AngularJS for animation but instead use a custom mix of CSS transitions and JS sequencing.
     * The animation framework here is just used as an "event" system for us to be notified of new element insertion / removal.
     */
    mt.MixTubeApp.animation('.mt-js-queue__entry__animation-repeat', function ($window) {

        var SLICE_METHOD = [].slice;

        // a transition sequencing tool
        var TransitionsSequence = {

            _stages: null,

            get _currentStage() {
                return this._stages[this._stages.length - 1];
            },

            begin: function () {
                this._stages = [];
                return this.then();
            },

            then: function () {
                this._stages.push([]);
                return this;
            },

            end: function (element, doneCallback) {
                var sequence = this;

                // defined and execute the sequencing loop
                (function runNextStage() {
                    var stage = sequence._stages.shift();

                    // apply all defined stage's commands
                    stage.forEach(function (command) {
                        if ('method' in command && 'args' in command) {
                            element[command.method].apply(element, command.args);
                        } else if (angular.isFunction(command)) {
                            command();
                        }
                    });

                    var nextCallback = sequence._stages.length ? runNextStage : doneCallback;

                    // we try to get a transition duration since it is the only required property for valid transitions
                    // if there isn't computed duration it means this stage doesn't trigger any transition and that we have to use a "manual" progress
                    //
                    // WARNING: this detection is not perfect though because if the properties declared in the transition are not modified
                    // the transition won't be triggered then the "transitionend" event won't be triggered and we will get a never ending sequence.
                    // A better impl would make a diff between css property values before and after applying commands to check if it triggers the transiton
                    var transitionDefined = !!parseFloat($window.getComputedStyle(element[0]).getPropertyValue('transition-duration'));

                    if (transitionDefined) {
                        element.one('transitionend', nextCallback);
                    } else {
                        // "manual" stage progress
                        $window.requestAnimationFrame(nextCallback);
                    }
                })();
            },

            pushMethodCommand: function (name, args) {
                // make a defensive shallow copy of the given arguments object
                var argsCopy = SLICE_METHOD.call(args, 0);
                this._currentStage.push({method: name, args: argsCopy});
                return this;
            },

            addClass: function (classes) {
                return this.pushMethodCommand('addClass', arguments);
            },

            removeClass: function (classes) {
                return this.pushMethodCommand('removeClass', arguments);
            },

            css: function (name, value) {
                return this.pushMethodCommand('css', arguments);
            },

            exec: function (cb) {
                this._currentStage.push(cb);
                return this;
            }
        };

        // creates the params used by enter and leave method
        function buildParams(element) {
            // we might get a comment node as well here so we need to filter only the element
            element = element.eq(0);

            // we get the (floating point precision) height value just before the animation
            var nominalHeight = element[0].getBoundingClientRect().height;

            return {
                element: element,
                nominalHeight: nominalHeight
            };
        }

        // we use the animation just as a hook to be notified of the list (managed by "ng-repeat") modifications
        return {

            enter: function (element, done) {
                var params = buildParams(element);

                var ts = Object.create(TransitionsSequence);

                ts.begin().addClass('slidein-start grow-start'); // part of the begin stage

                ts.then().removeClass('grow-start')
                    .addClass('grow grow-end').css('height', params.nominalHeight + 'px');

                ts.then().exec(function () {
                    element.triggerHandler('$animate:mtSized');
                }).removeClass('grow grow-init').css('height', '').removeClass('slidein-start')
                    .addClass('slidein slidein-end');

                ts.then().removeClass('grow-end slidein slidein-end');

                // run the sequence
                ts.end(params.element, done);
            },

            leave: function (element, done) {
                var params = buildParams(element);

                var ts = Object.create(TransitionsSequence);

                ts.begin().addClass('slideout-start shrink-init').css('height', params.nominalHeight + 'px'); // part of the begin stage

                ts.then().addClass('slideout slideout-end');

                // reset the inline defined height so that the value declared in the stylesheet takes over and let the CSS magic happen
                ts.then().removeClass('slideout slideout-start').css('height', '')
                    .addClass('shrink shrink-end');

                // run the sequence
                ts.end(params.element, done);
            },

            move: function (element, done) {
                // move doesn't really make sense for the queue's animation
                done();
            }
        };
    });
})(mt);