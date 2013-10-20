(function (mt) {
    'use strict';

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
     * A query selector all that works with JQLite objects and DOM elements. It delegates to the native querySelectorAll method.
     *
     * This is required because the AngularJS version of "find" deals only with tag names and not with CSS selectors.
     *
     * @param {JQLite|Element} context
     * @param {string} selector the CSS selector
     * @returns {JQLite} the collection of matching elements
     */
    mt.tools.querySelector = function (context, selector) {
        if (context.bind && context.find) {
            // jQuery like context
            context = context[0];
        }

        return angular.element(context.querySelectorAll(selector));
    };

    /**
     * A basic inbetweening tool.
     *
     * Interpolates properties of the "from / to" objects in a linear fashion and call a function with the intermediates
     * value.
     *
     * @param {{target: function(Object), from: Object, to: Object, duration: number, complete: function=, useRAF: boolean=}} options
     * @returns {{play: function, pause: function}} the tween with play and pause methods
     */
    mt.tools.tween = function (options) {

        var useRAF = options.useRAF && 'requestAnimationFrame' in window;

        var nextFrame = (function () {
            if (useRAF) {
                return window.requestAnimationFrame;
            } else {
                // a robust animation timing function copied from https://gist.github.com/paulirish/1579671
                // can't use requestAnimationFrame because we want the animation to continue even when the tab or window is focused out
                var lastTime = 0;
                return function (callback) {
                    var currTime = Date.now();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function () {
                            callback(currTime + timeToCall);
                        },
                        timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                }
            }
        })();

        var cancelNextFrame = useRAF ? window.cancelRequestAnimationFrame : window.clearTimeout;

        var firstExecutedFrameTs = null;
        var lastExecutedFrameTs = null;
        var pausedDuration = 0;
        var values = Object.create(options.from);

        // calculates the delta for each properties
        var deltas = {};
        for (var propertyName in  options.from) {
            deltas[propertyName] = options.to[propertyName] - options.from[propertyName];
        }

        var nextFrameId = null;

        return {
            play: function () {

                // if we are here with a set firstExecutedFrameTs it means it's a resume after a pause
                var resume = firstExecutedFrameTs != null;

                nextFrameId = nextFrame(function frame(frameTs) {
                    if (!firstExecutedFrameTs) {
                        // first start call
                        firstExecutedFrameTs = frameTs;
                    } else if (resume) {
                        // resume after a pause
                        pausedDuration += frameTs - lastExecutedFrameTs;
                    }

                    var progress;
                    if (options.duration <= 0) {
                        progress = 1;
                    } else {
                        progress = (frameTs - firstExecutedFrameTs - pausedDuration) / options.duration;
                    }

                    var reachedEnd = progress >= 1;
                    if (!reachedEnd) {
                        for (var propertyName in  options.from) {
                            values[propertyName] = options.from[propertyName] + progress * deltas[propertyName];
                        }
                        nextFrameId = nextFrame(frame);
                    } else {
                        // finish with final values
                        values = Object.create(options.to);
                    }

                    options.target(values);

                    if (reachedEnd && options.hasOwnProperty('complete')) {
                        options.complete();
                    }

                    lastExecutedFrameTs = frameTs;
                });

                return this;
            },

            pause: function () {
                cancelNextFrame(nextFrameId);
                return this;
            }
        };
    };
})(mt);