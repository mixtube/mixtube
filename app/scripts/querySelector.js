'use strict';

var angular = require('angular');

/**
 * A query selector all that works with JQLite objects and DOM elements. It delegates to the native querySelectorAll method.
 *
 * This is required because the AngularJS version of "find" deals only with tag names and not with CSS selectors.
 *
 * @param {JQLite|Element} context
 * @param {string} selector the CSS selector
 * @returns {JQLite} the collection of matching elements
 */
function querySelector(context, selector) {
  if (context.bind && context.find) {
    // jQuery like context
    context = context[0];
  }

  return angular.element(context.querySelectorAll(selector));
}

module.exports = querySelector;