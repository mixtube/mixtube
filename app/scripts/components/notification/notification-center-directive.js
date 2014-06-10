(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtNotificationCenter', function (mtNotificationCentersRegistry, $timeout) {

        /**
         * @const
         * @type {number}
         */
        var COMING_NEXT_AUTO_CLOSE_DELAY = 5000;

        return {
            restrict: 'E',
            templateUrl: '/scripts/components/notification/notification.html',
            replace: true,
            scope: {
            },
            controller: function ($scope, $element, $attrs) {

                var name = $attrs.name;

                if (!name || name.trim().length === 0) {
                    throw new Error('mtNotificationCenter expected a non empty string as name value');
                }

                mtNotificationCentersRegistry.register(name, this);
                $scope.$on('$destroy', function () {
                    mtNotificationCentersRegistry.unregister(name);
                });

                function close(notification) {
                    _.pull($scope.notifications, notification);
                }

                $scope.notifications = [];
                // publish the close function to be used in the template
                $scope.close = close;

                this.error = function (message) {
                    $scope.notifications.unshift({type: 'error', data: {message: message}});
                };

                this.comingNext = function (data) {
                    var notification = {type: 'comingNext', data: data};
                    $scope.notifications.unshift(notification);
                    $timeout(function () {
                        close(notification);
                    }, COMING_NEXT_AUTO_CLOSE_DELAY);
                };
            }
        };
    });
})(mt);