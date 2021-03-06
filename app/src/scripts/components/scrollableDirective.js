'use strict';

var scrollIntoView = require('scroll-into-view'),
  querySelector = require('../querySelector');

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
// @ngInject
function scrollableDirective($timeout, animationsConfig) {

  /**
   * @param {JQLite} container
   * @param {JQLite} content
   * @returns {boolean} true if the content is fully contained in the container along the Y axis
   */
  function containsY(container, content) {
    var containerRect = container[0].getBoundingClientRect();
    var contentRect = content[0].getBoundingClientRect();
    return containerRect.top <= contentRect.top && contentRect.bottom <= containerRect.bottom;
  }

  return {
    restrict: 'A',
    controller: /*@ngInject*/ function($scope, $element) {

      var scrollable = $element;

      /**
       * @param {string} anchor
       * @param {Function=} done
       */
      this.putAnchorInViewPort = putAnchorInViewPort;

      function putAnchorInViewPort(anchor, done) {
        var target = querySelector(scrollable, '[mt-anchor="' + anchor + '"]');
        if (target.length > 0 && !containsY(scrollable, target)) {
          scrollIntoView(target[0], {
            time: animationsConfig.transitionDuration,
            validTarget: function(parent) {
              return scrollable[0] === parent;
            }
          }, done);
        } else if (done) {
          // no animation required but call the callback asynchronously if given
          $timeout(done, 0, false);
        }
      }
    }
  };
}

module.exports = scrollableDirective;