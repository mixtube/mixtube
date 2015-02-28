'use strict';

function queuesRegistryFactory(AsyncRegistryFactory) {
  return AsyncRegistryFactory('Queues');
}

module.exports = queuesRegistryFactory;
