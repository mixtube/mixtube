'use strict';

var angular = require('angular');

// brfs requires this to be on its own line
var fs = require('fs');

// @ngInject
function modalManagerFactory($document, $compile, $q, $animate, $rootScope) {

  var body = $document.find('body').eq(0);
  var backdropElement = angular.element('<div class="mt-backdrop mt-animation-enter-leave__fade"></div>'),
    modalLinkFn = $compile(fs.readFileSync(__dirname + '/modal.html', 'utf8'));

  var open = function(options) {
    $animate.enter(backdropElement, body);

    function leave(modalElement) {
      return $q.all([
        $animate.leave(backdropElement),
        $animate.leave(modalElement)
      ]);
    }

    var scope = angular.extend($rootScope.$new(true), options);

    return $q(function(resolve) {
      modalLinkFn(scope, function(modalElement) {

        scope.close = function(command) {
          leave(modalElement).then(function() {
            resolve(command);
          });
        };

        $animate.enter(modalElement, body);
      });
    });
  };

  /**
   * @name modalManager
   */
  var modalManager = {
    open: open
  };

  return modalManager;
}

module.exports = modalManagerFactory;