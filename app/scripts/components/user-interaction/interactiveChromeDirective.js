'use strict';

// @ngInject
function interactiveChromeDirective($parse, interactiveChromesManager, pointerManager) {
  return {
    restrict: 'A',
    compile: function(tElement, tAttrs) {
      var getter = $parse(tAttrs.mtInteractiveChrome);

      return function link(scope, iElement) {

        var removeFn = interactiveChromesManager.addInteractiveChrome({
          isInteracted: function() {
            return getter(scope) || pointerManager.isPointerInRect(iElement[0].getBoundingClientRect());
          }
        });

        // make sure mw notify when an element is destroyed
        scope.$on('$destroy', removeFn);
      };
    }
  };
}

module.exports = interactiveChromeDirective;