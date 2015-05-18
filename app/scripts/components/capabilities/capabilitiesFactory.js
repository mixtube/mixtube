'use strict';

// @ngInject
function capabilitiesFactory($rootScope, $document, configuration) {

  var videoAutoplay;

  function loadScript(src) {
    var script = $document[0].createElement('script');
    script.src = src;
    script.async = true;
    $document[0].body.appendChild(script);
  }

  function activate() {
    loadScript('scripts/components/capabilities/videoAutoPlayTest.js');
  }

  global.onMtVideoAutoPlayTestReady = function(videoAutoPlayPromise) {
    videoAutoPlayPromise.then(function(result) {
      $rootScope.$apply(function() {
        videoAutoplay = result;
      });
    });
  };

  activate();

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