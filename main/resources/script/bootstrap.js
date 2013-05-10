(function (mt) {

    mt.MixTubeApp = angular.module('mtMixTubeApp', [])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(false);
        }).run(function ($rootScope) {
            var wordCharRegExp = /\w/;
            document.addEventListener('keyup', function (evt) {
                var element = evt.target || evt.srcElement;
                if (!(element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA'
                    || (element.contentEditable && element.contentEditable == 'true'))) {

                    var convertedString = String.fromCharCode(evt.which);
                    if (wordCharRegExp.test(convertedString)) {
                        $rootScope.$apply(function () {
                            $rootScope.$broadcast(mt.events.OpenSearchFrameRequest, {typedChar: convertedString});
                        });
                    }
                }
            });
        });

    mt.events = {
        LoadQueueEntryRequest: 'LoadQueueEntryRequest',
        NextQueueEntryRequest: 'NextQueueEntryRequest',
        OpenSearchFrameRequest: 'OpenSearchFrameRequest',
        AppendVideoToQueueRequest: 'AppendVideoToQueueRequest',
        PlaybackToggleRequest: 'PlaybackToggleRequest',
        UpdateComingNextRequest: 'UpdateComingNextRequest',
        PlayersPoolReady: 'PlayersPoolReady',
        QueueModified: 'QueueModified',
        QueueEntryActivated: 'QueueEntryActivated',
        QueueCleared: 'QueueCleared',
        PlaybackStateChanged: 'PlaybackStateChanged'
    };

    mt.model = {
        Video: function () {
            /** @type {string} */
            this.id = undefined;
            /** @type {string} */
            this.title = undefined;
            /** @type {string} */
            this.thumbnailUrl = undefined;
            /** @type {number} */
            this.duration = undefined;
            /** @type {number} */
            this.viewCount = undefined;
            /** @type {string} */
            this.publisherName = undefined;
            /** @type {string} */
            this.provider = undefined;
        },
        QueueEntry: function () {
            /** @type {string} */
            this.id = undefined;
            /** @type {mt.model.Video} */
            this.video = undefined;
        },
        Queue: function () {
            /** @type {string} */
            this.name = undefined;
            /** @type {Array.<mt.model.QueueEntry} */
            this.entries = [];
        }
    };

    mt.tools = {};

    /**
     * Generates a "unique" id.
     *
     * @return {string}
     */
    mt.tools.uniqueId = function () {
        return _.uniqueId('mt_uid_');
    };

    /**
     * Pads a string to the left.
     *
     * @param string the string to pad
     * @param length the expected length after padding
     * @param padString the string to pad with
     * @return {string}
     */
    mt.tools.leftPad = function (string, length, padString) {
        if (!angular.isString(string)) throw new Error('The string parameter should be a string');

        while (string.length < length) {
            string = padString + string;
        }
        return string;
    };

    /**
     * Capitalize (first letter to uppercase) the given string.
     *
     * @param {string} string
     * @return {string}
     */
    mt.tools.capitalize = function (string) {
        if (!angular.isString(string)) throw new Error('The string parameter should be a string');

        return string.substr(0, 1).toUpperCase() + string.substr(1);
    };

})(window.mt = window.mt || {});