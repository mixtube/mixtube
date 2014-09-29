(function() {
  'use strict';

  function mtQueue($timeout, DirectivesRegistryHelper, QueuesRegistry) {
    return {
      restrict: 'A',
      require: ['mtQueue', 'mtScrollable'],
      controller: function($scope, $element, $attrs) {
        DirectivesRegistryHelper.install(this, QueuesRegistry, 'mtQueue', $scope, $attrs);
      },
      link: function(scope, iElement, iAttrs, ctrls) {
        var controller = ctrls[0];
        var scrollable = ctrls[1];
        var lastFocusedEntry = null;

        scope.$on('mtQueueEntryAnimation::started', function(evt, entry) {
          // this event should not bubble further up
          evt.stopPropagation();

          if (entry === lastFocusedEntry) {

            // an animation concerning the last focused entry started
            //  1. clear the lastFocusedEntry variable to prevent the any other animation of it (see focusEntry method)
            //  2. listen to the sizing done event to suspend the entry animation
            //  3. scroll to the newly inserted entry
            //  4. continue the entry insertion animation

            lastFocusedEntry = null;

            var deregisterFn = scope.$on('mtQueueEntryAnimation::sizingDone', function(evt, entry, continuation) {

              evt.stopPropagation();
              deregisterFn();

              // suspend the entry animation until the scroll operation is finished then resume it
              continuation.suspend();
              scrollable.putAnchorInViewPort(entry.id, function() {
                continuation.continue();
              });
            });
          }
        });

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

  angular.module('Mixtube').directive('mtQueue', mtQueue);

})();