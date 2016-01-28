'use strict';

var angular = require('angular');

// @ngInject
function sceneDirective(scenesRegistry, directivesRegistryHelper) {
  return {
    restrict: 'A',
    controller: /*@ngInject*/ function($scope, $element, $attrs) {
      directivesRegistryHelper.install(this, scenesRegistry, 'mtScene', $scope, $attrs);

      var sceneElement = $element;

      this.newHostElement = function() {
        var hostElement = angular.element('<div class="mt-scene__element-host"></div>');
        sceneElement.append(hostElement);
        return hostElement;
      };
    }
  };
}

module.exports = sceneDirective;