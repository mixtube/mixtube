'use strict';

var path = require('path'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  buffer = require('vinyl-buffer'),
  source = require('vinyl-source-stream'),
  watchify = require('watchify'),
  browserify = require('browserify'),
  sass = require('gulp-sass'),
  please = require('gulp-pleeease'),
  sourcemaps = require('gulp-sourcemaps'),
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  jshint = require('gulp-jshint');

function buildBundleJS(src, dest) {
  var bundler = watchify(browserify(src, {cache: {}, packageCache: {}, fullPaths: true, debug: true}));
  bundler.transform('brfs');
  bundler.on('log', gutil.log);

  function bundleJS() {
    return bundler.bundle()
      // log errors if they happen
      .on('error', gutil.log.bind(gutil, 'Browserify Error'))
      .pipe(source(path.basename(dest)))
      .pipe(gulp.dest(path.dirname(dest)));
  }

  bundleJS.bundler = bundler;
  return bundleJS;
}

var bundleAppJS = buildBundleJS('./app/scripts/app.js', './build/scripts/app.bundle.js');

gulp.task('jshint', function() {
  return gulp.src('app/scripts/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('script', function() {
  bundleAppJS();
});

gulp.task('style', function() {
  return gulp.src('app/styles/css/main.scss', {base: 'app'})
    .pipe(sourcemaps.init())
    .pipe(sass({errLogToConsole: true}))
    .pipe(please({
      import: false,
      minifier: false,
      mqpacker: false,
      autoprefixer: ['last 1 version'],
      variables: false,
      rem: false,
      pseudoElements: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build'))
    .pipe(reload({stream: true}));
});

gulp.task('watch', function() {
  bundleAppJS.bundler.on('update', bundleAppJS);
  gulp.watch('app/styles/**/*.scss', ['style']);
  gulp.watch('app/scripts/**/*.js', ['jshint']);
});

gulp.task('serve', ['script', 'jshint', 'style', 'watch'], function() {
  browserSync({
    open: false,
    server: {
      baseDir: ['app', 'build']
    }
  });
});
