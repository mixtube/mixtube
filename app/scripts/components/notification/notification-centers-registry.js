(function() {
  'use strict';

  angular.module('Mixtube').factory('NotificationCentersRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('NotificationCenters');
  });

})();
