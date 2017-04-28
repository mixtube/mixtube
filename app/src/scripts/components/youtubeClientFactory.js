'use strict';

var angular = require('angular'),
  defaults = require('lodash/defaults'),
  has = require('lodash/has'),
  map = require('lodash/map'),
  keyBy = require('lodash/keyBy'),
  memoize = require('lodash/memoize'),
  onIdle = require('on-idle'),
  drmChecker = require('mixtube-playback').drmChecker;

// @ngInject
function youtubeClientFactory($http, $q, configuration) {

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
  var MAX_RESULTS_LIMIT = 50;

  /**
   * Allow to parse "exotic" time format from Youtube data API.
   *
   * @const
   * @type {RegExp}
   */
  var ISO8601_REGEXP = /PT(?:(\d*)H)?(?:(\d*)M)?(?:(\d*)S)?/;

  var _drmChecker;

  activate();

  function activate() {
    _drmChecker = drmChecker({
      max: 2,
      elementProducer: function defaultElementProducer() {
        var elmt = document.createElement('div');

        Object.assign(elmt.style, {
          width: '1px',
          height: '1px',
          position: 'absolute',
          top: '-100px',
          opacity: 0
        });
        document.body.appendChild(elmt);
        return elmt;
      }
    });
  }

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

  function checkDrm(id) {
    return new $q(function(resolve, reject) {
      // only trigger this expensive call when there is some room for it
      onIdle(function() {
        _drmChecker.checkDrm({provider: 'youtube', id: id})
          .then(function(drmReport) {
            return {id: id, blacklisted: !drmReport.playable};
          })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * @param {Array.<string>} videosIds
   * @returns {Promise}
   */
  function getVideosDetails(videosIds) {
    // We have to use JSONP here
    //  - IE11 manages CORS request if originating page and requested resource have the same protocol
    //  - googleapi.com only accept https protocol
    //  - it is not doable right now to have MixTube served through https
    //  ==> can't use CORS for MixTube in IE11 ==> can't use CORS in MixTube
    return $http.jsonp('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        id: videosIds.join(','),
        part: 'snippet,statistics,contentDetails,status',
        callback: 'JSON_CALLBACK',
        key: configuration.youtubeAPIKey
      }
    });
  }

  function fetchVideosDetailsById(videosIds) {
    return getVideosDetails(videosIds)
      .then(function(response) {
        var data = response.data;

        if (has(data, 'error')) {
          // youtube API does not return an error HTTP status in case of error but a success with a
          // special error object in the response
          return $q.reject(data.error.errors);
        } else {
          return data;
        }
      })
      .then(function(data) {
        const details = data.items.map(function(item) {
          return {
            provider: 'youtube',
            id: item.id,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails.medium.url,
            publisherName: item.snippet.channelTitle,
            duration: convertISO8601DurationToMillis(item.contentDetails.duration),
            viewCount: parseInt(item.statistics.viewCount, 10),
            embeddable: item.status.embeddable
          };
        });

        return keyBy(details, 'id');
      });
  }

  function extendVideosWithPromiseResults(videos, promise) {
    if (videos.length > MAX_RESULTS_LIMIT) {
      throw new Error('YouTube API can not list more than ' + MAX_RESULTS_LIMIT + ' videos. Please reduce the videos ids list.');
    }

    return promise.then(function(videosExtra) {
      videos.forEach(function(video) {
        // videos details can be undefined if no extra video info url is provided
        angular.extend(video, videosExtra[video.id]);
      });

      return videos;
    });
  }

  function listVideosByIds(ids, notifyCb) {
    // prepare an array of pseudo videos that have only the id property defined
    var videos = ids.map(function(id) {
      return {id: id};
    });

    var pagesDetailsPromises = [];
    var pagesInfoPromises = [];

    var pagesCount = videos.length / MAX_RESULTS_LIMIT;
    for (var pageIdx = 0; pageIdx < pagesCount; pageIdx++) {

      var pageStart = pageIdx * MAX_RESULTS_LIMIT;
      var videosPaged = videos.slice(pageStart, Math.min(pageStart + MAX_RESULTS_LIMIT, videos.length));
      var videosIds = map(videosPaged, 'id');

      pagesDetailsPromises.push(extendVideosWithPromiseResults(videosPaged, fetchVideosDetailsById(videosIds)));
    }

    var allPagesDetailsPromise = $q.all(pagesDetailsPromises);
    var allPagesInfoPromise = $q.all(pagesInfoPromises);

    // early notification to allow progressive rendering
    allPagesDetailsPromise.then(function() {
      notifyCb(videos);
    });

    return $q.all([allPagesDetailsPromise, allPagesInfoPromise])
      .then(function() {
        return videos;
      });
  }

  function searchVideosByQuery(queryString, pageSpec, notifyCb) {

    pageSpec = defaults({}, pageSpec, { pageId: null, pageSize: MAX_RESULTS_LIMIT });

    return $http.jsonp('https://www.googleapis.com/youtube/v3/search', {
      params: {
        q: queryString,
        type: 'video',
        part: 'snippet',
        videoEmbeddable: true,
        pageToken: pageSpec.pageId,
        maxResults: pageSpec.pageSize,
        callback: 'JSON_CALLBACK',
        key: configuration.youtubeAPIKey
      }
    })
      .then(function(response) {

        var data = response.data;

        if (has(data, 'error')) {
          // youtube API does not return an error HTTP status in case of error but a success with a
          // special error object in the response
          return $q.reject(data.error.errors);
        } else {
          return data;
        }
      })
      .then(function(data) {
        var videos = data.items.map(function(item) {
          return {
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails.medium.url,
            // a reminder that the channelTitle returned by YT search API is wrong
            // publisherName: item.snippet.channelTitle,
            provider: 'youtube'
          };
        });

        var videosIds = map(videos, 'id');

        // first batch of results just notify (will call the progress handler)
        notifyCb({ videos: videos, nextPageId: data.nextPageToken });

        // the search is done when both extra info chunks have been fully fetched
        return extendVideosWithPromiseResults(videos, fetchVideosDetailsById(videosIds))
          .then(function() {
            return {videos: videos, nextPageToken: data.nextPageToken};
          });
      });
  }


  /**
   * @name youtubeClient
   */
  var youtubeClient = {
    get shortName() {
      return SHORT_NAME;
    },

    get maxResultsLimit() {
      return MAX_RESULTS_LIMIT;
    },

    /**
     * Check the DRM info for the given video id.
     *
     * It tries to call the drm checker only when there is some frame time available (leveraging requestIdleCallback).
     *
     * @param {string} id
     * @returns {Promise.<{id: string, blacklisted: boolean}>}
     */
    checkDrm: memoize(checkDrm),

    /**
     * Lists the videos for the given ids.
     *
     * The returned collection always contains video pseudo objects (projection of {@link mt.Video} with at
     * least the id. That doesn't mean that it was found, check properties values to know if it was.
     *
     * @param {Array.<string>} ids the list of youtube videos ids
     * @param {function} notifyCb a callback to be called with the temporary result to enable progressive rendering
     * @return {Promise} a promise resolved with Array.<mt.Video>
     */
    listVideosByIds: listVideosByIds,

    /**
     * Searches videos on youtube matching the query.
     *
     * The goal is to provide lite results as fast as possible and upgrade each item when there are more details
     * available. It is impossible to get all the properties in one shot because of the design of the Youtube API.
     *
     * The videos objects are passed by the returned promise to be able to update the model as the details
     * arrive. The promise parameter is an array of {@link mt.Video} for the first call and a projection
     * of videos after with only the properties available at the execution time.
     *
     * @param {string} queryString the query as used for a classic youtube search
     * @param {{pageId: string=, pageSize: number}} pageSpec parameters for paging (default to
     * {@link configuration.maxSearchResults})
     * @param {function} notifyCb a callback to be called with the temporary result to enable progressive rendering
     * @return {promise.<{videos: Array.<mt.Video>, netPageId: string}>} resolved when finished.
     * Intermediary states are delivered through the promise's progress callback.
     */
    searchVideosByQuery: searchVideosByQuery
  };

  return youtubeClient;
}

module.exports = youtubeClientFactory;