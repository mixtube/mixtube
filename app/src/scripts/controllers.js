'use strict';

var angular = require('angular'),
  DeserializationErrorCodes = require('./components/queue/deserializationErrorCodes');

// brfs requires this to be on its own line
var fs = require('fs');

// @ngInject
function RootCtrl($scope, $location, $timeout, $templateCache, keyboardShortcutManager, queueManager,
                  notificationCentersRegistry, orchestrator, userInteractionManager, queuesRegistry, modalManager,
                  capabilities, searchCtrlHelper, configuration, analyticsTracker, errorsTracker) {

  var rootCtrl = this;

  /**
   * Stores the serialized version of the queue. Useful to check the new url state against the internal state
   * to prevent infinite loops when changing the url internally.
   *
   * @type {string}
   */
  var serializedQueue;

  // a combination of detected capability and user override
  var playbackCapable = true;

  // we need to track if the modal is open to make sure we don't "idle" the chrome
  var modalOpen = false;

  rootCtrl.queueLoading = false;

  rootCtrl.isSearchShown = isSearchShown;
  rootCtrl.getQueue = getQueue;
  rootCtrl.getRunningQueueEntry = getRunningQueueEntry;
  rootCtrl.getLoadingQueueEntry = getLoadingQueueEntry;
  rootCtrl.isPlaying = isPlaying;
  rootCtrl.shouldIdleChrome = shouldIdleChrome;
  rootCtrl.shouldShowScene = shouldShowScene;
  rootCtrl.shouldShowPlaybackControls = shouldShowPlaybackControls;
  rootCtrl.toggleSearch = searchCtrlHelper.toggleSearch;
  rootCtrl.togglePlayback = togglePlayback;

  // setup direct access to the property for double binding
  Object.defineProperty(rootCtrl, 'searchTerm', {
    get: function() {
      return searchCtrlHelper.searchTerm;
    },
    set: function(value) {
      searchCtrlHelper.searchTerm = value;
    }
  });

  function isSearchShown() {
    return searchCtrlHelper.searchShown;
  }

  function getQueue() {
    return queueManager.queue;
  }

  function getRunningQueueEntry() {
    return orchestrator.runningQueueEntry;
  }

  function getLoadingQueueEntry() {
    return orchestrator.loadingQueueEntry;
  }

  function isPlaying() {
    return orchestrator.playing;
  }

  function shouldIdleChrome() {
    return !configuration.forceChrome && !userInteractionManager.userInteracting && !modalOpen && orchestrator.playing;
  }

  function shouldShowScene() {
    return playbackCapable;
  }

  function shouldShowPlaybackControls() {
    return playbackCapable || capabilities.remoteControl;
  }

  function togglePlayback() {
    analyticsTracker.track('Playback toggled', {currentlyPlaying: orchestrator.playing});

    orchestrator.togglePlayback();
  }

  function handleDeserializationError(error) {

    var userMessage;
    if('code' in error) {
      if(error.code === DeserializationErrorCodes.COULD_NOT_PARSE) {
        userMessage = 'Sorry we are unable to load your queue. Seems that the link you used is not valid.';
      } else if(error.code === DeserializationErrorCodes.PROVIDER_NOT_FOUND) {
        userMessage = 'Sorry we are unable to load your queue because of an internal error.';
      } else if(error.code === DeserializationErrorCodes.PROVIDER_LOADING_FAILURE) {
        userMessage = 'Sorry we were unable to access some videos while loading your queue. May be you should try later.';
      }

      errorsTracker.track(error);
    }

    notificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
      notificationCenter.error(userMessage);
    });
  }

  // we need to wait for the loading phase to be done to avoid race problems (loading for ever)
  $timeout(activate);

  function activate() {
    // hide the input search at startup
    searchCtrlHelper.toggleSearch(false);

    // register the global space shortcut
    keyboardShortcutManager.register('space', function(evt) {
      evt.preventDefault();
      togglePlayback();
    });

    keyboardShortcutManager.register('search', 'esc', function(evt) {
      evt.preventDefault();
      searchCtrlHelper.toggleSearch(false);
    });

    // prevents the backspace shortcut
    // it is really easy to inadvertently hit the key and  triggers a "Go Back" action
    keyboardShortcutManager.register('backspace', function(evt) {
      evt.preventDefault();
    });

    $scope.$watch(function() {
      return queueManager.queue;
    }, function(newVal, oldVal) {
      // this test is here to prevent to serialize during the init phase
      if (newVal !== oldVal) {
        var newSerializedQueue = queueManager.serialize();
        if (serializedQueue !== newSerializedQueue) {
          serializedQueue = newSerializedQueue;
          // replace queue parameter but keep the rest
          $location.search(angular.extend({}, $location.search(), {queue: serializedQueue}));
        }
      }
    }, true);

    $scope.$watch(function() {
      return $location.search().queue;
    }, function(newSerializedQueue) {
      if (serializedQueue !== newSerializedQueue) {
        serializedQueue = newSerializedQueue;
        // change initiated by user (back / forward etc.), need to be deserialized
        rootCtrl.queueLoading = true;

        queueManager.deserialize(serializedQueue)
          .catch(handleDeserializationError)
          .finally(function() {
            rootCtrl.queueLoading = false;
          });
      }
    });

    $scope.$watch(function() {
      return orchestrator.runningQueueEntry;
    }, function(runningQueueEntry, oldVal) {
      if (runningQueueEntry !== oldVal) {
        queuesRegistry('queue').ready(function(queue) {
          queue.focusEntry(runningQueueEntry);
        });
      }
    });

    // for analytics purposes only
    $scope.$watch(function() {
      return orchestrator.stopped;
    }, function(stopped, oldVal) {
      if (stopped !== oldVal) {
        analyticsTracker.track('Playback stopped');
      }
    });

    // pre-fill the template cache with the content of the modal
    $templateCache.put('noPlaybackModalContent',
      fs.readFileSync(__dirname + '/components/capabilities/noPlaybackModalContent.html', 'utf8'));

    $scope.$watch(function() {
      return capabilities.playback;
    }, function(playback, oldValue) {
      if (playback !== oldValue) {

        analyticsTracker.track('Playback capability detected', {playbackCapable: playback});

        if (playback === false) {
          modalOpen = true;
          modalManager.open({
              title: 'MixTube won\'t work on your device',
              contentTemplateUrl: 'noPlaybackModalContent',
              commands: [{label: 'OK', primary: true, name: 'ok'}]
            })
            .then(function(command) {
              playbackCapable = command.name === 'try';
            })
            .finally(function() {
              modalOpen = false;
            });
        }
      }
    });
  }
}

