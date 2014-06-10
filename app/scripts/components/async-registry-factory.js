(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtAsyncRegistryFactory', function ($cacheFactory, $q) {

        function locateDeferred(cache, key) {
            var deferred = cache.get(key);
            if (!deferred) {
                cache.put(key, deferred = $q.defer());
            }
            return deferred;
        }

        return function (cacheId) {
            var delegateCache = $cacheFactory(cacheId);

            function getter(name) {
                var deferred = locateDeferred(delegateCache, name);
                return {
                    ready: deferred.promise.then
                };
            }

            getter.register = function (name, value) {
                locateDeferred(delegateCache, name).resolve(value);
            };

            getter.unregister = function (name) {
                var deferred = delegateCache.get(name);
                if (deferred !== null) {
                    delegateCache.remove(name);
                    deferred.reject();
                }
            };

            return getter;
        };
    });
})(mt);