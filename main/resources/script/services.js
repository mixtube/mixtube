(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp.factory('mtVideoPlayerManager', function ($rootScope, $q, mtPlayerPoolProvider, mtQueueManager, mtYoutubeClient, mtConfiguration, mtLoggerFactory) {
        var logger = mtLoggerFactory.logger('mtVideoPlayerManager');

        var selfData = {};

        /** @type {mt.player.PlayersPool} */
        selfData.playersPool = undefined;
        /** @type {mt.player.VideoHandle} */
        selfData.currentVideoHandle = undefined;
        /** @type {mt.player.Video} */
        selfData.currentVideo = undefined;
        /** @type {mt.player.VideoHandle} */
        selfData.nextVideoHandle = undefined;
        /** @type {mt.player.Video} */
        selfData.nextVideo = undefined;
        /**  @type {boolean} */
        selfData.playing = false;
        /** @type {Object.<string, mt.model.QueueEntry>} */
        selfData.queueEntryByHandleId = {};

        mtPlayerPoolProvider.get().then(function (playersPool) {
            selfData.playersPool = playersPool;
        });

        /**
         * Returns the queue entry id that is associated to the given video handle id, and removes the mapping from the dictionary.
         *
         * @param {string} videoHandleId
         * @return {mt.model.QueueEntry}
         */
        var peekQueueEntryByHandleId = function (videoHandleId) {
            var entry = selfData.queueEntryByHandleId[videoHandleId];
            delete selfData.queueEntryByHandleId[videoHandleId];
            return entry;
        };

        /**
         * Executes the video transition steps :
         * - starts the prepared video
         * - references the prepared video as the new current one
         * - cross fades the videos (out the current one / in the prepared one)
         * - disposes the previous (the old current) video
         * - broadcasts events to notify if the new state
         * - sends a request to get the next video references
         */
        var executeTransition = function () {
            if (selfData.currentVideoHandle) {
                selfData.currentVideoHandle.out(mtConfiguration.transitionDuration).done(function (videoHandle) {
                    videoHandle.dispose();
                });
            }

            selfData.currentVideoHandle = selfData.nextVideoHandle;
            selfData.currentVideo = selfData.nextVideo;
            selfData.nextVideoHandle = undefined;
            selfData.nextVideo = undefined;

            // if there is a a current video start it, else it's the end of the sequence
            if (selfData.currentVideoHandle) {
                selfData.playing = true;
                selfData.currentVideoHandle.in(mtConfiguration.transitionDuration);

                // now that the new video is running ask for the next one

                var activatedQueueEntry = peekQueueEntryByHandleId(selfData.currentVideoHandle.id);
                mtQueueManager.positionPlaybackEntry(activatedQueueEntry);

                mtQueueManager.nextValidQueueEntry().then(function (queueEntry) {
                    loadQueueEntry(queueEntry, false);
                });
            } else {
                // end of the road
                selfData.playing = false;
            }
        };

        var triggerComingNext = function () {
            $rootScope.$broadcast(mt.events.UpdateComingNextRequest, {
                currentVideo: selfData.currentVideo,
                nextVideo: selfData.nextVideo
            });
        };

        /**
         * Properly clears the next video handle by disposing it and clearing all the references to it.
         */
        var clearNextVideoHandle = function () {
            logger.debug('A handle (%s) for next video has been prepared, we need to dispose it', selfData.nextVideoHandle.uid);

            // the next video has already been prepared, we have to dispose it before preparing a new one
            peekQueueEntryByHandleId(selfData.nextVideoHandle.id);
            selfData.nextVideoHandle.dispose();
            selfData.nextVideoHandle = undefined;
            selfData.nextVideo = undefined;
        };

        var playbackToggle = function () {
            if (selfData.currentVideoHandle) {
                if (selfData.playing) {
                    selfData.playing = false;
                    selfData.currentVideoHandle.pause();
                } else {
                    selfData.playing = true;
                    selfData.currentVideoHandle.unpause();
                }
            } else {
                mtQueueManager.nextValidQueueEntry().then(function (queueEntry) {
                    loadQueueEntry(queueEntry, true);
                });
            }
        };

        var relativeTimeToAbsolute = function (relTime, duration) {
            return relTime > 0 ? relTime : duration + relTime;
        };

        var loadQueueEntry = function (queueEntry, autoplay) {
            logger.debug('Start request for video %s received with autoplay flag %s', queueEntry.video.id, autoplay);

            var transitionStartTime = relativeTimeToAbsolute(mtConfiguration.transitionStartTime, queueEntry.video.duration);
            var comingNextStartTime = relativeTimeToAbsolute(mtConfiguration.comingNextStartTime, queueEntry.video.duration);
            logger.debug('Preparing a video %s, the coming next cue will start at %d, the transition cue will start at %d', queueEntry.video.id, comingNextStartTime, transitionStartTime);

            selfData.nextVideoHandle = selfData.playersPool.prepareVideo({
                id: queueEntry.video.id,
                provider: queueEntry.video.provider,
                coarseDuration: queueEntry.video.duration
            }, [
                {time: comingNextStartTime, callback: function () {
                    $rootScope.$apply(function () {
                        triggerComingNext();
                    });
                }},
                {time: transitionStartTime, callback: function () {
                    // starts the next prepared video and cross fade
                    $rootScope.$apply(function () {
                        executeTransition();
                    });
                }}
            ]);
            selfData.nextVideo = queueEntry.video;

            selfData.queueEntryByHandleId[selfData.nextVideoHandle.id] = queueEntry;

            var nextLoadDeferred = selfData.nextVideoHandle.load();

            if (autoplay) {
                nextLoadDeferred.done(function () {
                    $rootScope.$apply(function () {
                        executeTransition();
                    });
                });
            }
        };

        var clear = function () {
            if (selfData.nextVideoHandle) {
                clearNextVideoHandle();
            }
            if (selfData.currentVideoHandle) {
                selfData.playing = false;
                selfData.currentVideoHandle.dispose();
                selfData.currentVideoHandle = undefined;
                selfData.currentVideo = undefined;
            }
        };

        var replaceNextVideoHandle = function () {
            logger.debug('Received a QueueModified event with relevant position %s', JSON.stringify(relevantPositions));

            // a change in queue require the player to query for the next video
            if (selfData.nextVideoHandle) {
                clearNextVideoHandle();
            }
            mtQueueManager.nextValidQueueEntry().then(function (queueEntry) {
                loadQueueEntry(queueEntry, false);
            });
        };

        // watch on object full equality
        $rootScope.$watch(function () {
            return mtQueueManager.queue.entries;
        }, function () {
            if (mtQueueManager.queue.entries.length === 0) {
                // the queue is empty, probably just cleared, do the same for the player
                clear();
            } else {
                // we want to know if the next queue entry changed so that we can tell the video player manager to prepare it
                mtQueueManager.nextValidQueueEntry().then(function (nextQueueEntry) {
                    var needReplacingNextHandle;

                    if (!selfData.nextVideoHandle) {
                        if (nextQueueEntry) {
                            // we were a the last position in the queue and a video was added just after
                            needReplacingNextHandle = true;
                        }
                    } else {
                        // is the next prepared handle stall ?
                        var preparedQueueEntry = selfData.queueEntryByHandleId[selfData.nextVideoHandle.id];
                        needReplacingNextHandle = preparedQueueEntry !== nextQueueEntry;
                    }

                    if (needReplacingNextHandle) {
                        replaceNextVideoHandle();
                    }
                });
            }
        }, true);


        return {
            get playing() {
                return  selfData.playing;
            },

            /**
             * @param {{queueEntry: mt.model.QueueEntry, autoplay: boolean}} params
             */
            loadQueueEntry: function (params) {
                loadQueueEntry(params);
            },

            playbackToggle: function () {
                playbackToggle();
            },

            clear: function () {
                clear();
            }
        };
    });

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

        /**
         * @param {number} startPosition the position from where to start to look for the next valid video
         */
        var nextValidQueueEntry = function (startPosition) {
            var deferred = $q.defer();
            var tryPosition = startPosition + 1;

            if (tryPosition < queue.entries.length) {
                var queueEntry = queue.entries[tryPosition];

                mtYoutubeClient.pingVideoById(queueEntry.video.id).then(function (videoExists) {
                    if (videoExists) {
                        deferred.resolve(queueEntry);
                    } else {
                        nextValidQueueEntry(tryPosition).then(deferred.resolve);
                    }
                });
            } else {
                deferred.reject();
            }

            return deferred.promise;
        };

        // initialize queue
        var queue = new mt.model.Queue();
        /** @type {mt.model.QueueEntry=} */
        var playbackEntry;

        return {
            /**
             * @returns {mt.model.Queue}
             */
            get queue() {
                return queue;
            },

            /**
             * @returns {mt.model.QueueEntry}
             */
            get playbackEntry() {
                return playbackEntry;
            },

            /**
             * @param {mt.model.Video} video
             * @return {mt.mode.QueueEntry} the newly created entry in the queue
             */
            appendVideo: function (video) {
                var queueEntry = new mt.model.QueueEntry();
                queueEntry.id = mt.tools.uniqueId();
                queueEntry.video = video;
                queue.entries.push(queueEntry);
                return queueEntry;
            },

            /**
             * @param {mt.model.QueueEntry} entry
             */
            removeEntry: function (entry) {
                var index = queue.entries.indexOf(entry);
                queue.entries.splice(index, 1);
            },

            clear: function () {
                queue.entries = [];
                playbackEntry = undefined;
            },

            /**
             * Notify the queue manager of the entry playing henceforth.
             *
             * @param {mt.model.QueueEntry} entry
             */
            positionPlaybackEntry: function (entry) {
                var entryPosition = queue.entries.indexOf(entry);
                if (entryPosition === -1) {
                    throw new Error('The given entry is not in the queue array');
                }

                playbackEntry = entry;
            },

            /**
             * Finds the first next video in the queue that exists.
             *
             * Video can be removed from the remote provider so we have to check that before loading a video to prevent
             * playback interruption.
             *
             * @return {Promise} a promise with that provides the video instance when an existing video is found
             */
            nextValidQueueEntry: function () {
                var startPosition = playbackEntry ? queue.entries.indexOf(playbackEntry) : 0;
                if (startPosition === -1) {
                    // something is seriously broken here
                    throw new Error('The active entry from the queue manager is not in the queue array');
                }

                return nextValidQueueEntry(startPosition);
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

    mt.MixTubeApp.factory('mtUserInteractionManager', function ($timeout) {
        /**
         * @const
         * @type {number}
         */
        var TRAILING_DELAY = 1000;

        /** @type {boolean} */
        var overQueueFrame;
        /** @type {boolean} */
        var mouseMoving;
        /** @type {boolean} */
        var searchVisible;

        /** @type {promise} */
        var overQueueFramePromise;
        /** @type {promise} */
        var mouseMovingPromise;

        return {
            /**
             * Is the user actively interacting with the UI.
             *
             * @returns {boolean}
             */
            get userInteracting() {
                return overQueueFrame || mouseMoving || searchVisible;
            },
            enteredQueueFrame: function () {
                $timeout.cancel(overQueueFramePromise);
                overQueueFrame = true;
            },
            leavedQueueFrame: function () {
                overQueueFramePromise = $timeout(function () {
                    overQueueFrame = false;
                }, TRAILING_DELAY);
            },
            mouseStarted: function () {
                $timeout.cancel(mouseMovingPromise);
                mouseMoving = true;
            },
            mouseStopped: function () {
                mouseMovingPromise = $timeout(function () {
                    mouseMoving = false;
                }, TRAILING_DELAY);
            },
            searchOpened: function () {
                searchVisible = true;
            },
            searchClosed: function () {
                searchVisible = false;
            }
        };
    });

    mt.MixTubeApp.factory('mtKeyboardShortcutManager', function ($rootScope) {
        /** @type {Object.<String, Function>} */
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

        /** @type {Object.<string, Logger>} */
        var loggerByName = {};

        var Logger = {
            init: function (name) {
                this.name = name;
            },
            log: function () {
                this.delegate($log.log, arguments);
            },
            debug: function () {
                this.delegate($log.debug, arguments);
            },
            delegate: function (targetFn, origArgs) {

                var origPattern = _.first(origArgs);
                var origParams = _.rest(origArgs);

                // prepend extra info to the original pattern (time and logger name)
                var pattern = '[%s:%s:%s] %s : ' + origPattern;

                // prepend time original params
                var now = new Date();
                var extraParams = [now.getHours(), now.getMinutes(), now.getSeconds()].map(function (timePart) {
                    return mt.tools.leftPad(timePart.toString(10), 2, '0');
                });

                // prepend logger name
                extraParams.push(this.name);

                // concatenate everything
                var params = extraParams.concat(origParams);

                var idxParams = 0;
                var formatted = pattern.replace(TOKEN_REGEXP, function () {
                    return params[idxParams++];
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
                    var newLogger = Object.create(Logger);
                    newLogger.init(loggerName);
                    loggerByName[loggerName] = newLogger;
                }
                return loggerByName[loggerName];
            }
        };
    });
})(mt);