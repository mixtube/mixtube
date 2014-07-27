(function (mt) {
    'use strict';

    var $document = angular.element(document);
    $document.ready(function () {
        angular.bootstrap(document, ['mtMixTubeApp']);
    });

    mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngAnimate', 'ngTouch'])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(true);
        })

        // keep in sync with the SASS counterpart $baseTransitionDuration
        .constant('BASE_TRANSITION_DURATION', 200)
        // A JS function equivalent of "cubic-bezier(.8, 0, .2, 1)". Keep in sync with the SASS counterpart $easeInOut
        .constant('EASE_IN_OUT_BEZIER_POINTS', [.8, 0, .2, 1])

        .run(function ($rootScope, $controller, mtConfiguration) {
            // make sure the scope always has the props property
            $rootScope.props = {};

            if (mtConfiguration.debug) {
                $controller('mtDebuggingCtrl');
            }
        });

})(window.mt = window.mt || {});