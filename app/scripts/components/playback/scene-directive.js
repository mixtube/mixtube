(function(mt) {
  'use strict';

  function mtScene(ScenesRegistry, DirectivesRegistryHelper) {
    return {
      restrict: 'A',
      controller: function($scope, $element, $attrs) {
        DirectivesRegistryHelper.install(this, ScenesRegistry, 'mtScene', $scope, $attrs);

        var sceneElement = $element;

        this.newHostElement = function() {
          var hostElement = angular.element('<div class="mt-scene__element-host"></div>');
          sceneElement.append(hostElement);
          return hostElement;
        };
      }
    };
  }

  mt.MixTubeApp.directive('mtScene', mtScene);

})(mt);