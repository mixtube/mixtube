(function(Velocity, querySelector) {
  'use strict';

  /**
   * @ngdoc directive
   * @name mt.directive:mtScrollable
   * @restrict A
   *
   * Declares a scrollable container that can be manipulated thanks to its controller.
   *
   * An anchor string declared on children elements thanks to the "mt-scrollable-anchor" attribute can be then used
   * when calling {@link mtScrollable.mtScrollableController#putAnchorInViewPort(string)} to scroll until the child element
   * is visible.
   */
  function mtScrollable($timeout, AnimationsConfig) {

    /**
     * @param {JQLite} container
     * @param {JQLite} content
     * @returns {boolean} true if the content is fully contained in the container along the Y axis
     */
    function containsY(container, content) {
      var containerRect = container[0].getBoundingClientRect();
      var contentRect = content[0].getBoundingClientRect();
      return containerRect.top < contentRect.top && contentRect.bottom < containerRect.bottom;
    }

    return {
      restrict: 'A',
      controller: function($scope, $element) {

        var scrollable = $element;

        /**
         * @param {string} anchor
         * @param {Function=} done
         */
        this.putAnchorInViewPort = function(anchor, done) {
          var target = querySelector(scrollable, '[mt-anchor="' + anchor + '"]');
          if (target.length > 0 && !containsY(scrollable, target)) {
            // the target needs to be animated to reveal the item
            Velocity(
              target[0],
              'scroll',
              {
                container: scrollable[0],
                duration: AnimationsConfig.transitionDuration,
                easing: AnimationsConfig.easeInOutBezierPoints,
                complete: done
              }
            );
          } else if (done) {
            // no animation required but call the callback asynchronously if given
            $timeout(done, 0, false);
          }
        };
      }
    };
  }

  angular.module('Mixtube').directive('mtScrollable', mtScrollable);

})(window.Velocity, mt.commons.querySelector);