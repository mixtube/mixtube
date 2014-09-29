(function() {
  'use strict';

  angular.module('Mixtube').factory('SearchInputsRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('SearchInputs');
  });

})();