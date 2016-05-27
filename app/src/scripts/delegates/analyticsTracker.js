'use strict';

var noop = require('lodash/utility/noop');

module.exports = function analyticsTracker() {
  return {
    track: noop
  };
};
