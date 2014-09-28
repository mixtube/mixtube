(function(mt) {
  'use strict';

  function mtCacheImgUrl(Configuration) {

    var imgCache = Configuration.imgCache;

    return function(url) {
      if (imgCache === false) {
        return (_.contains(url, '?') ? url + '&__' : url + '?__') + Date.now();
      }

      return url;
    }
  }

  // a filter that prevent image URLs to be cached if the debug configuration asks so (debug.imgCache) by appending a
  // timestamp to the url
  mt.MixTubeApp.filter('mtCacheImgUrl', mtCacheImgUrl);

})(mt);