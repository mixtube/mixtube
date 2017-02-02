const gulp = require('gulp'),
  sourcemaps = require('gulp-sourcemaps'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer'),
  csswring = require('csswring'),
  plumber = require('gulp-plumber'),
  ReplaySubject = require('rx').ReplaySubject,
  mixtubeSass = require('./gulpMixtubeSass'),
  concatDest = require('./gulpConcatDest');


'use strict';
/**
 * @param {{appDirPath: string, appColor: string, watch: boolean, production: boolean}} config
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
        .pipe(mixtubeSass({
          appDirPath: config.appDirPath,
          variables: { 'color-accent': config.appColor }
        }))
        .pipe(postcss(cssPostproConf))
        .pipe(concatDest((err, content) => subject.onNext(content)));
    }
  };
};