'use strict';

var querySelector = require('../../querySelector');

// brfs requires this to be on its own line
var fs = require('fs');

/**
 * @ngdoc directive
 * @name mt.directive:mtSearchInput
 * @restrict A
 *
 * @description
 * A single usage directive that controls the sequencing of search input animation.
 *
 * Focus needs to be called inside a user initiated DOM event handler to show the virtual keyboard on mobile which
 * can't be guaranteed by AngularJS when using ngTouch module.
 * On click on ".mt-search-input__button" we focus the real input first and then we start the animation of
 * ".mt-search-input".
 */
// @ngInject
function searchInputDirective(searchInputsRegistry, directivesRegistryHelper, interactiveChromesManager,
                              slideAnimationBuilder) {

  return {
    restrict: 'E',
    template: fs.readFileSync(__dirname + '/searchInput.html', 'utf8'),
    replace: true,
    scope: {
      inputModel: '=ngModel'
    },
    controller: /*@ngInject*/ function($scope, $element, $attrs) {

      directivesRegistryHelper.install(this, searchInputsRegistry, 'name', $scope, $attrs);

      var form = $element;
      var field = querySelector($element, '.mt-js-search-input__field');
      var fakeField = querySelector($element, '.mt-js-search-input__fake-field');

      var _show = null;
      var animationRunning = false;

      function sync() {
        animationRunning = true;
        field.css({opacity: 0});

        if (_show) {

          form.css({display: ''});

          slideAnimationBuilder({from: '100%', to: 0})
            .enter(fakeField)
            .done(function() {
              field.css({opacity: ''});
              animationRunning = false;
            });
        } else {
          slideAnimationBuilder({from: 0, to: '100%'})
            .leave(fakeField)
            .done(function() {
              form.css({display: 'none'});
              field.css({opacity: ''});
              animationRunning = false;
            });
        }

        field[0][_show ? 'focus' : 'blur']();
      }

      function activate() {
        // we need to blur the field on form submit to hide the virtual keyboard on mobile
        form.on('submit', function() {
          if (!animationRunning) {
            field[0].blur();
          }
        });

        // as long as the search input is open we consider it as an active interaction
        var unmanageChromeFn = interactiveChromesManager.addInteractiveChrome(
          {
            isInteracted: function() {
              return _show;
            }
          });

        // make sure mw notify when an element is destroyed
        $scope.$on('$destroy', unmanageChromeFn);
      }

      this.toggle = function(show) {
        if (show !== _show && !animationRunning) {
          _show = show;
          sync();
        }
      };

      activate();
    }
  };
}

module.exports = searchInputDirective;