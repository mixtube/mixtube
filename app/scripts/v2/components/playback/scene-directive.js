(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtScene', function (mtScenesRegistry) {
        return {
            restrict: 'A',
            controller: function ($scope, $element, $attrs) {
                var sceneName = $attrs.mtScene;
                var sceneElement = $element;

                if (!sceneName || sceneName.trim().length === 0) {
                    throw new Error('mtScene expected a non empty string as attribute value');
                }

                mtScenesRegistry.register(sceneName, this);
                $scope.$on('$destroy', function () {
                    mtScenesRegistry.unregister(sceneName);
                });

                this.newHostElement = function () {
                    var hostElement = angular.element('<div class="mt-scene__element-host"></div>');
                    hostElement.css('opacity', 0);
                    sceneElement.append(hostElement);
                    return hostElement;
                };

                this.removeHostElement = function (hostElement) {
                    hostElement.remove();
                };
            }
        };
    });
})(mt);