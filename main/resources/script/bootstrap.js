(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp = angular.module('mtMixTubeApp', [])
        .config(function ($provide, $locationProvider) {

//            $provide.factory('mtAnimationHooksManager', function () {
//                var hooks = {
//                    enter: {
//                        after: []
//                    }
//                };
//
//                return {
//                    get hooks() {
//                        return hooks;
//                    }
//                };
//            });
//
//            $provide.decorator('$animator', function InterceptingAnimatorServiceProvider($delegate, mtAnimationHooksManager) {
//                var animatorService = $delegate;
//
//                function InterceptingAnimatorService(scope, attrs) {
//                    var origAnimator = animatorService(scope, attrs);
//
//                    return angular.extend({}, origAnimator, {
//                        enter: function wrappedEnter(element, parent, after) {
//                            origAnimator.enter(element, parent, after);
//
//                            var afterEnterHooks = mtAnimationHooksManager.hooks.enter.after;
//                            for (var idx = 0; idx < afterEnterHooks.length; idx++) {
//                                var hook = afterEnterHooks[idx];
//                                hook(element);
//                            }
//                        }
//                    });
//                }
//
//                InterceptingAnimatorService.enabled = animatorService.enabled;
//
//                return InterceptingAnimatorService;
//            });

            // we want to be able to share URL between browsers that don't have the History API and the ones they have it
            // sadly, we need to deactivate HTML5 mode on location provider
            $locationProvider.html5Mode(false);
        });

    mt.events = {
        OpenSearchFrameRequest: 'OpenSearchFrameRequest',
        UpdateComingNextRequest: 'UpdateComingNextRequest'
    };

    mt.model = {
        Video: function () {
            /** @type {string} */
            this.id = null;
            /** @type {string} */
            this.title = null;
            /** @type {string} */
            this.thumbnailUrl = null;
            /** @type {number} */
            this.duration = null;
            /** @type {number} */
            this.viewCount = null;
            /** @type {string} */
            this.publisherName = null;
            /** @type {string} */
            this.provider = null;
        },
        QueueEntry: function () {
            /** @type {string} */
            this.id = null;
            /** @type {mt.model.Video} */
            this.video = null;
            /** @type {boolean} */
            this.skippedAtRuntime = false;
        },
        Queue: function () {
            /** @type {string} */
            this.name = null;
            /** @type {Array.<mt.model.QueueEntry} */
            this.entries = [];
        }
    };

    mt.tools = {};

    /**
     * Generates a "unique" id.
     *
     * @return {string}
     */
    mt.tools.uniqueId = function () {
        return _.uniqueId('mt_uid_');
    };

    /**
     * Pads a string to the left.
     *
     * @param string the string to pad
     * @param length the expected length after padding
     * @param padString the string to pad with
     * @return {string}
     */
    mt.tools.leftPad = function (string, length, padString) {
        if (!angular.isString(string)) throw new Error('The string parameter should be a string');

        while (string.length < length) {
            string = padString + string;
        }
        return string;
    };

    /**
     * Capitalize (first letter to uppercase) the given string.
     *
     * @param {string} string
     * @return {string}
     */
    mt.tools.capitalize = function (string) {
        if (!angular.isString(string)) throw new Error('The string parameter should be a string');

        return string.substr(0, 1).toUpperCase() + string.substr(1);
    };

    /**
     * A basic inbetweening tool.
     *
     * Interpolates properties of the "from / to" objects in a linear fashion and call a function with the intermediates
     * value.
     *
     * @param {{target: function(Object), from: Object, to: Object, duration: number, complete: function}} options
     * @returns {{play: function, pause: function}} the tween with play and pause methods
     */
    mt.tools.tween = function (options) {

        // a robust animation timing function copied from https://gist.github.com/paulirish/1579671
        // can't use requestAnimationFrame because we want the animation to continue even when the tab or window is focused out
        var lastTime = 0;

        function enqueueFrame(callback) {
            var currTime = Date.now();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        }

        function cancelFrame(id) {
            window.clearTimeout(id);
        }

        var startedTimestamp;
        var lastPauseTimestamp;
        var pausedDuration = 0;
        var values = Object.create(options.from);

        // calculates the delta for each properties
        var deltas = {};
        for (var propertyName in  options.from) {
            deltas[propertyName] = options.to[propertyName] - options.from[propertyName];
        }

        var nextFrameId;

        return {
            play: function () {
                if (!startedTimestamp) {
                    // first start call
                    startedTimestamp = Date.now();
                    // init values
                    options.target(values);
                } else {
                    // resume after a pause
                    pausedDuration += Date.now() - lastPauseTimestamp;

                }

                nextFrameId = enqueueFrame(function frame(timestamp) {
                    var progress = (timestamp - startedTimestamp - pausedDuration) / options.duration;

                    var reachedEnd = progress >= 1;
                    if (!reachedEnd) {
                        for (var propertyName in  options.from) {
                            values[propertyName] = options.from[propertyName] + progress * deltas[propertyName];
                        }
                        nextFrameId = enqueueFrame(frame);
                    } else {
                        // finish with final values
                        values = Object.create(options.to);
                    }

                    options.target(values);

                    if (reachedEnd) {
                        options.complete();
                    }
                });

                return this;
            },
            pause: function () {
                lastPauseTimestamp = Date.now();
                cancelFrame(nextFrameId);
                return this;
            }
        };
    };

})(window.mt = window.mt || {});