'use strict';

var angular = require('angular'),
  mixtubeModule = require('./mixtubeModule');

angular.module('mixtubeApp', [mixtubeModule])
  .config(function($locationProvider) {
    $locationProvider.html5Mode(true);
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