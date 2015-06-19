'use strict';

// @ngInject
function notificationCentersRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('NotificationCenters');
}

module.exports = notificationCentersRegistryFactory;
