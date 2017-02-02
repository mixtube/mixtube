'use strict';

const gulp = require('gulp'),
  sourcemaps = require('gulp-sourcemaps'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer'),
  csswring = require('csswring'),
  plumber = require('gulp-plumber'),
  mixtubeSass = require('./gulpMixtubeSass');


/**
 * @param {{appDirPath: string, publicDirPath: string, appColor, watch: boolean, production: boolean}} config
 * @returns {function}
 */
module.exports = function makeBuildCss(config) {

  const cssPostproConf = [autoprefixer({ browsers: ['last 1 version'] })];
  if (config.production) {
    cssPostproConf.push(csswring);
  }

  return function buildCss() {
    if (config.watch) {
      gulp.watch(`${config.appDirPath}/src/styles/**/*.scss`, runCssPipeline);
    }

    return runCssPipeline();

    function runCssPipeline() {
      return gulp.src(`${config.appDirPath}/src/styles/css/main.scss`)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(mixtubeSass({
          appDirPath: config.appDirPath,
          variables: { 'color-accent': config.appColor }
        }))
        .pipe(postcss(cssPostproConf))
        .pipe(sourcemaps.write(config.production ? './' : undefined))
        .pipe(gulp.dest(config.publicDirPath));
    }
  };
};