(function(mt) {
  'use strict';

  function mtSearchInput(SearchInputsRegistry, DirectivesRegistryHelper, InteractiveChromesManager,
                         AnimationsConfig) {

    return {
      restrict: 'E',
      templateUrl: '/scripts/components/search/search-input.html',
      replace: true,
      scope: {
        inputModel: '=ngModel'
      },
      controller: function($scope, $element, $attrs) {

        DirectivesRegistryHelper.install(this, SearchInputsRegistry, 'name', $scope, $attrs);

        var form = $element;
        var field = mt.commons.querySelector($element, '.mt-js-search-input__field');
        var fakeField = mt.commons.querySelector($element, '.mt-js-search-input__fake-field');

        // helps to differentiate first rendering from next ones
        var init = true;

        var _show = null;
        var animationRunning = false;

        function sync() {
          animationRunning = true;
          field.css({opacity: 0});

          var baseAnimConf = {
            // in init phase we don't want to animate
            duration: init ? 0 : AnimationsConfig.transitionDuration,
            easing: AnimationsConfig.easeInOutBezierPoints
          };

          if (_show) {
            form.css({display: ''});
            Velocity(
              fakeField,
              {translateX: ['0', '100%']},
              _.defaults({
                complete: function() {
                  field.css({opacity: ''});
                  animationRunning = false;
                }
              }, baseAnimConf)
            );
          } else {
            Velocity(
              fakeField,
              {translateX: ['100%', '0']},
              _.defaults({
                complete: function() {
                  form.css({display: 'none'});
                  field.css({opacity: ''});
                  animationRunning = false;
                }
              }, baseAnimConf)
            );
          }

          if (init) {
            init = false;
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
          var unmanageChromeFn = InteractiveChromesManager.addInteractiveChrome(
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
    }
  }

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
  mt.MixTubeApp.directive('mtSearchInput', mtSearchInput);

})(mt);