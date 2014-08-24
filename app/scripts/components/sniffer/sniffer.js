(function (mt) {
    'use strict';

    function SnifferFactory($window, $rootScope) {

        var videoAutoplay = false;

        $window.Modernizr.on('videoautoplay', function (result) {
            $rootScope.$apply(function () {
                videoAutoplay = result;
            });
        });

        /**
         * @name Sniffer
         */
        var Sniffer = {
            get videoAutoplay() {
                return videoAutoplay;
            }
        };

        return Sniffer;
    }

    mt.MixTubeApp.factory('Sniffer', SnifferFactory);
})(mt);