'use strict';

const gulp = require('gulp'),
  gutil = require('gulp-util'),
  merge = require('merge-stream'),
  buffer = require('vinyl-buffer'),
  sourcemaps = require('gulp-sourcemaps'),
  source = require('vinyl-source-stream'),
  watchify = require('watchify'),
  browserify = require('browserify'),
  envify = require('envify/custom'),
  collapse = require('bundle-collapser/plugin'),
  pathmodify = require('pathmodify'),
  uglify = require('gulp-uglify'),
  ngAnnotate = require('gulp-ng-annotate'),
  brfs = require('brfs'),
  noop = require('lodash.noop');

/**
 * @param {{appDirPath: string, publicDirPath: string, watch: boolean, production: boolean, errorTrackerPath: ?string, analyticsTrackerPath: ?string, environment: Object}} config
 * @returns {function}
 */
module.exports = function makeBuildJs(config) {

  return function buildJs() {
    const runBrowserifyOptions = {
      configureBundle: noop,
      pipelineFn: noop,
      watch: config.watch
    };

    runBrowserifyOptions.configureBundle = (bundle) => {
      if (config.production) {
        // convert bundle paths to IDS to save bytes in browserify bundles
        bundle.plugin(collapse);
      }

      // overriding trackers path to custom factories file when specified
      var mods = [];
      if(config.errorTrackerPath) {
        mods.push(pathmodify.mod.re(/.*delegates\/errorTracker(\.js)?$/, config.errorTrackerPath));
      }
      if(config.analyticsTrackerPath) {
        mods.push(pathmodify.mod.re(/.*delegates\/analyticsTracker(\.js)?$/, config.analyticsTrackerPath))
      }
      bundle.plugin(pathmodify, {mods: mods});
    };

    if (config.production) {
      runBrowserifyOptions.pipelineFn = function prodPipelineFn(pipeline) {
        return pipeline
          .pipe(buffer())
          .pipe(sourcemaps.init({loadMaps: true}))
          .pipe(ngAnnotate())
          .pipe(uglify())
          .pipe(sourcemaps.write('./'))
          .pipe(gulp.dest(config.publicDirPath));
      }
    } else {
      runBrowserifyOptions.pipelineFn = function devPipelineFn(pipeline) {
        return pipeline
          .pipe(buffer())
          .pipe(sourcemaps.init({loadMaps: true}))
          .pipe(ngAnnotate())
          .pipe(sourcemaps.write())
          .pipe(gulp.dest(config.publicDirPath));
      }
    }

    return merge(
      runBrowserify(`${config.appDirPath}/src/scripts/main.js`, 'main.js', runBrowserifyOptions, config.environment),
      runBrowserify(`${config.appDirPath}/src/scripts/components/capabilities/videoCallPlayTest.js`,
        'components/capabilities/videoCallPlayTest.js', runBrowserifyOptions, config.environment)
    );
  };
};

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{configureBundle: function, pipelineFn: function, watch: boolean}} options
 * @param {Object} environment
 * @returns {Stream.Readable}
 */
function runBrowserify(inputPath, outputPath, options, environment) {
  let bundle = browserify(inputPath, {cache: {}, packageCache: {}, fullPaths: true, debug: true});

  if (options.watch) {
    bundle = watchify(bundle);
    bundle.on('update', doBundle);
  }

  bundle.transform(brfs);
  bundle.transform(envify(Object.assign({_: 'purge'}, environment)));
  options.configureBundle(bundle);

  bundle.on('log', gutil.log);

  return doBundle();

  function doBundle() {
    return options.pipelineFn(
      bundle.bundle()
        .on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .pipe(source(outputPath))
    );
  }
}