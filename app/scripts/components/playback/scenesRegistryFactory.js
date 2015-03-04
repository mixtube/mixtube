'use strict';

function scenesRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('Scenes');
}

module.exports = scenesRegistryFactory;
