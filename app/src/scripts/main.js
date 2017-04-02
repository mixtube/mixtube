'use strict';

var mixtube = require('./mixtube'),
  analyticsTracker = require('./delegates/analyticsTracker'),
  errorsTracker = require('./delegates/errorsTracker');

mixtube({
  youtubeAPIKey: process.env.YOUTUBE_API_KEY,
  youtubeExtraVideosInfoUrl: process.env.YOUTUBE_EXTRA_VIDEOS_INFO_URL
}, {
  analyticsTracker: analyticsTracker(),
  // log collected exception to the browser console by default
  errorsTracker: errorsTracker()
});
