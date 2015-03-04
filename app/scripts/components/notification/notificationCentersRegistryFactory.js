'use strict';

function notificationCentersRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('NotificationCenters');
}

module.exports = notificationCentersRegistryFactory;
