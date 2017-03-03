'use strict';

const url = require('url');
const youtubeGetVideoInfo = require('./functions/youtubeGetVideoInfo');

exports.httpYoutubeGetVideoInfo = (req, res, next) => {
  const { id, origin } = req.query;
  if (!id) {
    next(new Error('Missing id parameter'));
    return;
  }
  const videoIds = id.split(',').map(str => str.trim());
  if (videoIds.some(id => !id.trim())) {
    next(new Error('id parameter should be a list of ids'));
    return;
  }

  if (!origin) {
    next(new Error('Missing origin parameter'));
    return;
  }
  const originUrl = url.parse(origin);
  if (!originUrl.protocol || !originUrl.hostname) {
    next(new Error('origin should contain a protocol and a hostname'));
    return;
  }

  youtubeGetVideoInfo(videoIds, origin)
    .then(infoList => res.json(infoList.map(transformInfo)))
    .catch(next);
};
