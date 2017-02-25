'use strict';

var angular = require('angular'),
  mixtubeModule = require('./mixtubeModule');

/**
 * @param {{youtubeAPIKey: string}} environment a set of properties required for Mixtube to work
 * @param {Object=} delegates a collection of optional delegates to use as extension point
 * @param {{track: function(event: string, data:= Object)}} [delegates.analyticsTracker]
 * @param {{track: function(error: Error)}} [delegates.errorsTracker]
 */
function mixtube(environment, delegates) {

  angular
    .module('mixtubeApp', [mixtubeModule])
    .constant('environment', environment)
    .value('analyticsTracker', delegates.analyticsTracker)
    .value('errorsTracker', delegates.errorsTracker)
    .config(/* @ngInject*/ function($locationProvider) {
      $locationProvider.html5Mode(true);
    })
    .config(/* @ngInject*/ function($provide) {
      $provide.decorator('$exceptionHandler', /* @ngInject*/ function($delegate) {
        return function exceptionHandlerDecorator(exception, cause) {
          delegates.errorsTracker.track(exception);
          $delegate(exception, cause);
        };
      });
    })

    .run(/* @ngInject*/ function($rootScope, $controller, configuration) {
      // make sure the scope always has the props property
      $rootScope.props = {};

      if (configuration.debug) {
        $controller('DebuggingCtrl');
      }
    });

  var $document = angular.element(document);
  $document.ready(function() {
    angular.bootstrap(document, ['mixtubeApp'], {strictDi: true});
  });
}

module.exports = mixtube;