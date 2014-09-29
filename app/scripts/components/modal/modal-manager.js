(function() {
  'use strict';

  function ModalManagerFactory($document, $compile, $q, $animate, $rootScope, $templateRequest) {

    var body = $document.find('body').eq(0);
    var backdropElement = angular.element('<div class="mt-backdrop mt-animation-enter-leave__fade"></div>');

    var linkFnPromise = $templateRequest('/scripts/components/modal/modal.html')
      .then(function(template) {
        return $compile(template);
      });

    var open = function(options) {
      $animate.enter(backdropElement, body);

      function leave(modalElement, done) {
        $animate.leave(backdropElement);
        $animate.leave(modalElement).then(function() {
          $rootScope.$apply(done);
        });
      }

      return linkFnPromise.then(function(modalLinkFn) {

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

  angular.module('Mixtube').factory('ModalManager', ModalManagerFactory);

})();