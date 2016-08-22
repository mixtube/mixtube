'use strict';

var angular = require('angular'),
  Queue = require('./queueModel').Queue,
  QueueEntry = require('./queueModel').QueueEntry,
  DeserializationErrorCodes = require('./deserializationErrorCodes'),
  uniqueId = require('lodash/uniqueId'),
  has = require('lodash/has');

// @ngInject
function queueManagerFactory($q, youtubeClient) {

  // initialize queue
  var queue = new Queue();

  function serialize() {
    var buffer = [];

    buffer.push(queue.name || '');
    queue.entries.forEach(function(queueEntry) {
      buffer.push(youtubeClient.shortName + queueEntry.video.id);
    });

    var jsonString = JSON.stringify(buffer);
    // remove useless array delimiters because we are actually not using it as an array
    return jsonString.substr(1, jsonString.length - 2);
  }

  /**
   * @param {string} input the serialized form of the queue
   * @returns {Promise} resolve an empty value or reject with an Error object where message is an error code. It may
   * contains some additional properties depending of the reason of failure
   */
  function deserialize(input) {
    var error;

    // add removed array delimiters
    var buffer;
    try {
      buffer = JSON.parse('[' + input + ']');
    } catch (e) {
      error = new Error('Unable to parse a serialized queue because of an exception');
      error.code = DeserializationErrorCodes.COULD_NOT_PARSE;
      error.cause = e;
      return $q.reject(error);
    }

    var newQueue = new Queue();
    // the first bucket is the name of the queue
    newQueue.name = buffer[0];

    var youtubeVideosIds = [];
    for (var idx = 1; idx < buffer.length; idx++) {
      var serializedEntry = buffer[idx];
      if (serializedEntry.indexOf(youtubeClient.shortName) === 0) {
        youtubeVideosIds.push(serializedEntry.substring(youtubeClient.shortName.length));
      } else {
        error = new Error('Unable to find a provider for serialized entry');
        error.code = DeserializationErrorCodes.PROVIDER_NOT_FOUND;
        error.serializedEntry = serializedEntry;
        return $q.reject(error);
      }
    }

    return youtubeClient.listVideosByIds(youtubeVideosIds)
      .then(function(videos) {
        videos.forEach(function(video) {
          var queueEntry = new QueueEntry();
          queueEntry.id = uniqueId();
          queueEntry.video = video;
          newQueue.entries.push(queueEntry);
        });

        // remove invalid entries
        newQueue.entries = newQueue.entries.filter(function(entry) {
          return has(entry.video, 'publisherName');
        });

        // replacing the queue object prevents the Angular digest / watch mechanism to work
        // by extending the object it allows it to detect the changes
        angular.extend(queue, newQueue);
      })
      .catch(function(ytError) {
        error = new Error('Unable to load a queue because of an Youtube error');
        error.code = DeserializationErrorCodes.PROVIDER_LOADING_FAILURE;
        error.nativeError = ytError;
        return $q.reject(error);
      });
  }

  function appendVideo(video) {
    var queueEntry = new QueueEntry();
    queueEntry.id = uniqueId();
    queueEntry.video = video;
    queue.entries.push(queueEntry);
    return queueEntry;
  }

  function removeEntry(entry) {
    var position = queue.entries.indexOf(entry);
    if (position === -1) {
      throw new Error('The given entry is not in the queue array');
    }
    queue.entries.splice(position, 1);
  }

  function closestValidEntryByIndex(fromIndex) {
    var validEntry = null;

    if (fromIndex !== -1) {
      while (!validEntry && fromIndex < queue.entries.length) {
        var entry = queue.entries[fromIndex];
        if (entry.skippedAtRuntime) {
          fromIndex++;
        } else {
          validEntry = entry;
        }
      }
    }

    return validEntry;
  }

  /**
   * @name queueManager
   */
  var queueManager = {
    /**
     * @returns {mt.Queue}
     */
    get queue() {
      return queue;
    },

    /**
     * Adds a video at the end of the queue.
     *
     * @param {mt.Video} video
     * @return {mt.QueueEntry} the newly created entry in the queue
     */
    appendVideo: appendVideo,

    /**
     * Removes an entry from the queue.
     *
     * @param {mt.QueueEntry} entry
     */
    removeEntry: removeEntry,

    /**
     * Returns the closest valid (not skipped yet) entry in the queue from the given entry index included.
     *
     * @param {number} fromIndex the index in the queue to start to search from
     * @return {mt.QueueEntry} the next entry or null if none
     */
    closestValidEntryByIndex: closestValidEntryByIndex,

    /**
     * Deserialize the queue from the given string, load the entry details from remote providers and "extends"
     * the queue with the new entries.
     *
     * @param {string} serialized
     * @return {promise}
     */
    deserialize: deserialize,

    /**
     * Serialize the queue.
     *
     * @returns {string} the serialized version of the queue
     */
    serialize: serialize
  };

  return queueManager;
}

module.exports = queueManagerFactory;