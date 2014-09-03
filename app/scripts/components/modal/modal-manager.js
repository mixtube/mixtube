(function(mt) {
    'use strict';

    function ModalManagerFactory($document, $http, $templateCache, $compile, $q, $animate, $rootScope) {

        var body = $document.find('body').eq(0);
        var backdropElement = angular.element('<div class="mt-backdrop mt-animation-enter-leave__fade"></div>');

        var linkFnDeferred = $q.defer();
        $http.get('/scripts/components/modal/modal.html', {cache: $templateCache})
            .success(function(response) {
                linkFnDeferred.resolve($compile(angular.element(response)));
            });

        var open = function(options) {
            $animate.enter(backdropElement, body);

            function leave(modalElement, done) {
                $animate.leave(backdropElement);
                $animate.leave(modalElement, function() {
                    done();
                });
            }

            return linkFnDeferred.promise.then(function(modalLinkFn) {

                var scope = angular.extend($rootScope.$new(true), options);

                var modalResult = $q.defer();

                modalLinkFn(scope, function(modalElement) {

                    scope.close = function(command) {
                        leave(modalElement, function() {
                            modalResult.resolve(command);
                        });
                    };

                    $animate.enter(modalElement, body);
                });

                return modalResult.promise;
            });
        };

        /**
         * @name ModalManager
         */
        var ModalManager = {
            open: open
        };

        return ModalManager;
    }

    mt.MixTubeApp.factory('ModalManager', ModalManagerFactory);
})(mt);