'use strict';

function notificationCentersRegistryFactory(AsyncRegistryFactory) {
  return AsyncRegistryFactory('NotificationCenters');
}

module.exports = notificationCentersRegistryFactory;
