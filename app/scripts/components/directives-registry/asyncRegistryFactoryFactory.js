'use strict';

// @ngInject
function asyncRegistryFactoryFactory($cacheFactory, $q) {

  function locateDeferred(cache, key) {
    var deferred = cache.get(key);
    if (!deferred) {
      cache.put(key, deferred = $q.defer());
    }
    return deferred;
  }

  /**
   * @name asyncRegistryFactory
   * @param {string} cacheId
   * @returns {asyncRegistry}
   */
  function asyncRegistryFactory(cacheId) {
    var delegateCache = $cacheFactory(cacheId);

    /**
     * @name asyncRegistry
     * @param {string} name
     * @returns {{ready: function(function)}}
     */
    function asyncRegistry(name) {
      var deferred = locateDeferred(delegateCache, name);
      return {
        ready: function(readyFn) {
          deferred.promise.then(readyFn);
        }
      };
    }

    asyncRegistry.register = function(name, value) {
      locateDeferred(delegateCache, name).resolve(value);
    };

    asyncRegistry.unregister = function(name) {
      var deferred = delegateCache.get(name);
      if (deferred !== null) {
        delegateCache.remove(name);
        deferred.reject();
      }
    };

    return asyncRegistry;
  }

  return asyncRegistryFactory;
}

module.exports = asyncRegistryFactoryFactory;