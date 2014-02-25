(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtMediaElementsPool', function (mtScenesRegistry) {

        var availableMediaElementByType = {youtube: []};

        var _scene = null;
        mtScenesRegistry('scene').ready(function (scene) {
            _scene = scene;
        });

        return function (type) {

            if (!(type in availableMediaElementByType)) {
                throw new Error('Unmanaged type of player: ' + type);
            }

            var players = availableMediaElementByType[type];

            var mediaElement = null;
            if (players.length === 0) {
                // no free player instance, create a new one
                mediaElement = Popcorn.HTMLYouTubeVideoElement(_scene.newHostElement()[0]);
            } else {
                mediaElement = players.pop();
            }

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

                    // put the media element back in the pool
                    players.push(mediaElement);
                    this._alive = false;
                }
            };
        };
    })
})(mt);