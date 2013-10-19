(function(mt) {
    'use strict';

    mt.MixTubeApp.factory('mtModal', function ($rootScope, $q, $templateCache, $compile, $document, mtKeyboardShortcutManager) {

        function close(resolve) {
            modalElement.remove();
            modalElement = null;
            modalScope.$destroy();
            modalScope = null;
            mtKeyboardShortcutManager.leaveContext('modal');
            resolve ? modalDeferred.resolve() : modalDeferred.reject();
        }

        /**
         * The current modal element or "falsy" if no active modal.
         *
         * @type {jQuery=}
         */
        var modalElement;
        /**
         * @type {Deferred=}
         */
        var modalDeferred;
        /**
         * @type {Object}
         */
        var modalScope;

        var body = $document.find('body');
        // need to trim the template because jQuery can not parse an HTML string that starts with a blank character
        var modalLinker = $compile($templateCache.get('mtModalTemplate').trim());

        // pressing escape key will close the current modal
        mtKeyboardShortcutManager.register('modal', 'esc', function () {
            close(false);
        });

        return {
            /**
             * Shows a confirmation dialog with the given message.
             *
             * @param {string} message the message to display. Can contains HTML.
             * @returns {promise} resolved when the user confirms, rejected when the user cancels
             */
            confirm: function (message) {
                if (modalElement) {
                    throw new Error('Can not open a new modal, there is already one active.');
                }

                modalScope = $rootScope.$new();
                modalScope.template = 'mtConfirmTemplate';
                modalScope.message = message;
                modalScope.confirmLabel = 'Confirm';
                modalScope.cancelLabel = 'Cancel';

                modalElement = modalLinker(modalScope);
                body.prepend(modalElement);

                mtKeyboardShortcutManager.enterContext('modal');

                modalDeferred = $q.defer();

                modalScope.confirm = function () {
                    close(true);
                };
                modalScope.close = function () {
                    close(false);
                };

                return modalDeferred.promise;
            }
        }
    });
})(mt);