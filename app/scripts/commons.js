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

function buildTimeString(date) {
  var dateParts = [date.getHours(), date.getMinutes(), date.getSeconds()];
  var dateStringBuffer = [];

  for (var idx = 0; idx < dateParts.length; idx++) {
    var dateStringPart = dateParts[idx].toString();
    if (dateStringPart.length < 2) {
      dateStringPart = '0' + dateStringPart;
    }
    dateStringBuffer.push(dateStringPart);
  }

  return dateStringBuffer.join(':');
}

exports.querySelector = querySelector;
exports.buildTimeString = buildTimeString;