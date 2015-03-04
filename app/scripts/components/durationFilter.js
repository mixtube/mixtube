'use strict';

var padLeft = require('lodash/string/padLeft');

// a duration formatter that takes a duration in milliseconds and returns a formatted duration like "h:mm"
function durationFilter() {
  // reuse the date object between invocation since it is only used as a formatting tool
  var singletonDate = new Date(0, 0, 0, 0, 0, 0, 0);
  // time that represent the absolute zero for date, all fields to zero
  // needs to be computed because of timezones differences
  var absoluteDateZero = singletonDate.getTime();

  return function(time) {
    if (isNaN(time)) {
      return '';
    }

    // reset the time to the zero to calculate durations
    singletonDate.setTime(absoluteDateZero);
    singletonDate.setMilliseconds(time);

    return (singletonDate.getHours() * 60 + singletonDate.getMinutes()).toString(10) + ':'  +
      padLeft(singletonDate.getSeconds().toString(10), 2, '0');
  };
}

module.exports = durationFilter;