// @ngInject
function SearchResultsCtrl($scope, $timeout, youtubeClient, searchCtrlHelper, analyticsTracker) {

  var searchResultsCtrl = this;

  /**
   * @const
   * @type {number}
   */
  var INSTANT_SEARCH_DELAY = 500;

  /** @type {number} */
  var searchRequestCount = 0;
  /** @type {?Promise} */
  var instantSearchPromise = null;


  // the following variables will be initialized by the initSearch function.

  // a tracking purpose only variable
  var pageCurrentIdxByProvider = null;

  /**
   * The user already executed one search. Used to hide the results pane until there is something to show.
   */
  var inSearch = false;

  /**
   * A list of results pages.
   *
   * @type {Object.<string, Array.<Array.<Video>>>}
   */
  searchResultsCtrl.results = null;
  /** @type {Object.<string, boolean>} */
  searchResultsCtrl.pending = null;
  /** @type {Object.<string, boolean>} */
  searchResultsCtrl.pendingMore = null;
  /** @type {Object.<string, boolean>} */
  searchResultsCtrl.error = null;
  /** @type {Object.<string, boolean>} */
  searchResultsCtrl.noneFound = null;
  /** @type {Object.<string, string>} */
  searchResultsCtrl.nextPageId = null;

  searchResultsCtrl.getSearchTerm = getSearchTerm;
  searchResultsCtrl.shouldShowSearchResultPanel = shouldShowSearchResultPanel;
  searchResultsCtrl.showMore = showMore;

  activate();

  function getSearchTerm() {
    return searchCtrlHelper.searchTerm;
  }

  function shouldShowSearchResultPanel() {
    return searchCtrlHelper.searchShown && inSearch;
  }

  function initSearch() {
    instantSearchPromise = null;
    inSearch = false;

    pageCurrentIdxByProvider = {youtube: 0};

    searchResultsCtrl.results = {youtube: [[]]};
    searchResultsCtrl.pending = {youtube: false};
    searchResultsCtrl.pendingMore = {youtube: false};
    searchResultsCtrl.nextPageId = {youtube: null};
    searchResultsCtrl.error = {youtube: false};
    searchResultsCtrl.noneFound = {youtube: false};
  }

  function showMore(pId, nextPageId) {
    if (pId === 'youtube') {
      // clear any error message (case of retry after error)
      searchResultsCtrl.error.youtube = false;
      searchYoutube(searchCtrlHelper.searchTerm, nextPageId);
    }

    analyticsTracker.track('Clicked show more', {provider: pId, pageIndex: ++pageCurrentIdxByProvider[pId]});
  }

  /**
   * @param {string} term
   * @param {string=} nextPageId
   * @returns {Promise}
   */
  function searchYoutube(term, nextPageId) {
    var first = !nextPageId;

    var pageSize,
      startSearchRequestCount = searchRequestCount,
      resultsLayoutInfo = searchCtrlHelper.resultsLayoutInfo;

    if (first) {
      pageSize = Math.max(11, resultsLayoutInfo.promotedCount + resultsLayoutInfo.regularCount * 3);

      searchResultsCtrl.pending.youtube = true;

      // reset the results list and the next page token since we are starting a new search
      searchResultsCtrl.results.youtube = [];
      searchResultsCtrl.nextPageId.youtube = null;
    } else {
      pageSize = Math.max(12, resultsLayoutInfo.regularCount * 4);

      searchResultsCtrl.pendingMore.youtube = true;
    }

    // safety check on requested page size
    var boundedPageSize = Math.min(pageSize, youtubeClient.maxResultsLimit);

    return youtubeClient.searchVideosByQuery(
      term,
      {
        pageSize: boundedPageSize,
        pageId: nextPageId
      },
      function progressCb(results) {
        if (searchRequestCount === startSearchRequestCount) {
          if (results.videos.length) {
            searchResultsCtrl.results.youtube.push(results.videos);
            searchResultsCtrl.nextPageId.youtube = results.nextPageId;
          } else {
            searchResultsCtrl.noneFound.youtube = true;
          }
        }
      })
      .then(function doneCb() {
        if (searchRequestCount === startSearchRequestCount) {
          if (first) {
            searchResultsCtrl.pending.youtube = false;
          } else {
            searchResultsCtrl.pendingMore.youtube = false;
          }
        }
      })
      .catch(function catchCb() {
        if (searchRequestCount === startSearchRequestCount) {
          searchResultsCtrl.error.youtube = true;
          if (first) {
            searchResultsCtrl.pending.youtube = false;
            searchResultsCtrl.results.youtube = [];
          } else {
            searchResultsCtrl.pendingMore.youtube = false;
          }
        }
      });
  }

  function activate() {
    initSearch();

    // when the user types we automatically execute the search
    $scope.$watch(function() {
      return searchCtrlHelper.searchTerm;
    }, function(newSearchTerm) {
      if (newSearchTerm !== null) {

        // new inputs so we stop the previous request
        $timeout.cancel(instantSearchPromise);

        // as soon as the query changes clear messages
        searchResultsCtrl.error.youtube = false;
        searchResultsCtrl.noneFound.youtube = false;

        // if the search has to be longer than two characters
        if (newSearchTerm.length > 2) {
          searchRequestCount++;

          $timeout.cancel(instantSearchPromise);
          instantSearchPromise = $timeout(function search() {
            inSearch = true;

            // we need to delay the actual search in order for the search panel show animation to work
            $timeout(function() {
              searchYoutube(newSearchTerm);
            }, 0);

            analyticsTracker.track('Search started');

          }, INSTANT_SEARCH_DELAY);
        }
      }
    });

    // ensures everything is initialized when the search is shown and stopped when it is hidden
    $scope.$watch(function() {
      return searchCtrlHelper.searchShown;
    }, function(searchShown) {
      if (searchShown) {
        initSearch();
      } else {
        $timeout.cancel(instantSearchPromise);
      }
    });
  }
}

