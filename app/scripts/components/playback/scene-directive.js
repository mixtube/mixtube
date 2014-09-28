(function(mt) {
  'use strict';

  mt.MixTubeApp.directive('mtScene', function(mtScenesRegistry, mtDirectivesRegistryHelper) {
    return {
      restrict: 'A',
      controller: function($scope, $element, $attrs) {
        mtDirectivesRegistryHelper.install(this, mtScenesRegistry, 'mtScene', $scope, $attrs);

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