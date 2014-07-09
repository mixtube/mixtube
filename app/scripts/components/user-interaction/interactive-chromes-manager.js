(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtInteractiveChromesManager', function () {

        var chromeInteractionCount = 0;

        return {

            /**
             * Is the user actively interacting with one of the chrome.
             *
             * @returns {boolean}
             */
            get chromeInteracted() {
                return !!chromeInteractionCount;
            },

            chromeInteractionBegan: function () {
                chromeInteractionCount++;
            },

            chromeInteractionEnded: function () {
                if (chromeInteractionCount > 0) {
                    chromeInteractionCount--;
                }
            }
        };
    });
})(mt);