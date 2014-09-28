(function(mt) {
  'use strict';

  mt.MixTubeApp.directive('mtScene', function(mtScenesRegistry, DirectivesRegistryHelper) {
    return {
      restrict: 'A',
      controller: function($scope, $element, $attrs) {
        DirectivesRegistryHelper.install(this, mtScenesRegistry, 'mtScene', $scope, $attrs);

        var sceneElement = $element;

        this.newHostElement = function() {
          var hostElement = angular.element('<div class="mt-scene__element-host"></div>');
          sceneElement.append(hostElement);
          return hostElement;
        };
      }
    };
  });
})(mt);