// @ngInject
function SearchResultCtrl($timeout, queueManager, queuesRegistry, orchestrator, analyticsTracker) {

  var searchResultCtrl = this;

  /**
   * @const
   * @type {number}
   */
  var CONFIRMATION_DURATION = 4000;

  /** @type {?Promise} */
  var tmoPromise = null;

  /** @type {boolean} */
  searchResultCtrl.shouldShowConfirmation = false;
  /** @type {?number} */
  searchResultCtrl.countBeforePlayback = null;

  searchResultCtrl.appendResultToQueue = appendResultToQueue;

  /**
   * @param {mt.Video} video
   */
  function appendResultToQueue(video) {

    var queueEntry = queueManager.appendVideo(video);
    var countBeforePlayback = null;

    if (orchestrator.runningQueueEntry) {
      var entries = queueManager.queue.entries;
      countBeforePlayback = entries.indexOf(queueEntry) - entries.indexOf(orchestrator.runningQueueEntry);
    }

    searchResultCtrl.countBeforePlayback = countBeforePlayback;

    queuesRegistry('queue').ready(function(queue) {
      queue.focusEntry(queueEntry);
    });

    searchResultCtrl.shouldShowConfirmation = true;
    $timeout.cancel(tmoPromise);
    tmoPromise = $timeout(function() {
      searchResultCtrl.shouldShowConfirmation = false;
    }, CONFIRMATION_DURATION);

    analyticsTracker.track('Appended video to queue', {
      queueLength: queueManager.queue.entries.length,
      countBeforePlayback: countBeforePlayback
    });
  }
}

