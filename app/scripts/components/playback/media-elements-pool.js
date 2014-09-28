(function(mt) {
  'use strict';

  function MediaElementsPoolFactory(mtScenesRegistry) {

    var scene = null;
    mtScenesRegistry('scene').ready(function(newScene) {
      scene = newScene;
    });

    /**
     * @name MediaElementsPool
     */
    function MediaElementsPool(type) {

      if (type !== 'youtube') {
        throw new Error('Un-managed type of player: ' + type);
      }

      // no free player instance, create a new one
      var hostElement = scene.newHostElement();
      var mediaElement = Popcorn.HTMLYouTubeVideoElement(hostElement[0]);

      // hide and make the player silent at the beginning
      hostElement.css('opacity', 0);
      mediaElement.volume = 0;

      /**
       * @name mediaElementWrapper
       */
      var mediaElementWrapper = {
        _alive: true,

        _checkState: function() {
          if (!this._alive) {
            throw new Error('The media element pool-wrapper has been released already');
          }
        },

        get: function() {
          this._checkState();

          return mediaElement;
        },

        release: function() {
          this._checkState();

          hostElement.remove();
          this._alive = false;
        }
      };

      return mediaElementWrapper;
    }

    return MediaElementsPool;
  }

  mt.MixTubeApp.factory('MediaElementsPool', MediaElementsPoolFactory);

})(mt);