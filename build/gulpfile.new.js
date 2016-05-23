'use strict';

const gulp = require('gulp'),
  minimist = require('minimist'),
  checkJS = require('./src/checkJs'),
  buildJs = require('./src/buildJs'),
  buildCss = require('./src/buildCss'),
  buildSvg = require('./src/buildSvg'),
  buildHtml = require('./src/buildHtml'),
  buildInlineCss = require('./src/buildInlineCss'),
  buildFavicons = require('./src/buildFavicons'),
  serve = require('./src/serve'),
  appVersion = require('./package').version,
  appConfig = require('./package').config.application;

const cmdArguments = minimist(process.argv.slice(2), {
  boolean: ['production', 'watch', 'serve'],
  string: ['baseUrl']
});

const config = {
  appDirPath: '../app',
  publicDirPath: 'public',
  htmlBaseUrl: cmdArguments.baseUrl || '/',
  appName: appConfig.name,
  appColor: appConfig.color,
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

gulp.task('build',
  gulp.series(
    checkJS(config),
    gulp.parallel(tasks)));