// @ngInject
function QueueCtrl(orchestrator, queueManager, analyticsTracker) {

  var queueCtrl = this;

  queueCtrl.playQueueEntry = playQueueEntry;
  queueCtrl.removeQueueEntry = removeQueueEntry;

  /**
   * @param {number} queueIndex
   */
  function playQueueEntry(queueIndex) {
    orchestrator.skipTo(queueIndex);

    analyticsTracker.track('User skipped to video');
  }

  /**
   * @param {mt.QueueEntry} queueEntry
   */
  function removeQueueEntry(queueEntry) {
    queueManager.removeEntry(queueEntry);

    analyticsTracker.track('Removed video from queue', {queueLength: queueManager.queue.entries.length});
  }
}

// @ngInject
function DebuggingCtrl(configuration, keyboardShortcutManager, notificationCentersRegistry, modalManager) {

  activate();

  function notifyError(message) {
    notificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
      notificationCenter.error(message);
    });
  }

  function notifyComingNext() {
    notificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
      notificationCenter.comingNext({
        current: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce venenatis finibus pulvinar.',
        next: 'Pellentesque mollis eget velit ut eleifend. Nulla efficitur, mi non viverra semper, enim quam porttitor libero',
        imageUrl: 'https://i.ytimg.com/vi/69WltTXlmHs/mqdefault.jpg'
      });
    });
  }

  function activate() {
    if (configuration.debug) {
      // register the global space shortcut
      keyboardShortcutManager.register('ctrl+e', function(evt) {
        evt.preventDefault();
        notifyError('Debugging: Test notification');
      });

      keyboardShortcutManager.register('ctrl+c', function(evt) {
        evt.preventDefault();
        notifyComingNext();
      });

      keyboardShortcutManager.register('ctrl+m', function(evt) {
        evt.preventDefault();
        modalManager.open({
          title: 'This a a testing modal',
          contentTemplateUrl: 'noPlaybackModalContent',
          commands: [{label: 'OK', primary: true}]
        });
      });
    }
  }
}

exports.RootCtrl = RootCtrl;
exports.SearchResultsCtrl = SearchResultsCtrl;
exports.SearchResultCtrl = SearchResultCtrl;
exports.QueueCtrl = QueueCtrl;
exports.DebuggingCtrl = DebuggingCtrl;