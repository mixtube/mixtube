(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp = angular.module('mtMixTubeApp', [])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(true);
        }).factory('$exceptionHandler', function ($log) {
            return function (exception, cause) {
                qbaka.report(exception);
                $log.error.apply($log, arguments);
            };
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