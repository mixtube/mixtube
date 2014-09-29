(function(Queue, QueueEntry) {
  'use strict';

  function QueueManagerFactory($q, YoutubeClient, LoggerFactory) {
    var logger = LoggerFactory.logger('QueueManager');

    function serialize(queue) {
      var buffer = [];

      buffer.push((queue.name || ''));
      queue.entries.forEach(function(queueEntry) {
        buffer.push(YoutubeClient.shortName + queueEntry.video.id);
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

      var queue = new Queue();
      // the first bucket is the name of the queue
      queue.name = buffer[0];

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

      return YoutubeClient.listVideosByIds(youtubeVideosIds).then(function(videos) {
        videos.forEach(function(video) {
          var queueEntry = new QueueEntry();
          queueEntry.id = _.uniqueId();
          queueEntry.video = video;
          queue.entries.push(queueEntry);
        });

        return queue;
      }, function() {
        return $q.reject('Sorry we are unable to load videos from YouTube while loading your queue. May be you should try later.');
      });
    }

    // initialize queue
    var queue = new Queue();

    /**
     * @name QueueManager
     */
    var QueueManager = {
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
      appendVideo: function(video) {
        var queueEntry = new QueueEntry();
        queueEntry.id = _.uniqueId();
        queueEntry.video = video;
        queue.entries.push(queueEntry);
        return queueEntry;
      },

      /**
       * Removes an entry from the queue.
       *
       * @param {mt.model.QueueEntry} entry
       */
      removeEntry: function(entry) {
        var position = queue.entries.indexOf(entry);
        if (position === -1) {
          throw new Error('The given entry is not in the queue array');
        }
        queue.entries.splice(position, 1);
      },

      /**
       * Restores the queue in a pristine state.
       */
      clear: function() {
        queue.entries = [];
      },

      /**
       * Returns the closest valid (not skipped yet) entry in the queue from the given entry index included.
       *
       * @param {number} fromIndex the index in the queue to start to search from
       * @return {mt.model.QueueEntry} the next entry or null if none
       */
      closestValidEntryByIndex: function(fromIndex) {
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
      },

      /**
       * Deserialize the queue from the given string, load the entry details from remote providers and "extends"
       * the queue with the new entries.
       *
       * @param {string} serialized
       * @return {promise}
       */
      deserialize: function(serialized) {
        return deserialize(serialized).then(function(newQueue) {
          // remove invalid entries
          newQueue.entries = newQueue.entries.filter(function(entry) {
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
      serialize: function() {
        return serialize(queue);
      }
    };

    return QueueManager;
  }

  angular.module('Mixtube').factory('QueueManager', QueueManagerFactory);

})(mt.model.Queue, mt.model.QueueEntry);