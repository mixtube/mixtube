'use strict';

const gulp = require('gulp'),
  minimist = require('minimist'),
  clean = require('./src/clean'),
  pushGhPages = require('./src/pushGhPages'),
  checkJS = require('./src/checkJs'),
  buildJs = require('./src/buildJs'),
  buildCss = require('./src/buildCss'),
  buildSvg = require('./src/buildSvg'),
  buildHtml = require('./src/buildHtml'),
  buildInlineCss = require('./src/buildInlineCss'),
  buildFavicons = require('./src/buildFavicons'),
  serve = require('./src/serve'),
  appVersion = require('../package').version;

const cmdArguments = minimist(process.argv.slice(2), {
  boolean: ['production', 'watch', 'serve'],
  string: ['baseUrl']
});

const config = {
  appDirPath: '../app',
  publicDirPath: 'public',
  htmlBaseUrl: cmdArguments.baseUrl || '/',
  appName: 'MixTube',
  appColor: '#8EC447',
  appVersion: appVersion,
  watch: cmdArguments.watch,
  production: cmdArguments.production,
  environment: {
    YOUTUBE_API_KEY: process.env.MIXTUBE_YOUTUBE_API_KEY
  }
};

const tasks = [
  buildJs(config),
  buildCss(config),
  buildSvg(config),
  buildHtml(config, buildInlineCss(config), buildFavicons(config))
];

if (cmdArguments.serve) {
  tasks.push(serve(config));
}

const build = gulp.series(
  checkJS(config),
  clean(config),
  gulp.parallel(tasks));

const deployGh = gulp.series(
  build,
  pushGhPages(config));

gulp.task('build', build);

gulp.task('deploy:gh', deployGh);