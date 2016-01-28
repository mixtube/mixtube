'use strict';

// @ngInject
function scenesRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('Scenes');
}

module.exports = scenesRegistryFactory;
