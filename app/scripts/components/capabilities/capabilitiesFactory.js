'use strict';

// add delay before executing the video testing script to avoid false negative that can happen when the event loop is busy
// also it leaves time to the user before showing a modal
var VIDEO_AUTO_PLAY_TEST_DELAY = 2000;

// @ngInject
function capabilitiesFactory($rootScope, $document, $timeout, configuration) {

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

  // the video auto play test expects this property to be defined
  // the function is executed when the test script is loaded and ready to be executed
  global.onMtVideoAutoPlayTestReady = function(testVideoAutoPlayFn) {
    $timeout(function() {
      testVideoAutoPlayFn().then(function(result) {
        $rootScope.$apply(function() {
          videoAutoplay = !result;
        });
      });
    }, VIDEO_AUTO_PLAY_TEST_DELAY);
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