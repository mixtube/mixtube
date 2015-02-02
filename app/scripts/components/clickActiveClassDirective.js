'use strict';

function clickActiveClassDirective() {
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

module.exports = clickActiveClassDirective;