(function (mt) {
    mt.MixTubeApp.factory('mtYoutubeClient', function ($http, $resource, $q, mtConfiguration) {

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

        /**
         * Returns a list of details for videos for the given ids (duration and view count).
         *
         * Note : The durations are in milliseconds for convenience but the precision is actually smaller (seconds).
         *
         * @param {Array.<string>} ids the youtube videos ids
         * @return {Promise} a promise of detailed {@link  mt.model.Video}
         */
        var listVideosByIds = function (ids) {
            var deferred = $q.defer();

            $http.jsonp('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    id: ids.join(','),
                    part: 'snippet,statistics,contentDetails',
                    callback: 'JSON_CALLBACK',
                    key: mtConfiguration.youtubeAPIKey
                }
            }).success(function (response) {
                    var videos = [];
                    response.items.forEach(function (item) {
                        var video = {};
                        video.id = item.id;
                        video.duration = convertISO8601DurationToMillis(item.contentDetails.duration);
                        video.viewCount = item.statistics.viewCount;
                        videos.push(video);
                    });
                    deferred.resolve(videos);
                }).error(deferred.reject);

            return deferred.promise;
        };

        /**
         * @param {Array.<string>} ids
         * @return {Promise} a promise of Array.<{id: string, name: string}>
         */
        var listByIds = function (ids) {
            var deferred = $q.defer();

            $http.jsonp('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    id: ids.join(','),
                    part: 'snippet',
                    callback: 'JSON_CALLBACK',
                    key: mtConfiguration.youtubeAPIKey
                }
            }).success(function (response) {
                    var channels = [];
                    response.items.forEach(function (item) {
                        channels.push({id: item.id, name: item.snippet.title});
                    });
                    deferred.resolve(channels);
                }).error(deferred.reject);

            return deferred.promise;
        };

        return {
            /**
             * Searches the 20 first videos on youtube matching the query.
             *
             * The goal is to provide lite results as fast as possible and upgrade each item when is more details are available.
             * It is impossible to get all the properties in one shot because of the design of the Youtube API.
             *
             * The videos objects are passed by callback to be able to update the model as the details arrive.
             * The callback parameter is an array of {@link mt.model.Video} for the first call and a projection of
             * videos after with only the properties available at the execution time.
             *
             * @param {string} queryString the query as used for a classic youtube search
             * @param {function(Array.<(mt.model.Video|Object)>)} dataCallback executed each time we receive additional data.
             */
            searchVideosByQuery: function (queryString, dataCallback) {
                var deferred = $q.defer();

                $http.jsonp('https://www.googleapis.com/youtube/v3/search', {
                    params: {
                        q: queryString,
                        type: 'video',
                        part: 'snippet',
                        order: 'relevance',
                        maxResults: mtConfiguration.maxSearchResults,
                        callback: 'JSON_CALLBACK',
                        key: mtConfiguration.youtubeAPIKey
                    }
                }).success(function (response) {
                        var videos = [];
                        var videoIdxById = {};
                        var videosIds = [];
                        var channelsIds = [];

                        var index = 0;
                        response.items.forEach(function (item) {
                            var video = new mt.model.Video();
                            video.id = item.id.videoId;
                            video.title = item.snippet.title;
                            video.thumbnailUrl = item.snippet.thumbnails.medium.url
                            video.provider = 'youtube';
                            // temporary store the channel, see bellow
                            video.__youtubeChannelId = item.snippet.channelId;

                            videos.push(video);
                            videoIdxById[video.id] = index;
                            videosIds.push(video.id);
                            channelsIds.push(item.snippet.channelId);

                            index++;
                        });

                        listVideosByIds(videosIds).then(function (videoProjections) {
                            // extend the current videos collections with new properties
                            videoProjections.forEach(function (videoProjection) {
                                var videoIdx = videoIdxById[videoProjection.id];
                                var video = videos[videoIdx];
                                angular.extend(video, videoProjection);
                            });

                            dataCallback(videos);
                        });

                        listByIds(channelsIds).then(function (channelProjections) {
                            // index the channels by their ids
                            var channelByIds = {};
                            channelProjections.forEach(function (channelProjection) {
                                channelByIds[channelProjection.id] = channelProjection;
                            });

                            // extend the video with the publisher name, for youtube it is the channel name
                            videos.forEach(function (video) {
                                video.publisherName = channelByIds[video.__youtubeChannelId].name;
                                delete video.__youtubeChannelId;
                            });

                            dataCallback(videos);
                        });

                        dataCallback(videos);
                    }).error(deferred.reject);

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

                $http.jsonp('https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        id: id,
                        part: 'id',
                        callback: 'JSON_CALLBACK',
                        key: mtConfiguration.youtubeAPIKey
                    }
                }).success(function (response) {
                        deferred.resolve(response.items.length > 0);
                    }).error(deferred.reject);

                return deferred.promise;
            }
        };
    });

    mt.MixTubeApp.factory('mtKeyboardShortcutManager', function ($location, $rootScope) {
        /** @type {Object.<String, Function> */
        var contexts = {};
        /** @type {Array.<String>} */
        var contextStack = [];

        var bindContext = function (name) {
            if (contexts.hasOwnProperty(name)) {
                angular.forEach(contexts[name], function (callback, combo) {
                    Mousetrap.bind(combo, function () {
                        $rootScope.$apply(callback);
                    });
                });
            }
        };

        var unbindContext = function (name) {
            if (contexts.hasOwnProperty(name)) {
                angular.forEach(contexts[name], function (callback, combo) {
                    Mousetrap.unbind(combo);
                });
            }
        };

        return {
            /**
             * Registers a shortcut for the in the given context.
             *
             * @param {String} context the context name
             * @param {String} combo
             * @param {Function} callback
             */
            register: function (context, combo, callback) {
                var callbackByCombo = contexts[context] = contexts.hasOwnProperty(context) ? contexts[context] : {};
                callbackByCombo[combo] = callback;
            },
            /**
             * Unbinds the previous context shortcuts and binds the new ones.
             *
             * @param {String} name the context name
             */
            enterContext: function (name) {
                if (contextStack.length > 0) {
                    unbindContext(contextStack[contextStack.length - 1]);
                }

                contextStack.push(name);
                bindContext(name);
            },
            /**
             * Unbind the current context and restore the previous one.
             *
             * Calls to enter / leave should be balanced.
             *
             * @param {String} name context name
             */
            leaveContext: function (name) {
                var popped = contextStack.pop();
                if (name !== popped) throw new Error('Can not pop context ' + name + ' probably because of unbalanced enter / leave calls , found ' + popped);

                unbindContext(name);
                if (contextStack.length > 0) {
                    bindContext(contextStack[contextStack.length - 1]);
                }
            }
        };
    });

    mt.MixTubeApp.factory('mtConfiguration', function ($location) {
        return {
            get transitionStartTime() {
                return 'test.duration' in $location.search() ? parseInt($location.search()['test.duration'], 10) : -1000;
            },
            get transitionDuration() {
                return 1000;
            },
            get initialSearchResults() {
                return 'test.searchResults' in $location.search() ? mt.tools.TEST_VIDEOS : [];
            },
            get initialQueueEntries() {
                return 'test.queue' in $location.search() ?
                    mt.tools.TEST_VIDEOS.map(function (video) {
                        var queueEntry = new mt.model.QueueEntry();
                        queueEntry.id = mt.tools.uniqueId();
                        queueEntry.video = video;
                        return queueEntry;
                    }) : [];
            },
            get initialSearchOpen() {
                return 'test.searchOpen' in $location.search();
            },
            youtubeAPIKey: 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg',
            maxSearchResults: 20
        };
    });

    mt.MixTubeApp.factory('mtLoggerFactory', function ($window) {
        var console = $window.console;
        var loggerByName = {};

        function prepareLogTrace(arguments, loggerName) {
            var now = new Date();
            var newArguments = [];
            newArguments[0] = '[%d:%d:%d] %s : ' + arguments[0];
            newArguments[1] = now.getHours();
            newArguments[2] = now.getMinutes();
            newArguments[3] = now.getSeconds();
            newArguments[4] = loggerName;
            for (var idx = 1; idx < arguments.length; idx++) {
                newArguments[idx + 4] = arguments[idx];
            }
            return newArguments;
        }

        function Logger(name) {
            this.name = name;
        }

        Logger.prototype = {
            log: function () {
                this.delegate(console.log, arguments);
            },
            dir: function () {
                this.delegate(console.dir, arguments);
            },
            debug: function () {
                this.delegate(console.debug, arguments);
            },
            delegate: function (targetFn, delegateArguments) {
                targetFn.apply(console, prepareLogTrace(delegateArguments, this.name));
            }
        };

        return {
            /**
             * Returns a logger fir the given name or the global logger if no name provided.
             *
             * @param {string=} name the logger name. Empty means global logger.
             */
            logger: function (name) {
                var loggerName = angular.isDefined(name) ? name : 'global';
                if (!loggerByName.hasOwnProperty(loggerName)) {
                    loggerByName[loggerName] = new Logger(loggerName);
                }
                return loggerByName[loggerName];
            }
        };
    });
})(mt);