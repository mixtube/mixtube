'use strict';

var modernizrFactory = require('./modernizrFactory');

if (!global.onMtVideoAutoPlayTestReady) {
  throw new Error('The video auto play capability test should be always included after onMtVideoAutoPlayTestReady is defined');
}

function testVideoAutoPlay() {
  return new Promise(function(resolve) {
    // instantiates and run tests
    modernizrFactory().on('videoautoplay', resolve);
  });
}

global.onMtVideoAutoPlayTestReady(testVideoAutoPlay);
