'use strict';

// add delay before executing the video testing script to avoid false negative that can happen when the event loop is busy
// also it leaves time to the user before showing a modal
var VIDEO_CALL_PLAY_TEST_DELAY = 500;

// @ngInject
function capabilitiesFactory($rootScope, $document, $timeout, configuration) {

  var videoCallPlay;

  function loadScript(src) {
    var script = $document[0].createElement('script');
    script.src = src;
    script.async = true;
    $document[0].body.appendChild(script);
  }

  function activate() {
    loadScript('components/capabilities/videoCallPlayTest.js');
  }

  // the video auto play test expects this property to be defined
  // the function is executed when the test script is loaded and ready to be executed
  global.onMtVideoCallPlayTestReady = function(testVideoCallPlayFn) {
    $timeout(function() {
      testVideoCallPlayFn().then(function(result) {
        $rootScope.$apply(function() {
          videoCallPlay = result;
        });
      });
    }, VIDEO_CALL_PLAY_TEST_DELAY);
  };

  activate();

  /**
   * @name capabilities
   */
  var capabilities = {
    /**
     * Is the current platform capable of acting as a playback device.
     *
     * This property is a combinations of rules but the main one is "being able to play video without user intervention".
     *
     * @returns {boolean|undefined}
     */
    get playback() {
      return configuration.videoAutoplay !== null ? configuration.videoAutoplay : videoCallPlay;
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