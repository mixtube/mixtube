(function (mt) {
    'use strict';

    mt.MixTubeApp.run(function ($rootScope, $parse) {

        // a not very nice way to extend the angular Scope but we don't have access to it
        var Scope = Object.getPrototypeOf($rootScope);

        /**
         * A working version of $watchCollection that works only for arrays.
         *
         * The original $watchCollection version is broken in AngularJS 1.1.5 because it gives the same old and new
         * value as parameters to the watcher listener.
         *
         * See the $watchCollection to know how to use this method and see https://github.com/angular/angular.js/issues/2621
         * to learn more about the bug.
         */
        Scope.$watchArray = function watchArray(obj, listener) {
            var self = this;
            var oldValue;
            var newValue;
            var changeDetected = 0;
            var objGetter = $parse(obj);
            var newLength = 0;
            var oldLength = 0;

            function $watchArrayWatch() {
                newValue = objGetter(self);

                if (angular.isArray(newValue)) {
                    oldLength = angular.isArray(oldValue) ? oldValue.length : 0;
                    newLength = newValue.length;

                    if (oldLength !== newLength) {
                        // if lengths do not match we need to trigger change notification
                        changeDetected++;
                    } else {
                        // look for changes.
                        for (var i = 0; i < newLength; i++) {
                            if (oldValue[i] !== newValue[i]) {
                                changeDetected++;
                            }
                        }
                    }
                }
                return changeDetected;
            }

            function $watchArrayAction() {
                listener(newValue, oldValue, self);
                oldValue = newValue.slice();
            }

            return this.$watch($watchArrayWatch, $watchArrayAction);
        }
    });
})(mt);