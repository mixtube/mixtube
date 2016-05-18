'use strict';

const gulp = require('gulp'),
  svg2png = require('gulp-svg2png'),
  favicons = require('favicons').stream,
  ReplaySubject = require('rx').ReplaySubject;

/**
 * @param {{appDirPath: string, publicDirPath: string, watch: boolean, appName: string, appColor: string, appVersion:string}} config
 * @returns {function}
 */
module.exports = function makeBuildFavicons(config) {

  const faviconsConf = {
    settings: {
      appName: config.appName,
      vinylMode: true,
      version: 1,
      background: config.appColor
    },
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
    },
    files: {
      iconsPath: './'
    },
    favicon_generation: {
      versioning: {
        param_name: 'v',
        param_value: config.appVersion
      }
    }
  };

  const faviconSource = `${config.appDirPath}/src/images/mt-logo.svg`;

  return function buildFavicons() {

    const subject = new ReplaySubject(1);
    subject.onNext('toto')

    if (config.watch) {
      // gulp.watch(faviconSource, runFaviconsPipeline);
    }

    // runFaviconsPipeline();

    return subject;

    function runFaviconsPipeline() {

      const faviconsStream =
        gulp.src(faviconSource)
          .pipe(svg2png())
          .pipe(favicons(faviconsConf, htmlString => {
            faviconsPromise.then(() => {
              subject.onNext(htmlString);
            })
          }))
          .pipe(gulp.dest(config.publicDirPath));

      const faviconsPromise = new Promise((resolve, reject) => {
        faviconsStream.on('end', resolve).on('error', reject);
      });
    }
  };
};
