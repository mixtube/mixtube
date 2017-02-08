'use strict';

const gulp = require('gulp');

/**
 * @param {{publicDirPath: string, logoPath: string}} config
 * @returns {function}
 */
module.exports = function makeCopyLogo(config) {
  return function copyLogo() {
    return gulp.src(config.logoPath)
      .pipe(gulp.dest(config.publicDirPath));
  }
};
