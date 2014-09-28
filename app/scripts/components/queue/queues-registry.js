(function(mt) {
  'use strict';

  mt.MixTubeApp.factory('QueuesRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('Queues');
  });

})(mt);
