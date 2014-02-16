(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtPromisesCacheFactory', function ($cacheFactory, $q) {
        return function (cacheId) {
            var delegateCache = $cacheFactory(cacheId);

            function locateDeferred(key) {
                var deferred = delegateCache.get(key);
                if (deferred === null) {
                    delegateCache.put(key, deferred = $q.defer());
                }
                return deferred;
            }

            return {
                get: function (key) {
                    return locateDeferred(key).promise;
                },

                put: function (key, value) {
                    locateDeferred(key).resolve(value);
                }
            };
        };
    })


})(mt);