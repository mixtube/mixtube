'use strict';

var angular = require('angular');

var mixtube = angular.module('mixtube', ['ngAnimate']);

mixtube.factory('Capabilities', require('./components/capabilities/capabilitiesFactory'));
mixtube.factory('AsyncRegistryFactory', require('./components/directives-registry/asyncRegistryFactoryFactory'));
mixtube.factory('DirectivesRegistryHelper', require('./components/directives-registry/directivesRegistryHelperFactory'));
mixtube.factory('ModalManager', require('./components/modal/modalManagerFactory.js'));
mixtube.directive('mtNotificationCenter', require('./components/notification/notificationCenterDirective'));
mixtube.factory('NotificationCentersRegistry', require('./components/notification/notificationCentersRegistryFactory'));
mixtube.factory('MediaElementsPool', require('./components/playback/mediaElementsPoolFactory'));
mixtube.factory('Orchestrator', require('./components/playback/orchestratorFactory'));
mixtube.factory('PlaybackSlotFactory', require('./components/playback/playbackSlotFactoryFactory'));
mixtube.directive('mtScene', require('./components/playback/sceneDirective'));
mixtube.factory('ScenesRegistry', require('./components/playback/scenesRegistryFactory'));
mixtube.directive('mtQueue', require('./components/queue/queueDirective'));
mixtube.animation('.mt-js-animation__queue-entry', require('./components/queue/queueEntryAnimation'));
mixtube.factory('QueueManager', require('./components/queue/queueManagerFactory'));
mixtube.factory('QueuesRegistry', require('./components/queue/queuesRegistryFactory'));
mixtube.factory('SearchCtrlHelper', require('./components/search/searchCtrlHelperFactory'));
mixtube.directive('mtSearchInput', require('./components/search/searchInputDirective'));
mixtube.factory('SearchInputsRegistry', require('./components/search/searchInputsRegistryFactory'));
mixtube.animation('.mt-js-animation-enter-leave__slide-and-size', require('./components/slide-size-animation/slideSizeAnimation'));
mixtube.factory('SlideSizeAnimationBuilder', require('./components/slide-size-animation/slideSizeAnimationBuilderFactory'));
mixtube.directive('mtInteractiveChrome', require('./components/user-interaction/interactiveChromeDirective'));
mixtube.factory('InteractiveChromesManager', require('./components/user-interaction/interactiveChromesManagerFactory'));
mixtube.factory('PointerManager', require('./components/user-interaction/pointerManagerFactory'));
mixtube.factory('UserInteractionManager', require('./components/user-interaction/userInteractionManagerFactory'));
mixtube.constant('AnimationsConfig', require('./components/AnimationsConfig'));
mixtube.directive('mtButton', require('./components/buttonDirective'));
mixtube.directive('mtClickActiveClass', require('./components/clickActiveClassDirective'));
mixtube.factory('Configuration', require('./components/configurationFactory'));
mixtube.filter('mtDuration', require('./components/durationFilter'));
mixtube.factory('KeyboardShortcutManager', require('./components/keyboardShortcutManagerFactory'));
mixtube.factory('LoggerFactory', require('./components/loggerFactoryFactory'));
mixtube.directive('mtScrollable', require('./components/scrollableDirective'));
mixtube.animation('.mt-js-animation__slide', require('./components/slideAnimation'));
mixtube.directive('mtSmartImg', require('./components/smartImgDirective'));
mixtube.factory('YoutubeClient', require('./components/youtubeClientFactory'));

mixtube.controller('RootCtrl', require('./controllers').RootCtrl);
mixtube.controller('SearchResultsCtrl', require('./controllers').SearchResultsCtrl);
mixtube.controller('SearchResultCtrl', require('./controllers').SearchResultCtrl);
mixtube.controller('QueueCtrl', require('./controllers').QueueCtrl);
mixtube.controller('DebuggingCtrl', require('./controllers').DebuggingCtrl);

module.exports = mixtube;