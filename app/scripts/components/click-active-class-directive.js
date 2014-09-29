(function(mt) {
  'use strict';

  function mtClickActiveClass() {
    return function postLink(scope, iElement, iAttrs) {
      var activeClassName = iAttrs.mtClickActiveClass;

      iElement
        // simulates ngTouch behavior for active class
        .on('touchstart', function() {
          iElement.addClass(activeClassName);
        })
        .on('touchend touchmove touchcancel', function() {
          iElement.removeClass(activeClassName);
        });
    }
  }

  angular.module('Mixtube').directive('mtClickActiveClass', mtClickActiveClass);

})(mt);