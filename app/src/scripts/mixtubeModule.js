'use strict';

var angular = require('angular'),
  angularAnimate = require('angular-animate'),
  angularAria = require('angular-aria'),
  noop = require('lodash/utility/noop');

var mixtube = angular.module('mixtube', [angularAnimate, angularAria]);

// analyticsTracker and errorsTracker have to be provided otherwise Mixtube will no start

mixtube.factory('capabilities', require('./components/capabilities/capabilitiesFactory'));
mixtube.factory('asyncRegistryFactory', require('./components/directives-registry/asyncRegistryFactoryFactory'));
mixtube.factory('directivesRegistryHelper', require('./components/directives-registry/directivesRegistryHelperFactory'));
mixtube.factory('modalManager', require('./components/modal/modalManagerFactory.js'));
mixtube.directive('mtNotificationCenter', require('./components/notification/notificationCenterDirective'));
mixtube.factory('notificationCentersRegistry', require('./components/notification/notificationCentersRegistryFactory'));
mixtube.factory('orchestrator', require('./components/playback/orchestratorFactory'));
mixtube.directive('mtScene', require('./components/playback/sceneDirective'));
mixtube.factory('scenesRegistry', require('./components/playback/scenesRegistryFactory'));
mixtube.directive('mtQueue', require('./components/queue/queueDirective'));
mixtube.animation('.mt-js-animation__queue-entry', require('./components/queue/queueEntryAnimation'));
mixtube.factory('queueManager', require('./components/queue/queueManagerFactory'));
mixtube.factory('queuesRegistry', require('./components/queue/queuesRegistryFactory'));
mixtube.factory('searchCtrlHelper', require('./components/search/searchCtrlHelperFactory'));
mixtube.directive('mtSearchInput', require('./components/search/searchInputDirective'));
mixtube.factory('searchInputsRegistry', require('./components/search/searchInputsRegistryFactory'));
mixtube.directive('mtInteractiveChrome', require('./components/user-interaction/interactiveChromeDirective'));
mixtube.factory('interactiveChromesManager', require('./components/user-interaction/interactiveChromesManagerFactory'));
mixtube.factory('pointerManager', require('./components/user-interaction/pointerManagerFactory'));
mixtube.factory('userInteractionManager', require('./components/user-interaction/userInteractionManagerFactory'));
mixtube.constant('animationsConfig', require('./components/AnimationsConfig'));
mixtube.directive('mtClickActiveClass', require('./components/clickActiveClassDirective'));
mixtube.factory('configuration', require('./components/configurationFactory'));
mixtube.filter('mtDuration', require('./components/durationFilter'));
mixtube.factory('keyboardShortcutManager', require('./components/keyboardShortcutManagerFactory'));
mixtube.constant('logger', console);
mixtube.directive('mtScrollable', require('./components/scrollableDirective'));
mixtube.factory('foldAnimationBuilder', require('./components/animation/foldAnimationBuilderFactory'));
mixtube.factory('slideAnimationBuilder', require('./components/animation/slideAnimationBuilderFactory'));
mixtube.animation('.mt-js-animation__fold', require('./components/animation/foldAnimation'));
mixtube.animation('.mt-js-animation__slide-fold', require('./components/animation/slideFoldAnimation'));
mixtube.directive('mtSmartImg', require('./components/smartImgDirective'));
mixtube.directive('mtSpinner', require('./components/spinner/spinnerDirective'));
mixtube.factory('youtubeClient', require('./components/youtubeClientFactory'));

mixtube.controller('RootCtrl', require('./controllers').RootCtrl);
mixtube.controller('SearchResultsCtrl', require('./controllers').SearchResultsCtrl);
mixtube.controller('SearchResultCtrl', require('./controllers').SearchResultCtrl);
mixtube.controller('QueueCtrl', require('./controllers').QueueCtrl);
mixtube.controller('DebuggingCtrl', require('./controllers').DebuggingCtrl);

module.exports = mixtube.name;