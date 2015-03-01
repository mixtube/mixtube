'use strict';

var pull = require('lodash/array/pull');

// brfs requires this to be on its own line
var fs = require('fs');

function notificationCenterDirective(NotificationCentersRegistry, DirectivesRegistryHelper) {

  return {
    restrict: 'E',
    template: fs.readFileSync(__dirname + '/notification.html', 'utf8'),
    controllerAs: 'notificationCenterCtrl',
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
        return function closeComingNext() {
          close(notification);
        };
      }

      function error(message) {
        notificationCenterCtrl.notifications.unshift({type: 'error', data: {message: message}});
      }

      function close(notification) {
        pull(notificationCenterCtrl.notifications, notification);
      }

      function activate() {
        DirectivesRegistryHelper.install(notificationCenterCtrl, NotificationCentersRegistry, 'name', $scope,
          $attrs);
      }
    }
  };
}

module.exports = notificationCenterDirective;