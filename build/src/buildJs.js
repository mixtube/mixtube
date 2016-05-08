'use strict';

const merge = require('merge-stream'),
  buffer = require('vinyl-buffer'),
  sourcemaps = require('gulp-sourcemaps'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  source = require('vinyl-source-stream'),
  watchify = require('watchify'),
  browserify = require('browserify'),
  envify = require('envify/custom'),
  collapse = require('bundle-collapser/plugin'),
  uglify = require('gulp-uglify'),
  ngAnnotate = require('gulp-ng-annotate');

/**
 * @param {{appDirPath: string, publicDirPath: string, watch: boolean, production: boolean, environment: Object}} config
 * @returns {function}
 */
module.exports = function makeBuildJs(config) {

  return function buildJs() {
    const runBrowserifyOptions = {
      configureBundle: noop,
      pipelineFn: noop,
      watch: config.watch
    };

    if (config.production) {
      runBrowserifyOptions.configureBundle = (bundle) => {
        // convert bundle paths to IDS to save bytes in browserify bundles
        bundle.plugin(collapse);
      };

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

  bundle.transform(envify(environment));
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