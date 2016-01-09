'use strict';

var angular = require('angular'),
  defaults = require('lodash/object/defaults'),
  noop = require('lodash/utility/noop'),
  mixtubeModule = require('./mixtubeModule');

/**
 * @param {{youtubeAPIKey: string}} environment a set of properties required for Mixtube to work
 * @param {Object=} delegates a collection of optional delegates to use as extension point
 * @param {{track: function(event: string, data:= Object)}} [delegates.analytics]
 * @param {function(Error)} [delegates.error]
 */
function initMixtube(environment, delegates) {

  var _delegates = defaults({}, delegates, {
    analytics: {track: noop},
    error: noop
  });

  angular
    .module('mixtubeApp', [mixtubeModule])
    .constant('environment', environment)
    .value('analytics', _delegates.analytics)
    .config(function($locationProvider) {
      $locationProvider.html5Mode(true);
    })
    .config(function($provide) {
      $provide.decorator('$exceptionHandler', function($delegate) {
        return function exceptionHandlerDecorator(exception, cause) {
          _delegates.error(exception);
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

global.initMixtube = initMixtube;