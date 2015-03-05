'use strict';

var pull = require('lodash/array/pull');

// brfs requires this to be on its own line
var fs = require('fs');

// @ngInject
function notificationCenterDirective(notificationCentersRegistry, directivesRegistryHelper) {

  return {
    restrict: 'E',
    template: fs.readFileSync(__dirname + '/notification.html', 'utf8'),
    controllerAs: 'notificationCenterCtrl',
    controller: /*@ngInject*/ function($scope, $element, $attrs) {

      function close(notification) {
        pull(notificationCenterCtrl.notifications, notification);
      }

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

      function activate() {
        directivesRegistryHelper.install(notificationCenterCtrl, notificationCentersRegistry, 'name', $scope,
          $attrs);
      }

      var notificationCenterCtrl = this;

      notificationCenterCtrl.notifications = [];

      notificationCenterCtrl.comingNext = comingNext;
      notificationCenterCtrl.error = error;
      // publish the close function to be used in the template
      notificationCenterCtrl.close = close;

      activate();
    }
  };
}

module.exports = notificationCenterDirective;