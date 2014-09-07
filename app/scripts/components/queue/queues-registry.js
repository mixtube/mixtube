(function(mt) {
    'use strict';

    mt.MixTubeApp.factory('mtQueuesRegistry', function(AsyncRegistryFactory) {
        return AsyncRegistryFactory('mtQueues');
    });

})(mt);
