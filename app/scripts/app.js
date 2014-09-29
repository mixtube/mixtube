(function() {
  'use strict';

  var $document = angular.element(document);
  $document.ready(function() {
    angular.bootstrap(document, ['Mixtube']);
  });


  angular.module('Mixtube', ['ngAnimate'])
    .config(function($locationProvider) {
      $locationProvider.html5Mode(true);
    })

    .run(function($rootScope, $controller, Configuration) {
      // make sure the scope always has the props property
      $rootScope.props = {};

      if (Configuration.debug) {
        $controller('DebuggingCtrl');
      }
    });

})(window.mt = window.mt || {});