'use strict';

var has = require('lodash/object/has'),
  isUndefined = require('lodash/lang/isUndefined');

// @ngInject
function configurationFactory($location) {

  var locationSearch = $location.search();
  var debug = has(locationSearch, 'debug') && locationSearch.debug.trim().length > 0;
  var debugParams = debug ? JSON.parse(locationSearch.debug) : {};

  function undefinedToNullOrValue(value) {
    return isUndefined(value) ? null : value;
  }

  /**
   * @typedef {Object} configuration
   */
  var configuration = {
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
    get mediaDuration() {
      return parseInt(debugParams.duration, 10);
    },

    /**
     * @returns {?boolean}
     */
    get videoAutoplay() {
      return undefinedToNullOrValue(debugParams.videoAutoplay);
    },

    /**
     * @returns {boolean}
     */
    get forceChrome() {
      return !!debugParams.forceChrome;
    }
  };

  return configuration;
}

module.exports = configurationFactory;