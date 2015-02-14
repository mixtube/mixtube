'use strict';

var has = require('lodash/object/has'),
  isUndefined = require('lodash/lang/isUndefined'),
  constant = require('lodash/utility/constant');

function configurationFactory($location) {

  var locationSearch = $location.search();
  var debug = has(locationSearch, 'debug') && locationSearch.debug.trim().length > 0;
  var debugParams = debug ? JSON.parse(locationSearch.debug) : {};

  function undefinedToNullOrValue(value) {
    return isUndefined(value) ? null : value;
  }

  /**
   * @typedef {Object} Configuration
   */
  var Configuration = {
    get youtubeAPIKey() {
      return 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg';
    },
    get maxSearchResults() {
      return 20;
    },
    get debug() {
      return debug;
    },
    get fadeDuration() {
      return has(debugParams, 'fade') ? debugParams.fade : 5;
    },
    get autoEndCueTimeProvider() {
      if (has(debugParams, 'duration')) {
        return constant(debugParams.duration);
      } else {
        var config = this;
        return function(duration) {
          // add a extra second to the fade duration to make sure the video didn't reach the end before
          // the end of the transition
          return duration - (config.fadeDuration + 1);
        };
      }
    },

    /**
     * @returns {?boolean}
     */
    get debugNotifications() {
      return undefinedToNullOrValue(debugParams.notifications);
    },

    /**
     * @returns {?boolean}
     */
    get videoAutoplay() {
      return undefinedToNullOrValue(debugParams.videoAutoplay);
    }
  };

  return Configuration;
}

module.exports = configurationFactory;