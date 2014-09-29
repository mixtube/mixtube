(function(mt) {
  'use strict';

  /**
   * Pads a string to the left.
   *
   * @param string the string to pad
   * @param length the expected length after padding
   * @param padString the string to pad with
   * @return {string}
   */
  function leftPad(string, length, padString) {
    if (!angular.isString(string)) {
      throw new Error('The string parameter should be a string');
    }

    while (string.length < length) {
      string = padString + string;
    }
    return string;
  }

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


  mt.commons = {};
  mt.commons.leftPad = leftPad;
  mt.commons.querySelector = querySelector;
  mt.commons.buildTimeString = buildTimeString;

})(mt);