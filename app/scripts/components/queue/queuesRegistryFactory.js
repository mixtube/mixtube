'use strict';

function queuesRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('Queues');
}

module.exports = queuesRegistryFactory;
