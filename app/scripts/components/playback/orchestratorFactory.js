'use strict';

var angular = require('angular'),
  difference = require('lodash/array/difference'),
  includes = require('lodash/collection/includes'),
  mixtubePlayback = require('mixtube-playback');

// @ngInject
function orchestratorFactory($rootScope, $timeout, queueManager, notificationCentersRegistry, scenesRegistry,
                             configuration, logger) {

  var _playback,
    _playbackState,
    _playingEntry,
    _loadingEntry;

  activate();

  function activate() {

    scenesRegistry('scene').ready(function(scene) {

      var transitionDurationInMillis = configuration.fadeDuration * 1000;

      var playbackConfig = {
        elementProducer: function() {
          return scene.newHostElement()[0];
        },

        videoProducer: function(entry) {
          return entry.video;
        },

        nextEntryProducer: function(entry) {
          return queueManager.closestValidEntryByIndex(queueManager.queue.entries.indexOf(entry) + 1);
        },

        transitionDuration: transitionDurationInMillis,

        stateChanged: function(prevState, state) {
          $rootScope.$evalAsync(function() {
            _playbackState = state;

            // when the playbacks stops we need to tell that the last playing video is not playing anymore
            if (_playbackState === mixtubePlayback.States.stopped) {
              _playingEntry = null;
            }
          });
        },

        playingChanged: function(entry) {
          $rootScope.$evalAsync(function() {
            _playingEntry = entry;
          });
        },

        loadingChanged: function(entry, loading) {
          $rootScope.$evalAsync(function() {
            if (loading) {
              _loadingEntry = entry;
            } else if (_loadingEntry === entry) {
              _loadingEntry = null;
            }
          });
        },

        comingNext: function(currentEntry, nextEntry) {
          // notify only if there was a current entry
          // otherwise it means we just started to play and we don't need to show anything in this case
          if (currentEntry) {
            notificationCentersRegistry('notificationCenter').ready(
              function(notificationCenter) {
                var closeComingNextFn = notificationCenter.comingNext({
                  current: currentEntry.video.title,
                  next: nextEntry ? nextEntry.video.title : null,
                  imageUrl: nextEntry ? nextEntry.video.thumbnailUrl : null
                });

                $timeout(closeComingNextFn, 2 * transitionDurationInMillis);
              });
          }
        },

        loadFailed: function(entry, error) {
          $rootScope.$evalAsync(function() {
            entry.skippedAtRuntime = true;
            logger.warn('Error while loading a entry: "%s". See stack trace bellow:', error.message);
            logger.warn(error.stack);
          });
        }
      };

      if (isFinite(configuration.mediaDuration)) {
        playbackConfig.debug = {
          mediaDuration: configuration.mediaDuration,
          mediaQuality: 'low'
        };
      }

      _playback = mixtubePlayback(playbackConfig);

      $rootScope.$watchCollection(function() {
        return queueManager.queue.entries;
      }, function entriesWatcherChangeHandler(/**Array*/ newEntries, /**Array*/ oldEntries) {
        if (!angular.equals(newEntries, oldEntries)) {
          var removedEntries = difference(oldEntries, newEntries);
          if (includes(removedEntries, _playingEntry)) {
            skipTo(oldEntries.indexOf(_playingEntry));
          } else if (includes(removedEntries, _loadingEntry)) {
            skipTo(oldEntries.indexOf(_loadingEntry));
          } else {
            // we can get here if some entry has been deleted but was not playing or loading
            // or if an entry has been added
            _playback.checkNextEntry();
          }
        }
      });
    });
  }

  function skipTo(queueIndex) {
    var entry = queueManager.closestValidEntryByIndex(queueIndex);
    if (!entry) {
      _playback.stop();
    } else {
      _playback.skip(entry);

      if (_playbackState !== mixtubePlayback.States.playing) {
        _playback.play();
      }
    }
  }

  function togglePlayback() {
    if (_playbackState === mixtubePlayback.States.playing) {
      _playback.pause();
    } else if (_playbackState === mixtubePlayback.States.paused) {
      _playback.play();
    } else if (queueManager.queue.entries.length) {
      // stopped or pristine
      _playback.skip(queueManager.queue.entries[0]);
      _playback.play();
    }
  }

  /**
   * @name orchestrator
   */
  var orchestrator = {

    /**
     * The currently playing queue entry.
     *
     * @returns {?mt.QueueEntry}
     */
    get runningQueueEntry() {
      return _playingEntry;
    },

    /**
     * The currently loading queue entry.
     *
     * This value is not null only if the loading has been initiated by a external action ie. not by
     * the orchestrator itself.
     *
     * @returns {?mt.QueueEntry}
     */
    get loadingQueueEntry() {
      return _loadingEntry;
    },

    /**
     * @returns {boolean}
     */
    get playing() {
      return _playbackState === mixtubePlayback.States.playing;
    },

    /**
     * @param {number} queueIndex
     */
    skipTo: skipTo,

    togglePlayback: togglePlayback
  };

  return orchestrator;
}

module.exports = orchestratorFactory;