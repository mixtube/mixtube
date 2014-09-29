(function(mt) {
  'use strict';

  function mtInteractiveChrome($parse, InteractiveChromesManager, PointerManager) {
    return {
      restrict: 'A',
      compile: function(tElement, tAttrs) {
        var getter = $parse(tAttrs.mtInteractiveChrome);

        return function link(scope, iElement) {

          var removeFn = InteractiveChromesManager.addInteractiveChrome({
            isInteracted: function() {
              return getter(scope) || PointerManager.isPointerInRect(iElement[0].getBoundingClientRect());
            }
          });

          // make sure mw notify when an element is destroyed
          scope.$on('$destroy', removeFn);
        }
      }
    };
  }

  angular.module('Mixtube').directive('mtInteractiveChrome', mtInteractiveChrome);

})(mt);