'use strict';

const gulp = require('gulp'),
  svgmin = require('gulp-svgmin'),
  svgstore = require('gulp-svgstore'),
  rename = require('gulp-rename'),
  path = require('path');

/**
 * @param {{appDirPath: string, publicDirPath: string, watch: boolean, production: boolean}} config
 * @returns {function}
 */
module.exports = function makeBuildSvg(config) {
  const svgPaths = [
    'node_modules/Ionicons/src/ios-search.svg',
    'node_modules/Ionicons/src/ios-close.svg',
    'node_modules/Ionicons/src/ios-close-empty.svg',
    'node_modules/Ionicons/src/ios-videocam.svg',
    'node_modules/Ionicons/src/load-c.svg',
    'src/images/mt-play-circle.svg',
    'src/images/mt-pause-circle.svg'
  ].map(path => `${config.appDirPath}/${path}`);

  return function buildSvg() {

    if (config.watch) {
      gulp.watch(svgPaths, runSvgPipeline);
    }

    return runSvgPipeline();

    function runSvgPipeline() {
      return gulp.src(svgPaths)
        .pipe(svgmin({
            js2svg: {
              pretty: !config.production
            },
            plugins: [{
              removeStyleElement: true,
            }, {
              removeUnknownsAndDefaults: false
            }]
          }
        ))
        .pipe(svgstore())
        .pipe(rename('sprite.svg'))
        .pipe(gulp.dest(config.publicDirPath));
    }
  };
};
