(function(mt) {
  'use strict';

  mt.MixTubeApp.controller('mtRootCtrl',
    function($scope, $location, $timeout, mtKeyboardShortcutManager, mtQueueManager, SearchInputsRegistry,
             NotificationCentersRegistry, Orchestrator, UserInteractionManager, QueuesRegistry, ModalManager,
             PointerManager, Capabilities, SearchCtrlHelper) {

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
      rootCtrl.isMouseDetected = isMouseDetected;
      rootCtrl.shouldShowScene = shouldShowScene;
      rootCtrl.shouldShowPlaybackControls = shouldShowPlaybackControls;
      rootCtrl.toggleSearch = SearchCtrlHelper.toggleSearch;
      rootCtrl.togglePlayback = togglePlayback;

      // setup direct access to the property for double binding
      Object.defineProperty(rootCtrl, 'searchTerm', {
        get: function() {
          return SearchCtrlHelper.searchTerm;
        },
        set: function(value) {
          SearchCtrlHelper.searchTerm = value;
        }
      });

      function isSearchShown() {
        return SearchCtrlHelper.searchShown;
      }

      function getQueue() {
        return mtQueueManager.queue;
      }

      function getRunningQueueEntry() {
        return Orchestrator.runningQueueEntry;
      }

      function getLoadingQueueEntry() {
        return Orchestrator.loadingQueueEntry;
      }

      function isPlaying() {
        return Orchestrator.playing;
      }

      function shouldIdleChrome() {
        return !UserInteractionManager.userInteracting;
      }

      function isMouseDetected() {
        return PointerManager.mouseDetected;
      }

      function shouldShowScene() {
        return Capabilities.playback;
      }

      function shouldShowPlaybackControls() {
        return Capabilities.playback || Capabilities.remoteControl;
      }

      function togglePlayback() {
        Orchestrator.togglePlayback();
      }

      // we need to wait for the loading phase to be done to avoid race problems (loading for ever)
      $timeout(activate);

      function activate() {
        // hide the input search at startup
        SearchCtrlHelper.toggleSearch(false);

        // register the global space shortcut
        mtKeyboardShortcutManager.register('space', function(evt) {
          evt.preventDefault();
          Orchestrator.togglePlayback();
        });

        mtKeyboardShortcutManager.register('search', 'esc', function(evt) {
          evt.preventDefault();
          SearchCtrlHelper.toggleSearch(false);
        });

        $scope.$watch(function() {
          return mtQueueManager.queue;
        }, function(newVal, oldVal) {
          // this test is here to prevent to serialize during the init phase
          if (newVal !== oldVal) {
            var newSerializedQueue = mtQueueManager.serialize();
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
            mtQueueManager.deserialize(serializedQueue).catch(function(message) {
              NotificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
                notificationCenter.error(message);
              });
            }).finally(function() {
              rootCtrl.queueLoading = false;
            });
          }
        });

        $scope.$watch(function() {
          return Orchestrator.runningQueueEntry;
        }, function(runningQueueEntry, oldVal) {
          if (runningQueueEntry !== oldVal) {
            QueuesRegistry('queue').ready(function(queue) {
              queue.focusEntry(runningQueueEntry);
            });
          }
        });

        $scope.$watch(function() {
          return Capabilities.playback;
        }, function(playback) {
          if (playback === false) {
            ModalManager.open({
              title: 'MixTube won\'t work on your device',
              contentTemplateUrl: '/scripts/components/capabilities/no-playback-modal-content.html',
              commands: [{label: 'OK', primary: true}]
            });
          }
        });
      }
    });

  mt.MixTubeApp.controller('mtSearchResultsCtrl',
    function($scope, $rootScope, $timeout, $q, mtYoutubeClient, SearchCtrlHelper) {

      var searchResultsCtrl = this;

      /**
       * @const
       * @type {number}
       */
      var INSTANT_SEARCH_DELAY = 500;

      /** @type {number} */
      var searchRequestCount = 0;
      /** @type {promise} */
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
       * @type {Object.<string, Array.<Array.<mt.model.Video>>>}
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
        return SearchCtrlHelper.searchTerm;
      }

      function shouldShowSearchResultPanel() {
        return SearchCtrlHelper.searchShown && searchResultsCtrl.inSearch;
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
          searchYoutube(SearchCtrlHelper.searchTerm, nextPageId);
        }
      }

      /**
       *
       * @param {string} term
       * @param {string=} nextPageId
       * @returns {promise}
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

        return mtYoutubeClient.searchVideosByQuery(term,
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
          return SearchCtrlHelper.searchTerm;
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
          return SearchCtrlHelper.searchShown;
        }, function(searchShown) {
          if (searchShown) {
            initSearch();
          } else {
            $timeout.cancel(instantSearchPromise);
          }
        });
      }
    });

  mt.MixTubeApp.controller('mtSearchResultCtrl',
    function($scope, $timeout, mtQueueManager, QueuesRegistry, Orchestrator) {

      /**
       * @const
       * @type {number}
       */
      var CONFIRMATION_DURATION = 4000;

      var searchResultCtrl = this;
      var tmoPromise = null;

      searchResultCtrl.shouldShowConfirmation = false;
      searchResultCtrl.countBeforePlayback = null;

      /**
       * @param {mt.model.Video} video
       */
      searchResultCtrl.appendResultToQueue = function(video) {

        var queueEntry = mtQueueManager.appendVideo(video);

        if (Orchestrator.runningQueueEntry) {
          var entries = mtQueueManager.queue.entries;
          searchResultCtrl.countBeforePlayback = entries.indexOf(queueEntry) - entries.indexOf(Orchestrator.runningQueueEntry);
        } else {
          searchResultCtrl.countBeforePlayback = null;
        }

        QueuesRegistry('queue').ready(function(queue) {
          queue.focusEntry(queueEntry);
        });

        searchResultCtrl.shouldShowConfirmation = true;
        $timeout.cancel(tmoPromise);
        tmoPromise = $timeout(function() {
          searchResultCtrl.shouldShowConfirmation = false;
        }, CONFIRMATION_DURATION);
      };
    });

  mt.MixTubeApp.controller('mtQueueCtrl', function(Orchestrator, mtQueueManager) {

    var queueCtrl = this;

    /**
     * @param {number} queueIndex
     */
    queueCtrl.playQueueEntry = function(queueIndex) {
      Orchestrator.skipTo(queueIndex);
    };

    /**
     * @param {mt.model.QueueEntry} queueEntry
     */
    queueCtrl.removeQueueEntry = function(queueEntry) {
      mtQueueManager.removeEntry(queueEntry);
    };
  });

  mt.MixTubeApp.controller('mtDebuggingCtrl',
    function(Configuration, mtKeyboardShortcutManager, NotificationCentersRegistry) {

      function notification(message) {
        NotificationCentersRegistry('notificationCenter').ready(function(notificationCenter) {
          notificationCenter.error(message);
        });
      }

      if (Configuration.debugNotifications) {
        // register the global space shortcut
        mtKeyboardShortcutManager.register('ctrl+n', function(evt) {
          evt.preventDefault();
          notification('Debugging: Test notification');
        });
      }
    });
})(mt);