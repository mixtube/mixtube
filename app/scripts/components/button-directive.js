(function(mt) {
    'use strict';

    // unbind and rebind click event handlers bi remove and re adding event listener at the DOM level
    function ClickEventsGate(element) {
        var aelClickCallsArgs = [];

        var rElement = element[0];
        var origAddEventListener = rElement.addEventListener;
        var origRemoveEventListener = rElement.removeEventListener;

        rElement.addEventListener = function addEventListenerInterceptor(type) {
            if (type === 'click') {
                aelClickCallsArgs.push(_.toArray(arguments));
            }
            origAddEventListener.apply(rElement, arguments);
        };

        function hold() {
            for (var idx = 0; idx < aelClickCallsArgs.length; idx++) {
                origRemoveEventListener.apply(rElement, aelClickCallsArgs[idx]);
            }
        }

        function release() {
            for (var idx = 0; idx < aelClickCallsArgs.length; idx++) {
                origAddEventListener.apply(rElement, aelClickCallsArgs[idx]);
            }
        }

        this.hold = hold;
        this.release = release;
    }

    function mtButton() {
        return {
            restrict: 'E',
            controller: function($element, $attrs) {

                // we need to do this in a controller since we want to replace addEventListener before the
                // ngClick binds its listeners in the link phase
                var clickEventsGate = new ClickEventsGate($element);

                $attrs.$observe('disabled', function(disabled) {
                    $attrs.$set('role', disabled ? null : 'button');
                    $attrs.$set('tabindex', disabled ? null : '0');

                    if (disabled) {
                        clickEventsGate.hold();
                    } else {
                        clickEventsGate.release();
                    }
                });
            }
        }
    }

    mt.MixTubeApp.directive('mtButton', mtButton);
})(mt);