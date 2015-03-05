'use strict';

var Modernizr = require('./customModernizr');

// @ngInject
function capabilitiesFactory($rootScope, configuration) {

  var videoAutoplay;

  // todo CommonJSify Modernizr
  Modernizr.on('videoautoplay', function(result) {
    $rootScope.$apply(function() {
      videoAutoplay = result;
    });
  });

  /**
   * @name capabilities
   */
  var capabilities = {
    /**
     * Is the current platform capable of acting as a playback device.
     *
     * This property is a combinations of multiple rules but the main one is "being able to auto play video".
     *
     * @returns {boolean|undefined}
     */
    get playback() {
      return configuration.videoAutoplay !== null ? configuration.videoAutoplay : videoAutoplay;
    },

    /**
     * Is the current platform capable of acting as controller for a remote playback device.
     *
     * @returns {boolean|undefined}
     */
    get remoteControl() {
      return false;
    }
  };

  return capabilities;
}

module.exports = capabilitiesFactory;