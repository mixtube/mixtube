'use strict';

var angular = require('angular');

// brfs requires this to be on its own line
var fs = require('fs');

function modalManagerFactory($document, $compile, $q, $animate, $rootScope) {

  var body = $document.find('body').eq(0);
  var backdropElement = angular.element('<div class="mt-backdrop mt-animation-enter-leave__fade"></div>'),
    modalLinkFn = $compile(fs.readFileSync(__dirname + '/modal.html', 'utf8'));

  var open = function(options) {
    $animate.enter(backdropElement, body);

    function leave(modalElement, done) {
      $animate.leave(backdropElement);
      $animate.leave(modalElement).then(function() {
        $rootScope.$apply(done);
      });
    }

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
  };

  /**
   * @name ModalManager
   */
  var ModalManager = {
    open: open
  };

  return ModalManager;
}

module.exports = modalManagerFactory;