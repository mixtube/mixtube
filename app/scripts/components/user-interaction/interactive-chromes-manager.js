(function (mt) {
    'use strict';

    function InteractiveChromesManagerFactory() {

        var facades = [];

        function isChromeInteracted() {
            var length = facades.length;
            for (var idx = 0; idx < length; idx++) {
                if (facades[idx].isInteracted()) {
                    return true;
                }
            }
            return false;
        }

        function addInteractiveChrome(facade) {
            facades.push(facade);
            return function remove() {
                _.remove(facades, facade);
            }
        }

        /**
         * @name InteractiveChromesManager
         */
        var InteractiveChromesManager = {
            /**
             * Is the user actively interacting with one of the managed chrome.
             *
             * @returns {boolean}
             */
            isChromeInteracted: isChromeInteracted,

            /**
             * Adds interactive chrome to the manager.
             *
             * @param {{isInteracted: function():boolean}} facade the facade containing the methods to expose
             * @returns {function()} a function to call to remove the chrome from the manager
             */
            addInteractiveChrome: addInteractiveChrome
        };

        return InteractiveChromesManager;
    }

    mt.MixTubeApp.factory('InteractiveChromesManager', InteractiveChromesManagerFactory);
})(mt);