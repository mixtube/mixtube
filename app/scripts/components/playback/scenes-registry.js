(function() {
  'use strict';

  angular.module('Mixtube').factory('ScenesRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('Scenes');
  });

})();