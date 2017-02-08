'use strict';

// @ngInject
function queueDirective($timeout, $q, $animate, directivesRegistryHelper, queuesRegistry) {
  return {
    restrict: 'A',
    require: ['mtQueue', 'mtScrollable'],
    controller: /*@ngInject*/ function($scope, $element, $attrs) {
      directivesRegistryHelper.install(this, queuesRegistry, 'mtQueue', $scope, $attrs);
    },
    link: function(scope, iElement, iAttrs, ctrls) {
      var controller = ctrls[0];
      var scrollable = ctrls[1];
      var lastFocusedEntry = null;

      function onAnimate(element, phase) {
        if (phase === 'start') {

          var deregisterFn = element.scope().$on('mtQueueEntryAnimation::foldDone', function(evt, entry, extEvent) {

            evt.stopPropagation();
            deregisterFn();

            if (entry !== lastFocusedEntry) {
              extEvent.waitUntil($q.resolve());
            } else {

              // an animation concerning the last focused entry started
              //  1. clear the lastFocusedEntry variable to prevent the any other animation of it (see focusEntry method)
              //  2. listen to the sizing done event to suspend the entry animation
              //  3. scroll to the newly inserted entry
              //  4. continue the entry insertion animation

              lastFocusedEntry = null;

              // suspend the entry animation until the scroll operation is finished then resume it
              extEvent.waitUntil($q(function(resolve) {
                scrollable.putAnchorInViewPort(entry.id, resolve);
              }));
            }
          });
        }
      }

      $animate.on('enter', iElement, onAnimate);
      $animate.on('leave', iElement, onAnimate);

      controller.focusEntry = function(entry) {
        lastFocusedEntry = entry;

        // timeout leaves enough time for any potential entry animation to start
        $timeout(function() {
          if (lastFocusedEntry) {
            // at this stage if lastFocusedEntry is still set it means that no animation occurred
            // we can put the entry in the view port without waiting for the completion
            scrollable.putAnchorInViewPort(entry.id);
          }
        }, 0);
      };
    }
  };
}

module.exports = queueDirective;