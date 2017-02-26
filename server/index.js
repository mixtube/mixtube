'use strict';

const url = require('url');
const express = require('express');
const compression = require('compression');
const youtubeGetVideoInfo = require('./functions/youtubeGetVideoInfo');

const PORT = 4000;
const app = express();

if (process.env.NODE_ENV !== 'development') {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500);
  });
}

app.use(compression());

// enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/v1/youtube/extra/videos', (req, res, next) => {
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
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

function transformInfo({ id, status, errorcode }) {
  return { id, blacklisted: status === 'fail' && errorcode === '150' };
}
