(function() {
  'use strict';

  angular.module('Mixtube').factory('QueuesRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('Queues');
  });

})();
