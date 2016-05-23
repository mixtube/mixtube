'use strict';

const gulp = require('gulp'),
  svg2png = require('gulp-svg2png'),
  favicons = require('favicons').stream,
  eos = require('end-of-stream'),
  ReplaySubject = require('rx').ReplaySubject;

/**
 * @param {{appDirPath: string, publicDirPath: string, watch: boolean, appName: string, appColor: string, appVersion:string}} config
 * @returns {function}
 */
module.exports = function makeBuildFavicons(config) {

  const faviconsConf = {
    appName: config.appName,
    version: config.appVersion,
    background: config.appColor,
    path: './',
    icons: {
      android: true,
      appleIcon: true,
      appleStartup: false,
      coast: false,
      favicons: true,
      firefox: false,
      opengraph: false,
      windows: false,
      yandex: false
    }
  };

  const faviconSource = `${config.appDirPath}/src/images/mt-logo.svg`;

  /**
   * @returns {Rx.Observable<string>} a replayable observable returning the favicons html metas
   */
  return function buildFavicons() {

    const subject = new ReplaySubject(1);

    if (config.watch) {
      gulp.watch(faviconSource, runFaviconsPipeline);
    }

    runFaviconsPipeline();

    return subject;

    function runFaviconsPipeline() {

      const faviconsStream =
        gulp.src(faviconSource)
          .pipe(svg2png())
          .pipe(favicons(faviconsConf, htmlString => {
            faviconsPromise.then(() => subject.onNext(htmlString))
          }))
          .pipe(gulp.dest(config.publicDirPath));

      const faviconsPromise = streamToPromise(faviconsStream);

      // wait for the images and the html string to be generated to signal completion
      return faviconsPromise;
    }
  };
};

function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    eos(stream, error => error ? reject(error) : resolve());
  });
}