'use strict';

const path = require('path'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  plumber = require('gulp-plumber'),
  merge = require('merge-stream'),
  multistream = require('multistream'),
  del = require('del'),
  buffer = require('vinyl-buffer'),
  sourcemaps = require('gulp-sourcemaps'),
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  compression = require("compression"),
  sass = require('gulp-sass'),
  bourbon = require('node-bourbon'),
  postcss = require('gulp-postcss'),
  htmlreplace = require('gulp-html-replace'),
  svg2png = require('gulp-svg2png'),
  favicons = require('favicons').stream,
  template = require('gulp-template'),
  ghPages = require('gulp-gh-pages'),
  minimist = require('minimist'),
  Observable = require('rx').Observable,
  appVersion = require('./package').version,
  appConfig = require('./package').config.application;

const cmdArguments = minimist(process.argv.slice(2), {
  boolean: ['production', 'watch']
});

const noop = () => {
};

const appDirPath = '../app';
const publicDirPath = 'public';
const htmlBaseUrl = '/';

gulp.task('build', gulp.parallel(checkJs, makeBuildJs({
  YOUTUBE_API_KEY: process.env.MIXTUBE_YOUTUBE_API_KEY
}), makeBuildCss(), buildSvg, buildHtml));

gulp.task('html', buildHtml);


