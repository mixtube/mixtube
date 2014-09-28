(function(mt, undefined) {
  'use strict';

  function CapabilitiesFactory($rootScope, Configuration) {

    var videoAutoplay = undefined;

    Modernizr.on('videoautoplay', function(result) {
      $rootScope.$apply(function() {
        videoAutoplay = result;
      });
    });

    /**
     * @name Capabilities
     */
    var Capabilities = {
      /**
       * Is the current platform capable of acting as a playback device.
       *
       * This property is a combinations of multiple rules but the main one is "being able to auto play video".
       *
       * @returns {boolean|undefined}
       */
      get playback() {
        return Configuration.videoAutoplay !== null ? Configuration.videoAutoplay : videoAutoplay;
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

    return Capabilities;
  }

  mt.MixTubeApp.factory('Capabilities', CapabilitiesFactory);
})(mt);