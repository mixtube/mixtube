'use strict';

var angular = require('angular'),
  angularAnimate = require('angular-animate'),
  angularAria = require('angular-aria');

var mixtube = angular.module('mixtube', [angularAnimate, angularAria]);

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
mixtube.animation('.mt-js-animation-enter-leave__slide-and-size', require('./components/slide-size-animation/slideSizeAnimation'));
mixtube.factory('slideSizeAnimationBuilder', require('./components/slide-size-animation/slideSizeAnimationBuilderFactory'));
mixtube.directive('mtInteractiveChrome', require('./components/user-interaction/interactiveChromeDirective'));
mixtube.factory('interactiveChromesManager', require('./components/user-interaction/interactiveChromesManagerFactory'));
mixtube.factory('pointerManager', require('./components/user-interaction/pointerManagerFactory'));
mixtube.factory('userInteractionManager', require('./components/user-interaction/userInteractionManagerFactory'));
mixtube.constant('animationsConfig', require('./components/animationsConfig'));
mixtube.directive('mtClickActiveClass', require('./components/clickActiveClassDirective'));
mixtube.factory('configuration', require('./components/configurationFactory'));
mixtube.filter('mtDuration', require('./components/durationFilter'));
mixtube.factory('keyboardShortcutManager', require('./components/keyboardShortcutManagerFactory'));
mixtube.factory('loggerFactory', require('./components/loggerFactoryFactory'));
mixtube.directive('mtScrollable', require('./components/scrollableDirective'));
mixtube.animation('.mt-js-animation__slide', require('./components/slideAnimation'));
mixtube.directive('mtSmartImg', require('./components/smartImgDirective'));
mixtube.directive('mtSpinner', require('./components/spinner/spinnerDirective'));
mixtube.factory('youtubeClient', require('./components/youtubeClientFactory'));

mixtube.controller('RootCtrl', require('./controllers').RootCtrl);
mixtube.controller('SearchResultsCtrl', require('./controllers').SearchResultsCtrl);
mixtube.controller('SearchResultCtrl', require('./controllers').SearchResultCtrl);
mixtube.controller('QueueCtrl', require('./controllers').QueueCtrl);
mixtube.controller('DebuggingCtrl', require('./controllers').DebuggingCtrl);

module.exports = mixtube.name;