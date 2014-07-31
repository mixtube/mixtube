(function (mt) {
    'use strict';

    // a filter that prevent image URLs to be cached if the debug configuration asks so (debug.imgCache) by appending a
    // timestamp to the url
    mt.MixTubeApp.filter('mtCacheImgUrl', function (mtConfiguration) {

        var imgCache = mtConfiguration.imgCache;

        return function (url) {
            if (imgCache) {
                return url;
            }

            return (_.contains(url, '?') ? url + '&__' : url + '?__') + Date.now();
        }
    });
})(mt);