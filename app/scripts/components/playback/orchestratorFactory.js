'use strict';

var angular = require('angular'),
//isUndefined = require('lodash/lang/isUndefined'),
//pull = require('lodash/array/pull'),
//difference = require('lodash/array/difference'),
//includes = require('lodash/collection/includes'),
  mixtubePlayback = require('mixtube-playback');

function orchestratorFactory($rootScope, $timeout, QueueManager, NotificationCentersRegistry, ScenesRegistry,
                             Configuration, LoggerFactory) {

  var _logger = LoggerFactory('Orchestrator'),
    _playback,
    _playbackState,
    _playingEntry,
    _loadingEntry;

  activate();

  function activate() {

    ScenesRegistry('scene').ready(function(scene) {

      _playback = mixtubePlayback({
        elementProducer: function() {
          return scene.newHostElement()[0];
        },

        videoProducer: function(entry) {
          return entry.video;
        },

        nextEntryProducer: function(entry) {
          return QueueManager.closestValidEntryByIndex(QueueManager.queue.entries.indexOf(entry) + 1);
        },

        transitionDuration: Configuration.fadeDuration * 1000,

        stateChanged: function(prevState, state) {
          $rootScope.$evalAsync(function() {
            _playbackState = state;

            // when the playbacks stops we need to tell that the last playing video is not playing anymore
            if(_playbackState === mixtubePlayback.States.stopped) {
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
            NotificationCentersRegistry('notificationCenter').ready(
              function(notificationCenter) {
                var closeComingNextFn = notificationCenter.comingNext({
                  current: currentEntry.video.title,
                  next: nextEntry ? nextEntry.video.title : null,
                  imageUrl: nextEntry ? nextEntry.video.thumbnailUrl : null
                });

                $timeout(closeComingNextFn, 10000);
              });
          }
        },

        loadFailed: function(entry, error) {
          $rootScope.$evalAsync(function() {
            entry.skippedAtRuntime = true;
            _logger.warn('Error while loading a entry');
            _logger.warn(error.stack);
          });
        }
      });
    });


    /**
     * The watcher bellow observes the queue entries to check if a modification the queue and impacts the playback if required.
     *
     * Two main cases:
     *  - the currently playing entry has been removed -> move to the next valid one
     *  - something has changed between the currently playing entry and the auto prepared one -> launch a new cycle to pick and prepare
     */
    //  $rootScope.$watchCollection(function() {
    //    return QueueManager.queue.entries;
    //  }, function entriesWatcherChangeHandler(/**Array*/ newEntries, /**Array*/ oldEntries) {
    //    if (!angular.equals(newEntries, oldEntries)) {
    //      var startedEntry = _startedSlot && _startedSlot.actualQueueEntry;
    //      // the concept of activated entry is only relevant here
    //      // we want to consider the currently started entry or the one about to be the next started entry mainly
    //      // to properly manage moved to entry removal while still preparing
    //      var activatedEntry = _movePreparedSlot && (_movePreparedSlot.actualQueueEntry || _movePreparedSlot.tryingQueueEntry)
    //        || startedEntry;
    //      var removedEntries = difference(oldEntries, newEntries);
    //      if (includes(removedEntries, activatedEntry)) {
    //        // the active entry has just been removed
    //        // move to the entry which is now at the same position in the queue
    //        moveTo(oldEntries.indexOf(activatedEntry));
    //      } else if (startedEntry) {
    //        // nothing changed for the active entry
    //        // we need the check if the change impacted the auto prepared entry
    //        var prepareAutoRequired = false;
    //        var startedEntryOldIndex = oldEntries.indexOf(startedEntry);
    //        var startedEntryNewIndex = newEntries.indexOf(startedEntry);
    //        var autoPreparedEntry = _autoPreparedSlot && (_autoPreparedSlot.actualQueueEntry || _autoPreparedSlot.tryingQueueEntry);
    //        var autoPreparedEntryNewIndex = newEntries.indexOf(autoPreparedEntry);
    //        if (autoPreparedEntryNewIndex === -1) {
    //          // the auto prepared entry has just been removed so we know straight that we have to re-prepare
    //          prepareAutoRequired = true;
    //        } else {
    //          // we have to compare slices of old and new entries from the entry following the started one
    //          // to the auto prepared one the check if something changes in between
    //          var autoPreparedEntryOldIndex = oldEntries.indexOf(autoPreparedEntry);
    //          var sliceOfOldEntries = oldEntries.slice(startedEntryOldIndex + 1, autoPreparedEntryOldIndex);
    //          var sliceOfNewEntries = newEntries.slice(startedEntryNewIndex + 1, autoPreparedEntryNewIndex);
    //          prepareAutoRequired = !angular.equals(sliceOfOldEntries, sliceOfNewEntries);
    //        }
    //        if (prepareAutoRequired) {
    //          // something changed so just in case we re (auto)prepare the entry
    //          prepareAuto(startedEntryNewIndex + 1);
    //          _logger.debug('something changed in the queue that required a re-preparation of the previously ' +
    //          'auto prepared entry %O', autoPreparedEntry);
    //        }
    //      }
    //    }
    //  });
  }

  function skipTo(queueIndex) {
    _playback.skip(QueueManager.queue.entries[queueIndex]);

    if (_playbackState !== mixtubePlayback.States.playing) {
      _playback.play();
    }
  }

  function togglePlayback() {
    if (_playbackState === mixtubePlayback.States.playing) {
      _playback.pause();
    } else if (_playbackState === mixtubePlayback.States.paused) {
      _playback.play();
    } else if (QueueManager.queue.entries.length) {
      // stopped or pristine
      _playback.skip(QueueManager.queue.entries[0]);
      _playback.play();
    }
  }

  /**
   * @name Orchestrator
   */
  var Orchestrator = {

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

  return Orchestrator;
}

module.exports = orchestratorFactory;