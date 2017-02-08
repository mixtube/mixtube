'use strict';

const gulp = require('gulp'),
  ghPages = require('gulp-gh-pages');

/**
 * @param {{publicDirPath: string}} config
 * @returns {function}
 */
module.exports = function makePushGhPages(config) {
  return function pushGhPages() {
    return gulp.src(`${config.publicDirPath}/**/*`)
      .pipe(ghPages());
  };
};