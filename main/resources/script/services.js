(function (mt, undefined) {
    'use strict';

    mt.MixTubeApp.factory('mtVideoPlayerManager', function ($rootScope, $q, mtPlayerPoolProvider, mtQueueManager, mtYoutubeClient, mtConfiguration, mtLoggerFactory, mtAlert) {
        var logger = mtLoggerFactory.logger('mtVideoPlayerManager');

        /**
         * @type {{handle: mt.player.VideoHandle, entry: mt.model.QueueEntry, playDeferred: Deferred, init: Function}}
         */
        var PlaybackSlot = {
            handle: null,
            entry: null,
            playDeferred: null,
            /**
             * @param {mt.player.VideoHandle} handle
             * @param {mt.model.QueueEntry} entry
             * @param {Deferred} playDeferred
             */
            init: function (handle, entry, playDeferred) {
                this.handle = handle;
                this.entry = entry;
                this.playDeferred = playDeferred;
            }
        };

        /** @type {mt.player.PlayersPool} */
        var playersPool = null;
        /** @type {PlaybackSlot} */
        var previousSlot = null;
        /** @type {PlaybackSlot} */
        var currentSlot = null;
        /** @type {PlaybackSlot} */
        var nextSlot = null;
        /**  @type {boolean} */
        var playing = false;

        mtPlayerPoolProvider.get().then(function (pool) {
            playersPool = pool;
        });

        /**
         * Executes the video transition steps :
         * - starts the prepared video
         * - references the prepared video as the new current one
         * - cross fades the videos (out the current one / in the prepared one)
         */
        function executeTransition() {
            previousSlot = currentSlot;
            currentSlot = nextSlot;
            nextSlot = null;

            if (previousSlot) {
                previousSlot.handle.out(mtConfiguration.transitionDuration).done(function (handle) {
                    if (previousSlot.handle === handle) {
                        $rootScope.$apply(function () {
                            // prevents race condition: handle that just finished the out is still the current slot one
                            previousSlot = null;
                        });
                    }
                });
            }

            // if there is a a current video start it, else it's the end of the sequence
            if (currentSlot) {
                playing = true;
                currentSlot.handle.in(mtConfiguration.transitionDuration);

                // notify that we started to play the new entry
                currentSlot.playDeferred.resolve();

                // when the video starts playing, position the playback head and start loading the next one
                mtQueueManager.positionPlaybackEntry(currentSlot.entry);
                mtQueueManager.nextValidQueueEntry().then(function (queueEntry) {
                    loadQueueEntry(queueEntry, false);
                });
            } else {
                // end of the road
                playing = false;
            }
        }

        function executeComingNext() {
            $rootScope.$broadcast(mt.events.UpdateComingNextRequest, {
                currentVideo: currentSlot.entry.video,
                nextVideo: nextSlot.entry.video
            });
        }

        /**
         * Properly clears the next slot if needed by disposing it and clearing all the references to it.
         */
        function ensureNextSlotCleared() {
            if (nextSlot) {
                logger.debug('A handle (%s) for next video has been prepared, we need to dispose it', nextSlot.handle.uid);

                // the next video has already been prepared, we have to dispose it before preparing a new one
                nextSlot.handle.dispose();
                nextSlot = null;
            }
        }

        /**
         * Switches the queue between playing and paused. Handles the case where the queue was not playing.
         */
        function playbackToggle() {
            if (currentSlot) {
                if (playing) {
                    playing = false;
                    if (previousSlot) {
                        // in transition
                        previousSlot.handle.pause();
                    }
                    currentSlot.handle.pause();
                } else {
                    playing = true;
                    if (previousSlot) {
                        // in transition
                        previousSlot.handle.unpause();
                    }
                    currentSlot.handle.unpause();
                }
            } else {
                // if play action is requested on an non playing queue, the first item and force play
                mtQueueManager.nextValidQueueEntry().then(function (queueEntry) {
                    loadQueueEntry(queueEntry, true);
                });
            }
        }

        /**
         * Converts a milliseconds "relative" time (negative means from the end) to an "absolute" time (milliseconds
         * from the end).
         *
         * @param {number} relTime
         * @param {number} duration
         * @returns {number}
         */
        function relativeTimeToAbsolute(relTime, duration) {
            return relTime > 0 ? relTime : duration + relTime;
        }

        /**
         * @param {mt.model.QueueEntry} queueEntry
         * @param {boolean} forcePlay
         * @returns {promise} resolved when the loaded video starts playing
         */
        function loadQueueEntry(queueEntry, forcePlay) {

            var nextPlayDeferred = $q.defer();

            logger.debug('Start request for video %s received with forcePlay flag %s', queueEntry.video.id, forcePlay);

            var transitionStartTime = relativeTimeToAbsolute(mtConfiguration.transitionStartTime, queueEntry.video.duration);
            var comingNextStartTime = relativeTimeToAbsolute(mtConfiguration.comingNextStartTime, queueEntry.video.duration);
            logger.debug('Preparing a video %s, the coming next cue will start at %d, the transition cue will start at %d', queueEntry.video.id, comingNextStartTime, transitionStartTime);

            nextSlot = Object.create(PlaybackSlot);
            nextSlot.init(
                playersPool.prepareVideo({
                    id: queueEntry.video.id,
                    provider: queueEntry.video.provider,
                    coarseDuration: queueEntry.video.duration
                }, [
                    {time: comingNextStartTime, callback: function () {
                        $rootScope.$apply(function () {
                            executeComingNext();
                        });
                    }},
                    {time: transitionStartTime, callback: function () {
                        // starts the next prepared video and cross fade
                        $rootScope.$apply(function () {
                            executeTransition();
                        });
                    }}
                ]),
                queueEntry,
                nextPlayDeferred
            );

            var nextLoadJQDeferred = nextSlot.handle.load();

            if (forcePlay) {
                nextLoadJQDeferred.done(function () {
                    $rootScope.$apply(function () {
                        executeTransition();
                    });
                });
            }

            nextLoadJQDeferred.fail(function () {
                $rootScope.$apply(function () {
                    mtAlert.warning('Unable to preload "' + _.escape(nextSlot.entry.video.title) + '". Will be skipped.', 5000);

                    // flag the entry so that the we know that this entry is not valid
                    nextSlot.entry.skippedAtRuntime = true;
                    nextSlot.playDeferred.reject();

                    // now try to find the nex valid entry and load it if found
                    mtQueueManager.nextValidQueueEntry(nextSlot.entry).then(function (queueEntry) {
                        // keep the force play value of the original call
                        loadQueueEntry(queueEntry, forcePlay);
                    });

                    ensureNextSlotCleared();
                });
            });

            return nextPlayDeferred.promise;
        }

        function clear() {
            ensureNextSlotCleared();

            if (currentSlot) {
                playing = false;
                currentSlot.handle.dispose();
                currentSlot = null;
            }
        }

        // watch on object full equality
        // todo use watchCollection instead ?
        $rootScope.$watch(function () {
            return mtQueueManager.queue.entries;
        }, function () {
            if (mtQueueManager.queue.entries.length === 0) {
                // the queue is empty, probably just cleared, do the same for the player
                clear();
            } else if (currentSlot) {
                // we want to know if the next queue entry changed so that we can tell the video player manager to prepare it
                mtQueueManager.nextValidQueueEntry().then(function (nextQueueEntry) {
                    var needReplacingNextHandle;

                    if (!nextSlot) {
                        if (nextQueueEntry) {
                            // we were a the last position in the queue and a video was added just after
                            needReplacingNextHandle = true;
                        }
                    } else {
                        // is the next prepared handle stall ?
                        needReplacingNextHandle = nextSlot.entry !== nextQueueEntry;
                    }

                    if (needReplacingNextHandle) {
                        logger.debug('Need to replace the next video handle it was made obsolete by queue update');

                        // a change in queue require the player to query for the next video
                        ensureNextSlotCleared();
                        loadQueueEntry(nextQueueEntry, false);
                    }
                }, function () {
                    // no next video available, clear the next handle
                    ensureNextSlotCleared();
                });
            }
        }, true);

        return {
            get playing() {
                return  playing;
            },

            /**
             * Prepares the next video to ensure smooth transition.
             *
             * If forcePlay parameter is set to true it plays the video as soon as it is buffered enough.
             *
             * @param {mt.model.QueueEntry} queueEntry
             * @param {boolean} forcePlay
             * @returns {promise} resolved when the loaded entry starts playing, rejected in case of error
             */
            loadQueueEntry: function (queueEntry, forcePlay) {
                return loadQueueEntry(queueEntry, forcePlay);
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
            var buffer;
            try {
                buffer = JSON.parse('[' + input + ']');
            } catch (e) {
                logger.debug('Unable to parse a serialized queue because of an exception %s', e);
                return $q.reject('Sorry we are unable to load your queue. Seems that the link you used is not valid.');
            }

            var queue = new mt.model.Queue();
            // the first bucket is the name of the queue
            queue.name = buffer[0];

            var youtubeVideosIds = [];
            for (var idx = 1; idx < buffer.length; idx++) {
                var serializedEntry = buffer[idx];
                if (serializedEntry.indexOf(mtYoutubeClient.shortName) === 0) {
                    youtubeVideosIds.push(serializedEntry.substring(mtYoutubeClient.shortName.length));
                } else {
                    logger.debug('Unable to find a provider for serialized entry %s', serializedEntry);
                    return $q.reject('Sorry we are unable to load your queue because of an internal error.');
                }
            }

            return mtYoutubeClient.listVideosByIds(youtubeVideosIds).then(function (videos) {
                videos.forEach(function (video) {
                    var queueEntry = new mt.model.QueueEntry();
                    queueEntry.id = mt.tools.uniqueId();
                    queueEntry.video = video;
                    queue.entries.push(queueEntry);
                });

                return queue;
            }, function () {
                return $q.reject('Sorry we are unable to load videos from YouTube while loading your queue. May be you should try later.');
            });
        };

        /**
         * @param {number} startPosition the position from where to start to look for the next valid video
         * @return {promise} resolved with the next valid queue entry, rejected if none found
         */
        var nextValidQueueEntry = function (startPosition) {

            var tryPosition = startPosition;
            var queueEntry;

            // filters out skipped entries so that we don't retry them
            do {
                queueEntry = queue.entries[++tryPosition];
            } while (queueEntry.skippedAtRuntime);

            if (tryPosition < queue.entries.length) {
                return mtYoutubeClient.pingVideoById(queueEntry.video.id).then(function (videoExists) {
                    if (videoExists) {
                        return queueEntry;
                    } else {
                        queueEntry.skippedAtRuntime = true;
                        return nextValidQueueEntry(tryPosition);
                    }
                });
            } else {
                return $q.reject();
            }
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
             * The current entry.
             *
             * @returns {mt.model.QueueEntry}
             */
            get playbackEntry() {
                return playbackEntry;
            },

            /**
             * Adds a video at the end of the queue.
             *
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
             * Removed an entry from the queue.
             *
             * @param {mt.model.QueueEntry} entry
             */
            removeEntry: function (entry) {
                var index = queue.entries.indexOf(entry);
                queue.entries.splice(index, 1);
            },

            /**
             * Restores the queue in a pristine state.
             */
            clear: function () {
                queue.entries = [];
                playbackEntry = null;
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
             * @param {mt.model.QueueEntry=} startEntry the starting point of the search. If not given the current playback entry is used.
             * @return {promise} resolved with a queue entry when an existing video is found, rejected else
             */
            nextValidQueueEntry: function (startEntry) {
                startEntry = startEntry || playbackEntry;

                var startPosition = startEntry ? queue.entries.indexOf(startEntry) : 0;

                if (startPosition === -1) {
                    // something is seriously broken here
                    throw new Error('The active entry from the queue manager is not in the queue array');
                }

                return nextValidQueueEntry(startPosition);
            },

            /**
             * Deserialize the queue from the given string, load the entry details from remote providers and "extends"
             * the queue with the new entries.
             *
             * @param {string} serialized
             * @return {promise}
             */
            deserialize: function (serialized) {
                return deserialize(serialized).then(function (newQueue) {
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
             * @returns {string} the serialized version of the queue
             */
            serialize: function () {
                return serialize(queue);
            }
        };
    });

    mt.MixTubeApp.factory('mtYoutubeClient', function ($http, $q, mtConfiguration, mtLoggerFactory) {

        /**
         * @const
         * @type {string}
         */
        var SHORT_NAME = 'yo';

        /**
         * Youtube can not return more than 50 results in a row.
         *
         * For some resources it means we have to use paging, for others (list videos) we can not call them with
         * more than 50 videos each time.
         *
         * @const
         * @type {number}
         */
        var MAX_RESULT_LIMIT = 50;

        /**
         * Allow to parse "exotic" time format from Youtube data API.
         *
         * @const
         * @type {RegExp}
         */
        var ISO8601_REGEXP = /PT(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/;

        var logger = mtLoggerFactory.logger('mtYoutubeClient');

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
            if (videos.length > MAX_RESULT_LIMIT) {
                throw new Error('YouTube API can not list more than ' + MAX_RESULT_LIMIT + ' videos. Please reduce the videos ids list.')
            }

            var videosIds = _.pluck(videos, 'id');

            return $http.jsonp('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    id: videosIds.join(','),
                    part: 'snippet,statistics,contentDetails',
                    callback: 'JSON_CALLBACK',
                    key: mtConfiguration.youtubeAPIKey
                }
            }).then(function (response) {
                    var data = response.data;

                    if (data.hasOwnProperty('error')) {
                        // youtube API does not return an error HTTP status in case of error but a success with a
                        // special error object in the response
                        logger.debug('An error occurred when loading videos from YouTube API : %s', data.error.errors);
                        return $q.defer().reject();
                    } else {
                        var videoDetailsById = {};
                        data.items.forEach(function (item) {
                            videoDetailsById[item.id] = {
                                provider: 'youtube',
                                id: item.id,
                                title: item.snippet.title,
                                thumbnailUrl: item.snippet.thumbnails.medium.url,
                                publisherName: item.snippet.channelTitle,
                                duration: convertISO8601DurationToMillis(item.contentDetails.duration),
                                viewCount: parseInt(item.statistics.viewCount, 10)
                            };
                        });

                        // extend the video with the details
                        videos.forEach(function (video) {
                            angular.extend(video, videoDetailsById[video.id]);
                        });
                    }
                });
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
             * @returns {promise} a promise resolved with Array.<mt.model.Video>
             */
            listVideosByIds: function (ids) {
                // prepare an array of pseudo videos that have only the id property defined
                var videos = ids.map(function (id) {
                    return {id: id};
                });

                var pagesPromises = [];

                var pagesCount = videos.length / MAX_RESULT_LIMIT;
                for (var pageIdx = 0; pageIdx < pagesCount; pageIdx++) {

                    var pageStart = pageIdx * MAX_RESULT_LIMIT;
                    var videosPaged = videos.slice(pageStart, Math.min(pageStart + MAX_RESULT_LIMIT, videos.length));
                    pagesPromises.push(extendVideosWithDetails(videosPaged));
                }

                return $q.all(pagesPromises).then(function () {
                    return videos;
                });
            },

            /**
             * Searches the 20 first videos on youtube matching the query.
             *
             * The goal is to provide lite results as fast as possible and upgrade each item when there are more details
             * available. It is impossible to get all the properties in one shot because of the design of the Youtube API.
             *
             * The videos objects are passed by callback to be able to update the model as the details arrive.
             * The callback parameter is an array of {@link mt.model.Video} for the first call and a projection of
             * videos after with only the properties available at the execution time.
             *
             * @param {string} queryString the query as used for a classic youtube search
             * @param {function(Array.<(mt.model.Video)>)} dataCallback executed the first time we receive data
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
                        extendVideosWithDetails(videos);
                    });
            },

            /**
             * Checks if the supplied video id matches a existing video in Youtube system.
             *
             * @param {string} id the video id
             * @return {promise} a promise that is resolved with true if the video exist, false else
             */
            pingVideoById: function (id) {
                return $http.jsonp('https://www.googleapis.com/youtube/v3/videos', {
                    params: {
                        id: id,
                        part: 'id',
                        callback: 'JSON_CALLBACK',
                        key: mtConfiguration.youtubeAPIKey
                    }
                }).then(function (response) {
                        return response.data.items.length > 0;
                    });
            }
        };
    });

    mt.MixTubeApp.factory('mtPlayerPoolProvider', function ($rootScope, $q, $document, mtLoggerFactory) {
        var deferred = $q.defer();

        // executed when the Youtube player API is ready, it actually instantiate the players pool and notify the application that it is ready
        var playersPool = new mt.player.PlayersPool(function () {
            var playerDiv = angular.element('<div class="mt-video-player-instance"></div>');
            $document.find('.mt-video-player-window').append(playerDiv);
            return playerDiv[0];
        }, mtLoggerFactory.logger('PlayersPool'));

        mtLoggerFactory.logger('mtMixTubeApp#run').debug('Youtube iFrame API ready and players pool created');

        deferred.resolve(playersPool);

        return {
            'get': function () {
                return deferred.promise;
            }
        }
    });

    mt.MixTubeApp.factory('mtUserInteractionManager', function ($rootScope, $timeout) {
        /**
         * @const
         * @type {number}
         */
        var TRAILING_DELAY = 1000;
        /**
         * @const
         * @type {number}
         */
        var SEARCH_KEEP_ALIVE_DELAY = 10000;

        /** @type {boolean} */
        var userInteracting;
        /** @type {boolean} */
        var overQueueFrame;
        /** @type {boolean} */
        var mouseMoving;
        /** @type {boolean} */
        var searchActive;

        /** @type {promise} */
        var userInteractingPromise;
        /** @type {promise} */
        var searchActivePromise;

        // according to the interaction detected set to true or false with a delay
        $rootScope.$watch(function () {
            return overQueueFrame || mouseMoving || searchActive;
        }, function (newInteractionState) {
            if (newInteractionState) {
                $timeout.cancel(userInteractingPromise);
                userInteracting = true;
            } else {
                userInteractingPromise = $timeout(function () {
                    userInteracting = false;
                }, TRAILING_DELAY);
            }
        });

        return {
            /**
             * Is the user actively interacting with the UI.
             *
             * @returns {boolean}
             */
            get userInteracting() {
                return userInteracting;
            },
            enteredQueueFrame: function () {
                overQueueFrame = true;
            },
            leavedQueueFrame: function () {
                overQueueFrame = false;
            },
            mouseStarted: function () {
                mouseMoving = true;
                if (searchActive) {
                    // if the mouse moves when the search is active we keep the search alive
                    this.searchActiveKeepAlive();
                }
            },
            mouseStopped: function () {
                mouseMoving = false;
            },
            searchActiveKeepAlive: function () {
                $timeout.cancel(searchActivePromise);
                searchActive = true;
                searchActivePromise = $timeout(function () {
                    searchActive = false;
                }, SEARCH_KEEP_ALIVE_DELAY);
            },
            searchClosed: function () {
                $timeout.cancel(searchActivePromise);
                searchActive = false;
            }
        };
    });

    mt.MixTubeApp.factory('mtKeyboardShortcutManager', function ($rootScope) {
        /** @type {Object.<string, {combo: string|RegExp, callback: function}>} */
        var contexts = {};
        /** @type {Array.<string>} */
        var contextStack = [];

        var bindContext = function (name) {
            if (contexts.hasOwnProperty(name)) {
                angular.forEach(contexts[name], function (binding) {
                    var bindFn = Mousetrap[!_.isRegExp(binding.combo) ? 'bind' : 'bindRegExp'];
                    bindFn(binding.combo, function (evt, combo) {
                        $rootScope.$apply(function () {
                            binding.callback(evt, combo);
                        });
                    });
                });
            }
        };

        var unbindContext = function (name) {
            if (contexts.hasOwnProperty(name)) {
                angular.forEach(contexts[name], function (binding) {
                    var unbindFn = Mousetrap[!_.isRegExp(binding.combo) ? 'unbind' : 'unbindRegExp'];
                    unbindFn(binding.combo);
                });
            }
        };

        return {
            /**
             * Registers a shortcut for the in the given context.
             *
             * @param {string} context the context name
             * @param {string|RegExp} combo
             * @param {function} callback
             */
            register: function (context, combo, callback) {
                var bindings = contexts[context] = contexts.hasOwnProperty(context) ? contexts[context] : [];
                bindings.push({combo: combo, callback: callback});
            },
            /**
             * Unbinds the previous context shortcuts and binds the new ones.
             *
             * @param {string} name the context name
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
             * @param {string} name context name
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

    mt.MixTubeApp.factory('mtAlert', function ($rootScope, $q, $templateCache, $compile, $document, $animator, $timeout) {
        var alertContainer = $document.find('.mt-alert-container');
        // need to trim the template because jQuery can not parse an HTML string that starts with a blank character
        var alertLinker;

        // we need to lazy instantiate the alert linker because the template may not be available at load time
        function getAlertLinker() {
            return alertLinker || (alertLinker = $compile($templateCache.get('mtAlertTemplate').trim()));
        }

        function alert(level, message, closeDelay) {
            var scope = $rootScope.$new();
            var animate = $animator(scope, {ngAnimate: "{enter: 'mt-fade-in', leave: 'mt-fade-out'}"});

            scope.message = message;
            scope.level = level;

            getAlertLinker()(scope, function (alertElement) {
                animate.enter(alertElement, alertContainer);

                var closePromise;
                if (closeDelay > 0)
                    closePromise = $timeout(function () {
                        scope.dismiss();
                    }, closeDelay);

                scope.dismiss = function () {
                    $timeout.cancel(closePromise);
                    animate.leave(alertElement, alertContainer);
                    scope.$destroy();
                };


            });
        }

        return {
            info: function (message, closeDelay) {
                alert('info', message, closeDelay);
            },
            warning: function (message, closeDelay) {
                alert('warning', message, closeDelay);
            },
            error: function (message) {
                alert('error', message);
            }
        };
    });


    mt.MixTubeApp.factory('mtModal', function ($rootScope, $q, $templateCache, $compile, $document, mtKeyboardShortcutManager) {

        function close(resolve) {
            modalElement.remove();
            modalElement = null;
            modalScope.$destroy();
            modalScope = null;
            mtKeyboardShortcutManager.leaveContext('modal');
            resolve ? modalDeferred.resolve() : modalDeferred.reject();
        }

        /**
         * The current modal element or "falsy" if no active modal.
         *
         * @type {jQuery=}
         */
        var modalElement;
        /**
         * @type {Deferred=}
         */
        var modalDeferred;
        /**
         * @type {Object}
         */
        var modalScope;

        var body = $document.find('body');
        // need to trim the template because jQuery can not parse an HTML string that starts with a blank character
        var modalLinker = $compile($templateCache.get('mtModalTemplate').trim());

        // pressing escape key will close the current modal
        mtKeyboardShortcutManager.register('modal', 'esc', function () {
            close(false);
        });

        return {
            /**
             * Shows a confirmation dialog with the given message.
             *
             * @param {string} message the message to display. Can contains HTML.
             * @returns {promise} resolved when the user confirms, rejected when the user cancels
             */
            confirm: function (message) {
                if (modalElement) {
                    throw new Error('Can not open a new modal, there is already one active.');
                }

                modalScope = $rootScope.$new();
                modalScope.template = 'mtConfirmTemplate';
                modalScope.message = message;
                modalScope.confirmLabel = 'Confirm';
                modalScope.cancelLabel = 'Cancel';

                modalElement = modalLinker(modalScope);
                body.prepend(modalElement);

                mtKeyboardShortcutManager.enterContext('modal');

                modalDeferred = $q.defer();

                modalScope.confirm = function () {
                    close(true);
                };
                modalScope.close = function () {
                    close(false);
                };

                return modalDeferred.promise;
            }
        }
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
         * @const
         * @type {RegExp}
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
                    var param = params[idxParams++];
                    if (param instanceof Error) {
                        return param.hasOwnProperty('stack') ? param.stack : param.name;
                    } else if (angular.isObject(param)) {
                        return JSON.stringify(param);
                    } else {
                        return param;
                    }
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