(function (mt) {
    mt.MixTubeApp.factory('mtYoutubeClient', function ($resource, $q) {

        /**
         * Allow to parse "exotic" time format form Youtube data API.
         *
         * @const
         * @type {RegExp}
         */
        var ISO8601_REGEXP = /PT(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/;

        /**
         * Converts a ISO8601 duration string to a duration in milliseconds.
         *
         * @param duration {string} 'PT#H#M#S' format where H, M and S refer to length in hours, minutes and seconds
         * @return {number} the duration in milliseconds
         */
        function convertISO8601DurationToMillis(duration) {
            var execResult = ISO8601_REGEXP.exec(duration);
            var hours = parseInt(execResult[1]) || 0;
            var minutes = parseInt(execResult[2]) || 0;
            var seconds = parseInt(execResult[3]) || 0;
            return (hours * 3600 + minutes * 60 + seconds) * 1000;
        }

        var searchResource = $resource('https://www.googleapis.com/youtube/v3/search',
            {
                key: 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg',
                maxResults: 10,
                type: 'video',
                part: 'id,snippet',
                callback: 'JSON_CALLBACK'
            }, {query: {method: 'JSONP', isArray: false}}
        );

        var videosResource = $resource('https://www.googleapis.com/youtube/v3/videos',
            {
                key: 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg',
                part: 'contentDetails',
                callback: 'JSON_CALLBACK'
            }, {query: {method: 'JSONP'}}
        );

        return {
            /**
             * Searches the 10 first videos on youtube matching the query.
             *
             * @param {string} queryString the query as used for a classic youtube search
             * @return {Promise} a promise of {@link  mt.model.Video}
             */
            searchVideosByQuery: function (queryString) {
                var deferred = $q.defer();

                searchResource.query({q: queryString}, function (response) {
                    var videos = [];
                    response.items.forEach(function (item) {
                        videos.push(new mt.model.Video(item.id.videoId, 'youtube', item.snippet.thumbnails.default.url));
                    });
                    deferred.resolve(videos);
                }, deferred.reject);

                return deferred.promise;
            },

            /**
             * Fetches videos durations for the supplied ids. The durations are in milliseconds for convenience but the
             * precision is actually smaller (seconds).
             *
             * @param ids {Array.<string>} the videos ids
             * @return {Promise} a promise of the durations in milliseconds indexed by videos ids
             */
            collectVideoDurationByIds: function (ids) {
                var deferred = $q.defer();

                var durationById = {};

                videosResource.query({id: ids.join(',')}, function (response) {
                    response.items.forEach(function (item) {
                        durationById[item.id] = convertISO8601DurationToMillis(item.contentDetails.duration);
                    });
                    deferred.resolve(durationById);
                }, deferred.reject);

                return deferred.promise;
            },

            /**
             * Checks if the supplied video id matches a existing video in Youtube system.
             *
             * @param {string} id the video id
             * @return {Promise} a promise that is resolved with true if the video exist, false else
             */
            pingVideoById: function (id) {
                var deferred = $q.defer();

                // todo use http backend instead because we don't use the rest of resource API
                // we use query instead of get because it seems that it is the only method of resource that can handle JSONP
                videosResource.query({id: id}, function (response) {
                    deferred.resolve(response.items.length > 0);
                }, deferred.reject);

                return deferred.promise;
            }
        };
    });

    mt.MixTubeApp.factory('mtLogger', function ($window) {
        function prependTime(arguments) {
            var now = new Date();
            var newArguments = [];
            newArguments[0] = '[%d:%d:%d] ' + arguments[0];
            newArguments[1] = now.getHours();
            newArguments[2] = now.getMinutes();
            newArguments[3] = now.getSeconds();
            for (var idx = 1; idx < arguments.length; idx++) {
                newArguments[idx + 3] = arguments[idx];
            }
            return newArguments;
        }

        return {
            log: function () {
                $window.console.log.apply($window.console, arguments)
            },
            dir: function () {
                $window.console.dir.apply($window.console, arguments)
            },
            debug: function () {
                $window.console.debug.apply($window.console, prependTime(arguments))
            }
        };
    });
})(mt);