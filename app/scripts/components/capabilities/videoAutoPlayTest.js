'use strict';

var Modernizr = require('./customModernizr');

if (!global.onMtVideoAutoPlayTestReady) {
  throw new Error('The video auto play capability test should be always included after onMtVideoAutoPlayTestReady is defined');
}

global.onMtVideoAutoPlayTestReady(new Promise(function(resolve) {
  Modernizr.on('videoautoplay', resolve);
}));
