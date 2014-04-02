(function (mt) {
    'use strict';

    /**
     * @typedef {Object} mtMediaElementWrapper
     * @property {function(): jqLite} get
     * @property {function} release
     */

    mt.MixTubeApp.factory('mtMediaElementsPool', function (mtScenesRegistry) {

        var _scene = null;
        mtScenesRegistry('scene').ready(function (scene) {
            _scene = scene;
        });

        return function (type) {

            if (type !== 'youtube') {
                throw new Error('Unmanaged type of player: ' + type);
            }

            // no free player instance, create a new one
            var hostElement = _scene.newHostElement();
            var mediaElement = Popcorn.HTMLYouTubeVideoElement(hostElement[0]);

            // hide and make the player silent at the beginning
            hostElement.css('opacity', 0);
            mediaElement.volume = 0;

            return {
                _alive: true,

                _checkState: function () {
                    if (!this._alive) {
                        throw new Error('The media element pool-wrapper has been released already');
                    }
                },

                get: function () {
                    this._checkState();

                    return mediaElement;
                },

                release: function () {
                    this._checkState();

                    hostElement.remove();
                    this._alive = false;
                }
            };
        };
    })
})(mt);