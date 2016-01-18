'use strict';

var angular = require('angular'),
  defaults = require('lodash/object/defaults'),
  noop = require('lodash/utility/noop'),
  mixtubeModule = require('./mixtubeModule');

/**
 * @param {{youtubeAPIKey: string}} environment a set of properties required for Mixtube to work
 * @param {Object=} delegates a collection of optional delegates to use as extension point
 * @param {{track: function(event: string, data:= Object)}} [delegates.analyticsTracker]
 * @param {{track: function(error: Error)}} [delegates.errorsTracker]
 */
function mixtube(environment, delegates) {

  var _delegates = defaults({}, delegates, {
    analyticsTracker: {track: noop},
    // log collected exception to the browser console by default
    errorsTracker: {track: console.error.bind(console)}
  });

  angular
    .module('mixtubeApp', [mixtubeModule])
    .constant('environment', environment)
    .value('analyticsTracker', _delegates.analyticsTracker)
    .value('errorsTracker', _delegates.errorsTracker)
    .config(function($locationProvider) {
      $locationProvider.html5Mode(true);
    })
    .config(function($provide) {
      $provide.decorator('$exceptionHandler', function($delegate) {
        return function exceptionHandlerDecorator(exception, cause) {
          _delegates.errorsTracker.track(exception);
          $delegate(exception, cause);
        };
      });
    })

    .run(function($rootScope, $controller, configuration) {
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