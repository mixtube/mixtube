'use strict';

const got = require('got');
const parseQS = require('querystring').parse;

module.exports = youtubeGetInfo;

const fetchInfo = origin => videoId => {
  return got('https://www.youtube.com/get_video_info', {
    query: {
      html5: '1',
      video_id: videoId,
      eurl: origin
    }
  })
    .then(response => Object.assign({ id: videoId }, parseQS(response.body)))
};

function youtubeGetInfo(videosIds, origin) {
  return Promise.all(videosIds.map(fetchInfo(origin)));
}



