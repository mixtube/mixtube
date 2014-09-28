(function(mt) {
  'use strict';

  mt.MixTubeApp.factory('mtScenesRegistry', function(AsyncRegistryFactory) {
    return AsyncRegistryFactory('mtScenes');
  });

})(mt);