(function (mt) {
    'use strict';

    mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngAnimate', 'ngTouch'])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(true);
        })
        .run(function ($rootScope) {
            // make sure the scope always has the props property
            $rootScope.props = {};
        });

})(window.mt = window.mt || {});