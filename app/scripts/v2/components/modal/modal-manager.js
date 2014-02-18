(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtModalManager', function ($document, $http, $templateCache, $compile, $q, $animate, $rootScope) {

        var body = $document.find('body').eq(0);

        var linkFnDeferred = $q.defer();

        $http.get('scripts/v2/components/modal/modal.html', {cache: $templateCache}).success(function (response) {
            linkFnDeferred.resolve($compile(angular.element(response)));
        });

        return {
            open: function (options) {
                return linkFnDeferred.promise.then(function (linkFn) {
                    var scope = $rootScope.$new(true);
                    scope.title = 'toto';
                    scope.contentTemplateUrl = 'scripts/v2/components/modal/dummy-modal-content.html';
                    scope.commands = [
                        {label: 'Confirm', action: 'close()', primary: true},
                        {label: 'Cancel', action: 'dismiss()'}
                    ];

                    var modalResult = $q.defer();

                    linkFn(scope, function (clone) {
                        scope.close = function () {
                            $animate.leave(clone, function () {
                                modalResult.resolve();
                            });
                        };
                        scope.dismiss = function () {
                            $animate.leave(clone, function () {
                                modalResult.reject();
                            });
                        };

                        $animate.enter(clone, body, null, angular.noop);
                    });

                    return modalResult.promise;
                });
            }
        };
    });
})(mt);