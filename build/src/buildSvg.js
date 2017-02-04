'use strict';

const gulp = require('gulp'),
  svgmin = require('gulp-svgmin'),
  svgstore = require('gulp-svgstore'),
  rename = require('gulp-rename'),
  path = require('path');

/**
 * @param {{appDirPath: string, publicDirPath: string, svgLogoPath: string, watch: boolean, production: boolean}} config
 * @returns {function}
 */
module.exports = function makeBuildSvg(config) {

  const resolvedLogoPath = path.resolve(config.svgLogoPath);

  const svgPaths = [
    'node_modules/Ionicons/src/ios-search.svg',
    'node_modules/Ionicons/src/ios-close.svg',
    'node_modules/Ionicons/src/ios-close-empty.svg',
    'node_modules/Ionicons/src/ios-videocam.svg',
    'node_modules/Ionicons/src/load-c.svg',
    'src/images/mt-play-circle.svg',
    'src/images/mt-pause-circle.svg'
  ].map(path => `${config.appDirPath}/${path}`);
  svgPaths.push(config.svgLogoPath);

  return function buildSvg() {

    if (config.watch) {
      gulp.watch(svgPaths, runSvgPipeline);
    }

    return runSvgPipeline();

    function runSvgPipeline() {
      return gulp.src(svgPaths, {
        // forces gulp to set a base (any base would work here)
        // it is just to get dirname in gulp rename so that we can resolve the absolute logo path
        base: '.'
      })
        .pipe(rename(file => {
          // counter intuitive but by renaming the file we change the id of the resulting sprite
          if (path.resolve(file.dirname, file.basename + file.extname) === resolvedLogoPath) {
            file.basename = 'mt-logo';
          }
        }))
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
