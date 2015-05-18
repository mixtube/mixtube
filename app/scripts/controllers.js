'use strict';

var angular = require('angular');

// brfs requires this to be on its own line
var fs = require('fs');

// @ngInject
function RootCtrl($scope, $location, $timeout, $templateCache, keyboardShortcutManager, queueManager,
                  notificationCentersRegistry, orchestrator, userInteractionManager, queuesRegistry, modalManager,
                  pointerManager, capabilities, searchCtrlHelper, configuration) {

  var rootCtrl = this;

  /**
   * Stores the serialized version of the queue. Useful to check the new url state against the internal state
   * to prevent infinite loops when changing the url internally.
   *
   * @type {string}
   */
  var serializedQueue;

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
    return !configuration.forceChrome && !userInteractionManager.userInteracting;
  }

  function shouldShowScene() {
    return capabilities.playback;
  }

  function shouldShowPlaybackControls() {
    return capabilities.playback || capabilities.remoteControl;
  }

  function togglePlayback() {
    orchestrator.togglePlayback();
  }

  // we need to wait for the loading phase to be done to avoid race problems (loading for ever)
  $timeout(activate);

  function activate() {
    // hide the input search at startup
    searchCtrlHelper.toggleSearch(false);

    // register the global space shortcut
    keyboardShortcutManager.register('space', function(evt) {
      evt.preventDefault();
      orchestrator.togglePlayback();
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
        queueManager.deserialize(serializedQueue).catch(function(message) {
          notificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
            notificationCenter.error(message);
          });
        }).finally(function() {
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

    // pre-fill the template cache with the content of the modal
    $templateCache.put('noPlaybackModalContent',
      fs.readFileSync(__dirname + '/components/capabilities/noPlaybackModalContent.html', 'utf8'));

    $scope.$watch(function() {
      return capabilities.playback;
    }, function(playback) {
      if (playback === false) {
        modalManager.open({
          title: 'MixTube won\'t work on your device',
          contentTemplateUrl: 'noPlaybackModalContent',
          commands: [{label: 'OK', primary: true}]
        });
      }
    });
  }
}

// @ngInject
function SearchResultsCtrl($scope, $timeout, youtubeClient, searchCtrlHelper) {

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

  /**
   * The user already executed one search. Used to hide the results pane until there is something to show.
   *
   * @type {boolean}
   */
  searchResultsCtrl.inSearch = null;
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
    return searchCtrlHelper.searchShown && searchResultsCtrl.inSearch;
  }

  function initSearch() {
    instantSearchPromise = null;
    searchResultsCtrl.inSearch = false;
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
  }

  /**
   * @param {string} term
   * @param {string=} nextPageId
   * @returns {Promise}
   */
  function searchYoutube(term, nextPageId) {
    var first = !nextPageId;

    var startSearchRequestCount = searchRequestCount;

    if (first) {
      searchResultsCtrl.pending.youtube = true;

      // reset the results list and the next page token since we are starting a new search
      searchResultsCtrl.results.youtube = [];
      searchResultsCtrl.nextPageId.youtube = null;
    } else {
      searchResultsCtrl.pendingMore.youtube = true;
    }

    return youtubeClient.searchVideosByQuery(term,
      {pageSize: first ? 11 : 12, pageId: nextPageId}).then(function doneCb() {
        if (searchRequestCount === startSearchRequestCount) {
          if (first) {
            searchResultsCtrl.pending.youtube = false;
          } else {
            searchResultsCtrl.pendingMore.youtube = false;
          }
        }
      }, null, function progressCb(results) {
        if (searchRequestCount === startSearchRequestCount) {
          if (results.videos.length) {
            searchResultsCtrl.results.youtube.push(results.videos);
            searchResultsCtrl.nextPageId.youtube = results.nextPageId;
          } else {
            searchResultsCtrl.noneFound.youtube = true;
          }
        }
      }).catch(function catchCb() {
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
            searchResultsCtrl.inSearch = true;
            searchYoutube(newSearchTerm);
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
function SearchResultCtrl($timeout, queueManager, queuesRegistry, orchestrator) {

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

    if (orchestrator.runningQueueEntry) {
      var entries = queueManager.queue.entries;
      searchResultCtrl.countBeforePlayback = entries.indexOf(queueEntry) - entries.indexOf(orchestrator.runningQueueEntry);
    } else {
      searchResultCtrl.countBeforePlayback = null;
    }

    queuesRegistry('queue').ready(function(queue) {
      queue.focusEntry(queueEntry);
    });

    searchResultCtrl.shouldShowConfirmation = true;
    $timeout.cancel(tmoPromise);
    tmoPromise = $timeout(function() {
      searchResultCtrl.shouldShowConfirmation = false;
    }, CONFIRMATION_DURATION);
  }
}

// @ngInject
function QueueCtrl(orchestrator, queueManager) {

  var queueCtrl = this;

  queueCtrl.playQueueEntry = playQueueEntry;
  queueCtrl.removeQueueEntry = removeQueueEntry;

  /**
   * @param {number} queueIndex
   */
  function playQueueEntry(queueIndex) {
    orchestrator.skipTo(queueIndex);
  }

  /**
   * @param {mt.QueueEntry} queueEntry
   */
  function removeQueueEntry(queueEntry) {
    queueManager.removeEntry(queueEntry);
  }
}

// @ngInject
function DebuggingCtrl(configuration, keyboardShortcutManager, notificationCentersRegistry) {

  activate();

  function notifyError(message) {
    notificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
      notificationCenter.error(message);
    });
  }

  function notifyComingNext(message) {
    notificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
      notificationCenter.comingNext({
        current: 'Current Song',
        next: 'Next Song',
        imageUrl: 'https://i.ytimg.com/vi/095Jdku7wo8/mqdefault.jpg'
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
        notifyComingNext('Debugging: Test notification');
      });
    }
  }
}

exports.RootCtrl = RootCtrl;
exports.SearchResultsCtrl = SearchResultsCtrl;
exports.SearchResultCtrl = SearchResultCtrl;
exports.QueueCtrl = QueueCtrl;
exports.DebuggingCtrl = DebuggingCtrl;