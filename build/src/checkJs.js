'use strict';

const gulp = require('gulp'),
  jshint = require('gulp-jshint');

/**
 * @param {{appDirPath: string, watch: boolean}} config
 * @returns {function}
 */
module.exports = function makeCheckJs(config) {

  return function checkJs() {
    const checkedGlobPath = `${config.appDirPath}/src/scripts/**/*.js`;

    if (config.watch) {
      gulp.watch(checkedGlobPath, runCheckJsPipeline);
    }

    return runCheckJsPipeline();

    function runCheckJsPipeline() {
      return gulp.src(checkedGlobPath)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
    }
  };
};
