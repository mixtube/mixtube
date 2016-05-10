'use strict';

const gulp = require('gulp'),
  htmlReplace = require('gulp-html-replace'),
  template = require('gulp-template'),
  Observable = require('rx').Observable;

/**
 *
 * @param {{appDirPath: string, publicDirPath: string, htmlBaseUrl: string, watch: boolean, production: boolean}} config
 * @param {function} buildInlineCssFactory
 * @param {function} buildFaviconsFactory
 * @returns {function}
 */
module.exports = function makeBuildHtml(config, buildInlineCssFactory, buildFaviconsFactory) {

  const htmlSource = `${config.appDirPath}/src/index.html`;

  return function buildHtml(doneBuildHtml) {

    const combinedObs = [];

    if (config.production) {
      combinedObs.push(buildInlineCssFactory(), buildFaviconsFactory());
    }

    // just serves as a "trigger" when the html file changes
    combinedObs.push(
      Observable
        .create(observer => {
          if (config.watch) {
            gulp.watch(htmlSource, () => observer.onNext());
          }

          observer.onNext();
        }));

    Observable
      .combineLatest(combinedObs)
      .subscribe(([inlineCss, faviconsMetas]) => {
        let htmlStream = gulp.src(htmlSource)
          .pipe(template({
            baseUrl: config.htmlBaseUrl
          }));

        if (typeof inlineCss !== 'undefined' && typeof faviconsMetas !== 'undefined') {
          htmlStream = htmlStream
            .pipe(htmlReplace({
              cssInline: {
                src: inlineCss,
                tpl: '<style>%s</style>'
              },
              favicons: faviconsMetas
            }));
        }

        htmlStream
          .pipe(gulp.dest(config.publicDirPath))
          // this will work only for the first call but we are fine with that
          .on('end', doneBuildHtml)
          .on('error', doneBuildHtml);
      });
  };
};
