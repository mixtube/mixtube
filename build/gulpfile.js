'use strict';

const gulp = require('gulp'),
  yargs = require('yargs'),
  clean = require('./src/clean'),
  pushGhPages = require('./src/pushGhPages'),
  checkJS = require('./src/checkJs'),
  buildJs = require('./src/buildJs'),
  buildCss = require('./src/buildCss'),
  buildSvg = require('./src/buildSvg'),
  buildHtml = require('./src/buildHtml'),
  buildInlineCss = require('./src/buildInlineCss'),
  serve = require('./src/serve'),
  packageVersion = require('../package').version;

const commandLine = yargs
  .options({
    'watch': {
      default: false,
      describe: 'watches for source changes and automatically rebuild',
      type: 'boolean'
    },
    'serve': {
      default: false,
      describe: 'turns on the local server',
      type: 'boolean'
    },
    'production': {
      default: false,
      describe: 'turns on minification and inlining of "critical path css"',
      type: 'boolean'
    },
    'appVersion': {
      default: packageVersion,
      describe: 'specifies the version number for the app',
      type: 'string'
    },
    'baseUrl': {
      default: '/',
      describe: 'specifies the base URL to use for all relative URLs',
      type: 'string'
    },
    'publicDirPath': {
      default: 'public',
      describe: 'specifies the output directory for the build',
      type: 'string'
    },
    'errorTrackerPath': {
      describe: 'overrides the default error tracker implementation',
      type: 'string'
    },
    'analyticsTrackerPath': {
      describe: 'overrides the default analytics tracker implementation',
      type: 'string'
    },
    'injectHeadPath': {
      describe: 'appends the given snippet to the HTML index file\'s head section',
      type: 'string'
    }
  });

const cmdArgumentsValues = commandLine.argv;

const config = {
  appDirPath: '../app',
  publicDirPath: cmdArgumentsValues.publicDirPath,
  htmlBaseUrl: cmdArgumentsValues.baseUrl,
  appName: 'MixTube',
  appColor: '#8EC447',
  appVersion: cmdArgumentsValues.appVersion,
  watch: cmdArgumentsValues.watch,
  production: cmdArgumentsValues.production,
  errorsTrackerPath: cmdArgumentsValues.errorsTrackerPath,
  analyticsTrackerPath: cmdArgumentsValues.analyticsTrackerPath,
  injectHeadPath: cmdArgumentsValues.injectHeadPath,
  youtubeApiKey: process.env.MIXTUBE_YOUTUBE_API_KEY
};

const tasks = [
  buildJs(config),
  buildCss(config),
  buildSvg(config),
  buildHtml(config, buildInlineCss(config))
];

if (cmdArgumentsValues.serve) {
  tasks.push(serve(config));
}

const build = gulp.series(
  checkJS(config),
  clean(config),
  gulp.parallel(tasks));

const deployGh = gulp.series(
  build,
  pushGhPages(config));

gulp.task('help', (done) => {
  commandLine.showHelp();
  done();
});

gulp.task('build', build);

gulp.task('deploy:gh', deployGh);