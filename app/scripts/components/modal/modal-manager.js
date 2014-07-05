(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtModalManager', function ($document, $http, $templateCache, $compile, $q, $animate, $rootScope) {

        var body = $document.find('body').eq(0);
        var backdropElement = angular.element('<div class="mt-backdrop mt-animation-enter-leave__fade"></div>');

        var linkFnDeferred = $q.defer();
        $http.get('scripts/components/modal/modal.html', {cache: $templateCache}).success(function (response) {
            linkFnDeferred.resolve($compile(angular.element(response)));
        });

        return {
            open: function (options) {
                $animate.enter(backdropElement, body);

                function leave(modalElement, done) {
                    $animate.leave(backdropElement);
                    $animate.leave(modalElement, function () {
                        done();
                    });
                }

                return linkFnDeferred.promise.then(function (modalLinkFn) {

                    var scope = angular.extend($rootScope.$new(true), options);

                    var modalResult = $q.defer();

                    modalLinkFn(scope, function (modalElement) {

                        scope.close = function () {
                            leave(modalElement, function () {
                                modalResult.resolve();
                            });
                        };
                        scope.dismiss = function () {
                            leave(modalElement, function () {
                                modalResult.reject();
                            });
                        };

                        $animate.enter(modalElement, body);
                    });

                    return modalResult.promise;
                });
            }
        };
    });
})(mt);