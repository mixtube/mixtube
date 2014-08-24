(function (mt) {
    'use strict';

    function CapabilitiesFactory($window, $rootScope) {

        var videoAutoplay = false;

        $window.Modernizr.on('videoautoplay', function (result) {
            $rootScope.$apply(function () {
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
             * @returns {boolean}
             */
            get playback() {
                return videoAutoplay;
            }
        };

        return Capabilities;
    }

    mt.MixTubeApp.factory('Capabilities', CapabilitiesFactory);
})(mt);