'use strict';

const gulp = require('gulp'),
  gutil = require('gulp-util'),
  sourcemaps = require('gulp-sourcemaps'),
  sass = require('gulp-sass'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer'),
  csswring = require('csswring'),
  bourbon = require('node-bourbon'),
  plumber = require('gulp-plumber'),
  ReplaySubject = require('rx').ReplaySubject;

/**
 * @param {{appDirPath: string, watch: boolean, production: boolean}} config
 * @returns {function}
 */
module.exports = function makeBuildInlineCss(config) {

  const inlineCssSource = `${config.appDirPath}/src/styles/css/inline.scss`;
  const cssPostproConf = [autoprefixer({browsers: ['last 1 version']})];
  if (config.production) {
    cssPostproConf.push(csswring);
  }

  /**
   * @returns {Rx.Observable<string>} a replayable observable returning the css code to inline
   */
  return function buildInlineCss() {

    const subject = new ReplaySubject(1);

    if (config.watch) {
      gulp.watch(inlineCssSource, runInlineCssPipeline);
    }

    runInlineCssPipeline();

    return subject;

    function runInlineCssPipeline() {
      return gulp.src(inlineCssSource)
        .pipe(plumber())
        .pipe(sass({includePaths: bourbon.includePaths}))
        .pipe(postcss(cssPostproConf))
        .pipe(gutil.buffer((err, files) => {
          subject.onNext(files.map(file => {
            return file.contents.toString();
          }).join(''));
        }));
    }
  };
};