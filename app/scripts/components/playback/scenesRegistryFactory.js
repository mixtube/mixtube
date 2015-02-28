'use strict';

function scenesRegistryFactory(AsyncRegistryFactory) {
  return AsyncRegistryFactory('Scenes');
}

module.exports = scenesRegistryFactory;
