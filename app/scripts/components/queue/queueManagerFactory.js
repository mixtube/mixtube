'use strict';

var angular = require('angular'),
  Queue = require('./queueModel').Queue,
  QueueEntry = require('./queueModel').QueueEntry,
  uniqueId = require('lodash/utility/uniqueId'),
  has = require('lodash/object/has');

function queueManagerFactory($q, YoutubeClient, LoggerFactory) {

  var logger = LoggerFactory('QueueManager');

  // initialize queue
  var queue = new Queue();

  function serialize() {
    var buffer = [];

    buffer.push(queue.name || '');
    queue.entries.forEach(function(queueEntry) {
      buffer.push(YoutubeClient.shortName + queueEntry.video.id);
    });

    var jsonString = JSON.stringify(buffer);
    // remove useless array delimiters because we are actually not using it as an array
    return jsonString.substr(1, jsonString.length - 2);
  }

  function deserialize(input) {
    // add removed array delimiters
    try {
      var buffer = JSON.parse('[' + input + ']');
    } catch (e) {
      logger.debug('Unable to parse a serialized queue because of an exception %s', e);
      return $q.reject('Sorry we are unable to load your queue. Seems that the link you used is not valid.');
    }

    var newQueue = new Queue();
    // the first bucket is the name of the queue
    newQueue.name = buffer[0];

    var youtubeVideosIds = [];
    for (var idx = 1; idx < buffer.length; idx++) {
      var serializedEntry = buffer[idx];
      if (serializedEntry.indexOf(YoutubeClient.shortName) === 0) {
        youtubeVideosIds.push(serializedEntry.substring(YoutubeClient.shortName.length));
      } else {
        logger.debug('Unable to find a provider for serialized entry %s', serializedEntry);
        return $q.reject('Sorry we are unable to load your queue because of an internal error.');
      }
    }

    return YoutubeClient.listVideosByIds(youtubeVideosIds)
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
      .catch(function() {
        return $q.reject('Sorry we are unable to load videos from YouTube while loading your queue. ' +
        'May be you should try later.');
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
   * @name QueueManager
   */
  var QueueManager = {
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

  return QueueManager;
}

module.exports = queueManagerFactory;