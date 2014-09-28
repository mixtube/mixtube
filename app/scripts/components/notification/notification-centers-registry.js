(function(mt) {
  'use strict';

  mt.MixTubeApp.factory('NotificationCentersRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('NotificationCenters');
  });

})(mt);
