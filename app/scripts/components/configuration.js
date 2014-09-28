(function(mt) {
  'use strict';

  function ConfigurationFactory($location) {

    var locationSearch = $location.search();
    var debug = _.has(locationSearch, 'debug') && locationSearch.debug.trim().length > 0;
    var debugParams = debug ? JSON.parse(locationSearch.debug) : {};

    function undefinedToNullOrValue(value) {
      return _.isUndefined(value) ? null : value;
    }

    /**
     * @name Configuration
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
        return _.has(debugParams, 'fade') ? debugParams.fade : 5;
      },
      get autoEndCueTimeProvider() {
        if (_.has(debugParams, 'duration')) {
          return _.constant(debugParams.duration);
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
       * @returns {boolean|null}
       */
      get debugNotifications() {
        return undefinedToNullOrValue(debugParams.notifications);
      },

      /**
       * @returns {boolean|null}
       */
      get imgCache() {
        return undefinedToNullOrValue(debugParams.imgCache);
      },

      /**
       * @returns {boolean|null}
       */
      get videoAutoplay() {
        return undefinedToNullOrValue(debugParams.videoAutoplay);
      }
    };

    return Configuration;
  }

  mt.MixTubeApp.factory('Configuration', ConfigurationFactory);
})(mt);