'use strict';

var noop = require('lodash/noop');

module.exports = function analyticsTracker() {
  return {
    track: noop
  };
};
