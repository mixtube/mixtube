(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtConfiguration', function ($location) {

        var locationSearch = $location.search();
        var debug = 'debug' in  locationSearch && locationSearch.debug.trim().length > 0 ?
            JSON.parse(locationSearch.debug) : {};

        return {
            get youtubeAPIKey() {
                return 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg';
            },
            get maxSearchResults() {
                return 20;
            },
            get debug() {
                return 'debug' in  locationSearch;
            },
            get fadeDuration() {
                return 'fade' in debug ? debug.fade : 5;
            },
            get autoEndCueTimeProvider() {
                if ('duration' in debug) {
                    return _.constant(debug.duration);
                } else {
                    var config = this;
                    return function (duration) {
                        // add a extra second to the fade duration to make sure the video didn't reach the end before
                        // the end of the transition
                        return duration - (config.fadeDuration + 1);
                    };
                }
            },
            get debugNotifications() {
                return 'notifications' in debug && debug.notifications === true;
            },
            get imgCache() {
                return !('imgCache' in debug && debug.imgCache === false);
            }
        };
    });
})(mt);