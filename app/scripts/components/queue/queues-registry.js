(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtQueuesRegistry', function (mtAsyncRegistryFactory) {
        return mtAsyncRegistryFactory('mtQueues');
    });

})(mt);
