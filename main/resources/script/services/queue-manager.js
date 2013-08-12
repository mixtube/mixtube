(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtQueueManager', function ($q, mtYoutubeClient, mtLoggerFactory) {
        var logger = mtLoggerFactory.logger('mtQueueManager');

        function serialize(queue) {
            var buffer = [];

            buffer.push((queue.name || ''));
            queue.entries.forEach(function (queueEntry) {
                buffer.push(mtYoutubeClient.shortName + queueEntry.video.id);
            });

            var jsonString = JSON.stringify(buffer);
            // remove useless array delimiters because we are actually not using it as an array
            return jsonString.substr(1, jsonString.length - 2);
        }

        function deserialize(input) {
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
        }

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
             * Adds a video at the end of the queue.
             *
             * @param {mt.model.Video} video
             * @return {mt.model.QueueEntry} the newly created entry in the queue
             */
            appendVideo: function (video) {
                var queueEntry = new mt.model.QueueEntry();
                queueEntry.id = mt.tools.uniqueId();
                queueEntry.video = video;
                queue.entries.push(queueEntry);
                return queueEntry;
            },

            /**
             * Removes an entry from the queue.
             *
             * @param {mt.model.QueueEntry} entry
             */
            removeEntry: function (entry) {
                var position = queue.entries.indexOf(entry);
                if (position === -1) {
                    throw new Error('The given entry is not in the queue array');
                }
                queue.entries.splice(position, 1);
            },

            /**
             * Restores the queue in a pristine state.
             */
            clear: function () {
                queue.entries = [];
            },

            /**
             * Returns the closest valid (not skipped yet) video in the queue from the given entry or the first entry if
             * none is given.
             *
             * @param {mt.model.QueueEntry=} from an optional entry to start the search from
             * @param {boolean=} includeFrom should the given entry be included in the search
             * @return {mt.model.QueueEntry} the next entry or null if none
             */
            closestValidEntry: function (from, includeFrom) {
                var position = 0;

                if (from) {
                    position = queue.entries.indexOf(from);
                    if (position === -1) {
                        // something is seriously broken here
                        throw new Error('The given entry is not in the queue array');
                    }
                    if (!includeFrom) position++;
                }

                // filters out skipped entries so that we don't retry them
                var validEntry;
                while (!validEntry && position < queue.entries.length) {
                    var entry = queue.entries[position];
                    if (entry.skippedAtRuntime) {
                        position++;
                    } else {
                        validEntry = entry;
                    }
                }

                return validEntry;
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
})(mt);