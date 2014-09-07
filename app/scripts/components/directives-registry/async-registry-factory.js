(function(mt) {
    'use strict';

    var AsyncRegistryFactoryFactory = function($cacheFactory, $q) {

        function locateDeferred(cache, key) {
            var deferred = cache.get(key);
            if (!deferred) {
                cache.put(key, deferred = $q.defer());
            }
            return deferred;
        }

        /**
         * @name AsyncRegistryFactory
         * @param {string} cacheId
         * @returns {AsyncRegistry}
         */
        function AsyncRegistryFactory(cacheId) {
            var delegateCache = $cacheFactory(cacheId);

            /**
             * @name AsyncRegistry
             * @param {string} name
             * @returns {{ready: function(function)}}
             */
            function AsyncRegistry(name) {
                var deferred = locateDeferred(delegateCache, name);
                return {
                    ready: function(readyFn) {
                        deferred.promise.then(readyFn);
                    }
                };
            }

            AsyncRegistry.register = function(name, value) {
                locateDeferred(delegateCache, name).resolve(value);
            };

            AsyncRegistry.unregister = function(name) {
                var deferred = delegateCache.get(name);
                if (deferred !== null) {
                    delegateCache.remove(name);
                    deferred.reject();
                }
            };

            return AsyncRegistry;
        }

        return AsyncRegistryFactory;
    };

    mt.MixTubeApp.factory('AsyncRegistryFactory', AsyncRegistryFactoryFactory);
})(mt);