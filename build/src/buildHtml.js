'use strict';

const buildInlineCss = require('./buildInlineCss'),
  buildFavicons = require('./buildFavicons');


module.exports = function makeBuildHtml(config) {

  const htmlSource = `${config.appDirPath}/src/index.html`;

  return function buildHtml(doneBuildHtml) {

    const combinedObs = [];

    const htmlObs = Observable.create(observer => {
      if (config.watch) {
        gulp.watch(htmlSource, () => observer.onNext());
      }

      observer.onNext();
    });

    combinedObs.push(htmlObs);

    if (config.production) {
      combinedObs.push(buildInlineCss(config)(), buildFavicons(config)());
    }

    Observable.combineLatest(combinedObs).subscribe(values => {
      let htmlStream = gulp.src(htmlSource)
        .pipe(template({
          baseUrl: htmlBaseUrl
        }));

      if (values.length > 1) {
        htmlStream = htmlStream
          .pipe(htmlreplace({
            cssInline: {
              src: values[1],
              tpl: '<style>%s</style>'
            },
            favicons: values[2]
          }));
      }

      htmlStream
        .pipe(gulp.dest(publicDirPath))
        .on('end', doneBuildHtml)
        .on('error', doneBuildHtml);
    });
  };
};
