(function (mt) {

    mt.MixTubeApp.factory('mtQueueManager', function ($q, mtYoutubeClient, mtLoggerFactory) {
        var logger = mtLoggerFactory.logger('mtQueueManager');

        var serialize = function (queue) {
            var buffer = [];

            buffer.push((queue.name || ''));
            queue.entries.forEach(function (queueEntry) {
                buffer.push(mtYoutubeClient.shortName + queueEntry.video.id);
            });

            var jsonString = JSON.stringify(buffer);
            // remove useless array delimiters because we are actually not using it as an array
            return jsonString.substr(1, jsonString.length - 2);
        };

        var deserialize = function (input) {
            // add removed array delimiters
            var buffer = JSON.parse('[' + input + ']');

            var queue = new mt.model.Queue();
            queue.name = buffer[0];

            var youtubeVideosIds = [];
            for (var idx = 1; idx < buffer.length; idx++) {
                var serializedEntry = buffer[idx];
                if (serializedEntry.indexOf(mtYoutubeClient.shortName) === 0) {
                    youtubeVideosIds.push(serializedEntry.substring(mtYoutubeClient.shortName.length));
                } else {
                    logger.debug('Unable to find a provider for serialized entry %s', serializedEntry);
                }
            }

            var deferred = $q.defer();
            mtYoutubeClient.listVideosByIds(youtubeVideosIds).then(function (videos) {
                videos.forEach(function (video) {
                    var queueEntry = new mt.model.QueueEntry();
                    queueEntry.id = mt.tools.uniqueId();
                    queueEntry.video = video;
                    queue.entries.push(queueEntry);
                });
                deferred.resolve(queue);
            });
            return deferred.promise;
        };

        // initialize queue
        var queue = new mt.model.Queue();

        return {
            /**
             * @returns {mt.model.Queue}
             */
            get queue() {
                return queue;
            },

            /**
             * Deserialize the queue from the given string.
             *
             * @param {String} serialized
             */
            deserialize: function (serialized) {
                deserialize(serialized).then(function (newQueue) {
                    // remove invalid entries
                    newQueue.entries = newQueue.entries.filter(function (entry) {
                        return entry.video.hasOwnProperty('publisherName');
                    });
                    // replacing the queue object prevents the Angular digest / watch mechanism to work
                    // by extending the object it allows it to detect the changes
                    angular.extend(queue, newQueue);
                });
            },

            /**
             * Serialize the queue.
             *
             * @returns {String} the serialized version of the queue
             */
            serialize: function () {
                return serialize(queue);
            }
        };
    });

    mt.MixTubeApp.factory('mtYoutubeClient', function ($http, $q, mtConfiguration) {

        var SHORT_NAME = 'yo';

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

        var extendVideosWithDetails = function (videos) {
            var deferred = $q.defer();
            var videosIds = _.pluck(videos, 'id');

            $http.jsonp('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    id: videosIds.join(','),
                    part: 'snippet,statistics,contentDetails',
                    callback: 'JSON_CALLBACK',
                    key: mtConfiguration.youtubeAPIKey
                }
            }).success(function (response) {
                    var videoDetailsById = {};
                    response.items.forEach(function (item) {
                        videoDetailsById[item.id] = {
                            id: item.id,
                            title: item.snippet.title,
                            thumbnailUrl: item.snippet.thumbnails.medium.url,
                            provider: 'youtube',
                            duration: convertISO8601DurationToMillis(item.contentDetails.duration),
                            viewCount: parseInt(item.statistics.viewCount, 10),
                            // temporary store the channel, used after to add the video channel name
                            __youtubeChannelId: item.snippet.channelId
                        };
                    });

                    // extend the video with the details
                    videos.forEach(function (video) {
                        angular.extend(video, videoDetailsById[video.id]);
                    });

                    deferred.resolve(videos);
                }).error(deferred.reject);

            return deferred.promise;
        };

        var extendVideosWithChannels = function (videos) {
            var deferred = $q.defer();
            var channelsIds = _.pluck(videos, '__youtubeChannelId');

            $http.jsonp('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    id: channelsIds.join(','),
                    part: 'snippet',
                    callback: 'JSON_CALLBACK',
                    key: mtConfiguration.youtubeAPIKey
                }
            }).success(function (response) {
                    var channelByIds = {};
                    response.items.forEach(function (item) {
                        channelByIds[item.id] = {id: item.id, name: item.snippet.title};
                    });

                    // extend the video with the publisher name, for youtube it is the channel name
                    videos.forEach(function (video) {
                        if (video.hasOwnProperty('__youtubeChannelId')) {
                            video.publisherName = channelByIds[video.__youtubeChannelId].name;
                            delete video.__youtubeChannelId;
                        }
                    });

                    deferred.resolve(videos);
                }).error(deferred.reject);

            return deferred.promise;
        };

        return {
            get shortName() {
                return SHORT_NAME;
            },

            /**
             * Lists the videos for the given ids.
             *
             * The returned collection always contains video pseudo objects (projection of {@link mt.model.Video} with at
             * least the id. That doesn't mean that it was found, check properties values to know if it was.
             *
             * @param {Array.<string>} ids the list of youtube videos ids
             * @returns {Array.<mt.model.Video>} a list of pseudo video
             */
            listVideosByIds: function (ids) {
                var deferred = $q.defer();
                // prepare an array of pseudo videos that have only the id property defined
                var videos = ids.map(function (id) {
                    return {id: id};
                });

                extendVideosWithDetails(videos).then(function (videos) {
                    extendVideosWithChannels(videos).then(deferred.resolve, deferred.reject);
                }, deferred.reject);

                return deferred.promise;
            },

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
             * @param {function(Array.<(mt.model.Video)>)} dataCallback executed each time we receive additional data
             */
            searchVideosByQuery: function (queryString, dataCallback) {
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
                        var videos = response.items.map(function (item) {
                            return {
                                id: item.id.videoId,
                                title: item.snippet.title,
                                thumbnailUrl: item.snippet.thumbnails.medium.url,
                                provider: 'youtube',
                                // temporary store the channel, used after to add the video channel name
                                __youtubeChannelId: item.snippet.channelId
                            };
                        });

                        dataCallback(videos);
                        extendVideosWithDetails(videos).then(dataCallback);
                        extendVideosWithChannels(videos).then(dataCallback);
                    });
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

    mt.MixTubeApp.factory('mtPlayerPoolProvider', function ($rootScope, $q, mtLoggerFactory) {
        var deferred = $q.defer();

        // executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application that it is ready
        var playersPool = new mt.player.PlayersPool(function () {
            var $playerDiv = jQuery('<div>', {'class': 'mt-video-player-instance'});
            $('.mt-video-player-window').append($playerDiv);
            return $playerDiv[0];
        }, mtLoggerFactory.logger('PlayersPool'));

        mtLoggerFactory.logger('mtMixTubeApp#run').debug('Youtube iFrame API ready and players pool created');

        deferred.resolve(playersPool);

        return {
            'get': function () {
                return deferred.promise;
            }
        }
    });

    mt.MixTubeApp.factory('mtKeyboardShortcutManager', function ($rootScope) {
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

        var transitionStartTime = 'test.duration' in $location.search() ? parseInt($location.search()['test.duration'], 10) : -5000;

        return  {
            get transitionStartTime() {
                return transitionStartTime;
            },
            get transitionDuration() {
                return 5000;
            },
            get initialSearchResults() {
                return 'test.searchResults' in $location.search() ? mt.tools.TEST_VIDEOS : [];
            },
            get initialSearchOpen() {
                return 'test.searchOpen' in $location.search();
            },
            get youtubeAPIKey() {
                return 'AIzaSyBg_Es1M1hmXUTXIj_FbjFu2MIOqpJFzZg';
            },
            get maxSearchResults() {
                return 20;
            },
            get comingNextStartTime() {
                return transitionStartTime - 5000;
            },
            get comingNextDuration() {
                return 10000;
            }
        };
    });

    mt.MixTubeApp.factory('mtLoggerFactory', function ($log) {

        /**
         * @type {RegExp}
         * @const
         */
        var TOKEN_REGEXP = /%s|%d/g;

        var loggerByName = {};

        function prepareLogTrace(arguments, loggerName) {
            var now = new Date();
            var newArguments = [];
            newArguments[0] = '[%s:%s:%s] %s : ' + arguments[0];
            newArguments[1] = mt.tools.leftPad(now.getHours().toString(10), 2, '0');
            newArguments[2] = mt.tools.leftPad(now.getMinutes().toString(10), 2, '0');
            newArguments[3] = mt.tools.leftPad(now.getSeconds().toString(10), 2, '0');
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
                this.delegate($log.log, arguments);
            },
            debug: function () {
                this.delegate($log.debug, arguments);
            },
            delegate: function (targetFn, delegateArguments) {
                var preparedArguments = prepareLogTrace(delegateArguments, this.name);

                var pattern = preparedArguments[0];
                // parameters starts at position 1 because 0 is the whole pattern
                var idx = 1;

                var formatted = pattern.replace(TOKEN_REGEXP, function (token) {
                    return preparedArguments[idx++].toString();
                });

                // extra empty string is to make AngularJS's IE9 log polyfill happy, else it appends "undefined" to the log trace
                targetFn.apply(console, [formatted, '']);
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