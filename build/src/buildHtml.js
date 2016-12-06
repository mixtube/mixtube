'use strict';

const gulp = require('gulp'),
  gutil = require('gulp-util'),
  htmlReplace = require('gulp-html-replace'),
  template = require('gulp-template'),
  eos = require('end-of-stream'),
  Observable = require('rx').Observable,
  Subject = require('rx').Subject;

/**
 *
 * @param {{appDirPath: string, publicDirPath: string, htmlBaseUrl: string, injectHeadPath: string, watch: boolean, production: boolean}} config
 * @param {function} buildInlineCssFactory
 * @returns {function}
 */
module.exports = function makeBuildHtml(config, buildInlineCssFactory) {

  const htmlSource = `${config.appDirPath}/src/index.html`;

  return function buildHtml() {

    // completion stream is only required when "runHtmlPipeline" is executed directly by gulp
    let completionStream;

    // just serves as a "trigger" when the html file changes
    const htmlSbjct = new Subject();

    const combinedObs = [htmlSbjct];
    if (config.production) {
      combinedObs.push(buildInlineCssFactory());
    }

    // for anything happening in either inline css or html source we recompute the html output
    Observable
      .combineLatest(combinedObs)
      .subscribe(([empty, inlineCss]) => generateHtml(inlineCss, completionStream));

    if (config.watch) {
      gulp.watch(htmlSource, runHtmlPipeline);
    }

    return runHtmlPipeline();

    function runHtmlPipeline() {
      // set the completionStream only in the case where the pipeline is called directly since gulp will wait for sign of completion
      completionStream = gutil.noop();
      // clear the completionStream once done to avoid reusing it when generateHtml is called because of an upstream change
      eos(completionStream, () => completionStream = null);

      htmlSbjct.onNext();
      return completionStream;
    }
  };

  function generateHtml(inlineCss, stream) {
    let htmlStream = gulp.src(htmlSource)
      .pipe(template({
        baseUrl: config.htmlBaseUrl,
        appVersion: config.appVersion
      }));

    const htmlReplaceOptions = {};

    if (typeof config.injectHeadPath !== 'undefined') {
      htmlReplaceOptions.headInject = gulp.src(config.injectHeadPath);
    }

    if (typeof inlineCss !== 'undefined') {
      htmlReplaceOptions.cssInline = {
        src: inlineCss,
        tpl: '<style>%s</style>'
      };
    }

    htmlStream = htmlStream
      .pipe(htmlReplace(htmlReplaceOptions))
      .pipe(gulp.dest(config.publicDirPath));

    if (stream) {
      htmlStream.pipe(stream);
    }
  }
};

