(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtConfiguration', function ($location) {

        var transitionStartTime = 'test.duration' in $location.search() ? parseInt($location.search()['test.duration'], 10) : -5000;

        return  {
            get transitionStartTime() {
                return transitionStartTime;
            },
            get transitionDuration() {
                return 5000;
            },
            get initialSearchOpen() {
                return 'test.searchOpen' in $location.search();
            },
            get youtubeAPIKey() {
                return 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg';
            },
            get maxSearchResults() {
                return 20;
            },
            get comingNextStartTime() {
                return transitionStartTime - 5000;
            },
            get comingNextDuration() {
                return 10000;
            }
        };
    });
})(mt);