(function(mt) {
    'use strict';

    mt.MixTubeApp.factory('mtNotificationCentersRegistry', function(AsyncRegistryFactory) {
        return AsyncRegistryFactory('mtNotificationCenters');
    });

})(mt);
