'use strict';

module.exports = function errorsTracker() {
  return {
    track: console.error.bind(console)
  };
};
