'use strict';

var angular = require('angular'),
  defaults = require('lodash/defaults'),
  has = require('lodash/has'),
  map = require('lodash/map'),
  parseQueryString = require('query-string').parse;

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

  /**
   * Get video info from an undocumented YouTube API.
   *
   * It is used to check if the current domain is blacklisted for the given video id.
   *
   * @param {string} videoId
   * @param {string} origin the domain where we want to play the video
   * @returns {Promise}
   */
  function getVideoInfo(videoId, origin) {
    return $http.get('https://cors-anywhere.herokuapp.com/https://www.youtube.com/get_video_info', {
      params: {
        html5: '1',
        video_id: videoId,
        eurl: origin
      }
    })
      .then(function(infoQs) {
        return parseQueryString(infoQs.data);
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
        var videosDetailsById = {};
        data.items.forEach(function(item) {
          videosDetailsById[item.id] = {
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

        return videosDetailsById;
      });
  }

  function fetchVideosInfoById(videosIds) {
    var videosInfoById = {};
    return $q.all(videosIds.map(function(videoId) {
      return getVideoInfo(videoId, location.hostname)
        .then(function(info) {
          videosInfoById[videoId] = { blacklisted: info.status === 'fail' && info.errorcode === '150' };
        });
    })).then(function() {
      return videosInfoById;
    });
  }

  function extendVideosWithDetails(videos) {
    if (videos.length > MAX_RESULTS_LIMIT) {
      throw new Error('YouTube API can not list more than ' + MAX_RESULTS_LIMIT + ' videos. Please reduce the videos ids list.');
    }

    var videosIds = map(videos, 'id');

    return $q.all([
      fetchVideosInfoById(videosIds),
      fetchVideosDetailsById(videosIds)
    ])
      .then(function(args) {
        var videosInfoById = args[0];
        var videosDetailsById = args[1];

        videos.forEach(function(video) {
          angular.extend(video, videosInfoById[video.id], videosDetailsById[video.id]);
        });

        return videos;
      });
  }

  function listVideosByIds(ids) {
    // prepare an array of pseudo videos that have only the id property defined
    var videos = ids.map(function(id) {
      return { id: id };
    });

    var pagesPromises = [];

    var pagesCount = videos.length / MAX_RESULTS_LIMIT;
    for (var pageIdx = 0; pageIdx < pagesCount; pageIdx++) {

      var pageStart = pageIdx * MAX_RESULTS_LIMIT;
      var videosPaged = videos.slice(pageStart, Math.min(pageStart + MAX_RESULTS_LIMIT, videos.length));
      pagesPromises.push(extendVideosWithDetails(videosPaged));
    }

    return $q.all(pagesPromises)
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
            provider: 'youtube',
            // temporary store the channel, used after to add the video channel name
            __youtubeChannelId: item.snippet.channelId
          };
        });

        // first batch of results just notify (will call the progress handler)
        notifyCb({ videos: videos, nextPageId: data.nextPageToken });

        return { videos: videos, nextPageToken: data.nextPageToken };
      })
      .then(function(param) {
        return extendVideosWithDetails(param.videos)
          .then(function(videos) {
            return { videos: videos, nextPageId: param.nextPageToken };
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
     * Lists the videos for the given ids.
     *
     * The returned collection always contains video pseudo objects (projection of {@link mt.Video} with at
     * least the id. That doesn't mean that it was found, check properties values to know if it was.
     *
     * @param {Array.<string>} ids the list of youtube videos ids
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
     * @return {promise.<{videos: Array.<mt.Video>, netPageId: string}>} resolved when finished.
     * Intermediary states are delivered through the promise's progress callback.
     */
    searchVideosByQuery: searchVideosByQuery
  };

  return youtubeClient;
}

module.exports = youtubeClientFactory;