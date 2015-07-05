'use strict';

var has = require('lodash/object/has');

function buttonDirective() {
  return {
    restrict: 'E',
    compile: function(tElement, tAttrs) {

      tAttrs.$set('role', 'button');

      return function link(scope, iElement, iAttrs) {

        // provide a default value if the attribute is not available to trigger $observe anyway
        if (!has(iAttrs, 'disabled')) {
          iAttrs.$set('disabled', false);
        }

        iAttrs.$observe('disabled', function(disabled) {
          iAttrs.$set('aria-disabled', disabled ? 'true' : 'false');
          iAttrs.$set('tabindex', disabled ? null : '0');
        });
      };
    }
  };
}

module.exports = buttonDirective;