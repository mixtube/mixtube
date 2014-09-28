(function(mt) {
  'use strict';

  mt.MixTubeApp.directive('mtNotificationCenter',
    function($timeout, mtNotificationCentersRegistry, DirectivesRegistryHelper) {

      return {
        restrict: 'E',
        templateUrl: '/scripts/components/notification/notification.html',
        controllerAs: 'notificationCenterCtrl',
        scope: {},
        controller: function($scope, $element, $attrs) {

          var notificationCenterCtrl = this;

          notificationCenterCtrl.notifications = [];

          notificationCenterCtrl.comingNext = comingNext;
          notificationCenterCtrl.error = error;
          // publish the close function to be used in the template
          notificationCenterCtrl.close = close;

          activate();

          /**
           * @param {Object} data the data structure passed to the template
           * @returns {Function} a callback to close the coming next notification
           */
          function comingNext(data) {
            var notification = {type: 'comingNext', data: data};
            notificationCenterCtrl.notifications.unshift(notification);
            return function() {
              close(notification);
            };
          }

          function error(message) {
            notificationCenterCtrl.notifications.unshift({type: 'error', data: {message: message}});
          }

          function close(notification) {
            _.pull(notificationCenterCtrl.notifications, notification);
          }

          function activate() {
            DirectivesRegistryHelper.install(
              notificationCenterCtrl, mtNotificationCentersRegistry, 'name', $scope, $attrs);
          }
        }
      };
    });
})(mt);