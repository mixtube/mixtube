'use strict';

// @ngInject
function queuesRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('Queues');
}

module.exports = queuesRegistryFactory;
