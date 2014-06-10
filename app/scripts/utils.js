(function (mt) {
    'use strict';

    mt.utils = {};

    /**
     * Pads a string to the left.
     *
     * @param string the string to pad
     * @param length the expected length after padding
     * @param padString the string to pad with
     * @return {string}
     */
    mt.utils.leftPad = function (string, length, padString) {
        if (!angular.isString(string)) throw new Error('The string parameter should be a string');

        while (string.length < length) {
            string = padString + string;
        }
        return string;
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
    mt.utils.querySelector = function (context, selector) {
        if (context.bind && context.find) {
            // jQuery like context
            context = context[0];
        }

        return angular.element(context.querySelectorAll(selector));
    };

})(mt);