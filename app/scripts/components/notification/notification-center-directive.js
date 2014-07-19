(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtNotificationCenter', function ($timeout, mtNotificationCentersRegistry, mtDirectivesRegistryHelper) {

        return {
            restrict: 'E',
            templateUrl: '/scripts/components/notification/notification.html',
            replace: true,
            scope: {
            },
            controller: function ($scope, $element, $attrs) {

                mtDirectivesRegistryHelper.install(this, mtNotificationCentersRegistry, 'name', $scope, $attrs);

                function close(notification) {
                    _.pull($scope.notifications, notification);
                }

                $scope.notifications = [];
                // publish the close function to be used in the template
                $scope.close = close;

                this.error = function (message) {
                    $scope.notifications.unshift({type: 'error', data: {message: message}});
                };

                /**
                 * @param {Object} data the data structure passed to the template
                 * @returns {Function} a callback to close the coming next notification
                 */
                this.comingNext = function (data) {
                    var notification = {type: 'comingNext', data: data};
                    $scope.notifications.unshift(notification);
                    return function () {
                        close(notification);
                    };
                };
            }
        };
    });
})(mt);