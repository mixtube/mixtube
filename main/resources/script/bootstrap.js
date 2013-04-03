(function (mt) {
    mt.MixTubeApp = angular.module('mtMixTubeApp', ['ngResource'])
        .config(function ($locationProvider) {
            $locationProvider.html5Mode(true);
        }).run(function ($rootScope, mtLoggerFactory) {
            var wordCharRegExp = /\w/;
            document.addEventListener('keyup', function (evt) {
                if (!Mousetrap.stopCallback(evt, evt.target || evt.srcElement)) {
                    var convertedString = String.fromCharCode(evt.which);
                    if (wordCharRegExp.test(convertedString)) {
                        $rootScope.$apply(function () {
                            $rootScope.$broadcast(mt.events.OpenSearchFrameRequest, {typedChar: convertedString});
                        });
                    }
                }
            });

            // executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application
            // that it is ready
            window.onYouTubeIframeAPIReady = function () {
                var playersPool = new mt.player.PlayersPool(function () {
                    var playerDiv = document.createElement('div');
                    playerDiv.classList.add('mt-player-frame');
                    document.getElementById('mt-video-window').appendChild(playerDiv);
                    return playerDiv;
                }, mtLoggerFactory.logger('PlayersPool'));

                $rootScope.$apply(function () {
                    $rootScope.$broadcast(mt.events.PlayersPoolReady, playersPool);
                });
            };
        });

    mt.events = {
        LoadQueueEntryRequest: 'LoadQueueEntryRequest',
        NextQueueEntryRequest: 'NextQueueEntryRequest',
        OpenSearchFrameRequest: 'OpenSearchFrameRequest',
        AppendVideoToQueueRequest: 'AppendVideoToQueueRequest',
        PlaybackToggleRequest: 'PlaybackToggleRequest',
        PlayersPoolReady: 'PlayersPoolReady',
        QueueModified: 'QueueModified',
        QueueEntryActivated: 'QueueEntryActivated',
        QueueCleared: 'QueueCleared',
        PlaybackStateChanged: 'PlaybackStateChanged'
    };

    mt.model = {
        Video: function () {
            this.id = undefined;
            this.title = undefined;
            this.thumbnailUrl = undefined;
            this.duration = undefined;
            this.viewCount = undefined;
            this.provider = undefined;
        },
        QueueEntry: function () {
            this.id = undefined;
            this.video = undefined;
        }
    };

    mt.tools = {__uniqueIdCounter: 0};

    /**
     * Finds the first elements in a array where the properties match the ones given.
     *
     * @param {Array} array the arrays to look into
     * @param {Object} properties the filter
     * @return {?Object} the found element or null
     */
    mt.tools.findWhere = function (array, properties) {
        var result = array.filter(function (value) {
            for (var key in properties) {
                if (properties[key] !== value[key]) return false;
            }
            return true;
        });
        return result.length > 0 ? result[0] : null;
    };

    /**
     * Generates a "unique" id.
     *
     * @return {string}
     */
    mt.tools.uniqueId = function () {
        return 'mt_uid_' + mt.tools.__uniqueIdCounter++;
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