(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtAlert', function ($rootScope, $q, $templateCache, $compile, $document, $animator, $timeout) {
        var alertContainer = $document.find('.mt-alert-container');
        // need to trim the template because jQuery can not parse an HTML string that starts with a blank character
        var alertLinker;

        // we need to lazy instantiate the alert linker because the template may not be available at load time
        function getAlertLinker() {
            return alertLinker || (alertLinker = $compile($templateCache.get('mtAlertTemplate').trim()));
        }

        function alert(level, message, closeDelay) {
            var scope = $rootScope.$new();
            var animate = $animator(scope, {ngAnimate: "{enter: 'mt-fade-in', leave: 'mt-fade-out'}"});

            scope.message = message;
            scope.level = level;

            getAlertLinker()(scope, function (alertElement) {
                animate.enter(alertElement, alertContainer);

                var closePromise;
                if (closeDelay > 0)
                    closePromise = $timeout(function () {
                        scope.dismiss();
                    }, closeDelay);

                scope.dismiss = function () {
                    $timeout.cancel(closePromise);
                    animate.leave(alertElement, alertContainer);
                    scope.$destroy();
                };


            });
        }

        return {
            info: function (message, closeDelay) {
                alert('info', message, closeDelay);
            },
            warning: function (message, closeDelay) {
                alert('warning', message, closeDelay);
            },
            error: function (message) {
                alert('error', message);
            }
        };
    });
})(mt);