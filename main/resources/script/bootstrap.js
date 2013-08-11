(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp = angular.module('mtMixTubeApp', [])
        .config(function ($provide, $locationProvider) {

//            $provide.factory('mtAnimationHooksManager', function () {
//                var hooks = {
//                    enter: {
//                        after: []
//                    }
//                };
//
//                return {
//                    get hooks() {
//                        return hooks;
//                    }
//                };
//            });
//
//            $provide.decorator('$animator', function InterceptingAnimatorServiceProvider($delegate, mtAnimationHooksManager) {
//                var animatorService = $delegate;
//
//                function InterceptingAnimatorService(scope, attrs) {
//                    var origAnimator = animatorService(scope, attrs);
//
//                    return angular.extend({}, origAnimator, {
//                        enter: function wrappedEnter(element, parent, after) {
//                            origAnimator.enter(element, parent, after);
//
//                            var afterEnterHooks = mtAnimationHooksManager.hooks.enter.after;
//                            for (var idx = 0; idx < afterEnterHooks.length; idx++) {
//                                var hook = afterEnterHooks[idx];
//                                hook(element);
//                            }
//                        }
//                    });
//                }
//
//                InterceptingAnimatorService.enabled = animatorService.enabled;
//
//                return InterceptingAnimatorService;
//            });

            // we want to be able to share URL between browsers that don't have the History API and the ones they have it
            // sadly, we need to deactivate HTML5 mode on location provider
            $locationProvider.html5Mode(false);
        });

    mt.events = {
        OpenSearchFrameRequest: 'OpenSearchFrameRequest',
        UpdateComingNextRequest: 'UpdateComingNextRequest'
    };

    mt.model = {
        Video: function () {
            /** @type {string} */
            this.id = null;
            /** @type {string} */
            this.title = null;
            /** @type {string} */
            this.thumbnailUrl = null;
            /** @type {number} */
            this.duration = null;
            /** @type {number} */
            this.viewCount = null;
            /** @type {string} */
            this.publisherName = null;
            /** @type {string} */
            this.provider = null;
        },
        QueueEntry: function () {
            /** @type {string} */
            this.id = null;
            /** @type {mt.model.Video} */
            this.video = null;
            /** @type {boolean} */
            this.skippedAtRuntime = false;
        },
        Queue: function () {
            /** @type {string} */
            this.name = null;
            /** @type {Array.<mt.model.QueueEntry} */
            this.entries = [];
        }
    };
})(window.mt = window.mt || {});