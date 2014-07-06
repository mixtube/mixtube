(function (mt) {
    'use strict';

    mt.MixTubeApp.directive('mtQueue', function (mtDirectivesRegistryHelper, mtQueuesRegistry) {

        return {
            restrict: 'A',
            require: ['mtQueue', 'mtScrollable'],
            controller: function ($scope, $element, $attrs) {
                mtDirectivesRegistryHelper.install(this, mtQueuesRegistry, 'mtQueue', $scope, $attrs);
            },
            link: function (scope, iElement, iAttrs, ctrls) {
                var controller = ctrls[0];
                var scrollable = ctrls[1];
                var lastFocusedEntry = null;

                scope.$on('mtQueueEntry::sizingDone', function (evt, entry, continuation) {
                    // this event should not bubble further up
                    evt.stopPropagation();

                    if (entry === lastFocusedEntry) {
                        lastFocusedEntry = null;

                        // suspend the entry animation until the scroll operation is finished then resume it
                        continuation.suspend();
                        scrollable.putAnchorInViewPort(entry.id, function () {
                            continuation.continue();
                        });
                    }
                });

                controller.focusEntry = function (entry) {
                    lastFocusedEntry = entry;
                    scope.$evalAsync(function () {
                        // if lastFocusedEntry is not null here it means that the requested focus is for an existing
                        // entry and that we don't have to do the full "insert / scroll" dance
                        if (lastFocusedEntry) {
                            scrollable.putAnchorInViewPort(entry.id);
                        }
                    })
                };
            }
        };
    });
})(mt);