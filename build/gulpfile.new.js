'use strict';

const path = require('path'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  plumber = require('gulp-plumber'),
  merge = require('merge-stream'),
  multistream = require('multistream'),
  del = require('del'),
  buffer = require('vinyl-buffer'),
  source = require('vinyl-source-stream'),
  watchify = require('watchify'),
  browserify = require('browserify'),
  envify = require('envify/custom'),
  collapse = require('bundle-collapser/plugin'),
  sourcemaps = require('gulp-sourcemaps'),
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  compression = require("compression"),
  jshint = require('gulp-jshint'),
  uglify = require('gulp-uglify'),
  ngAnnotate = require('gulp-ng-annotate'),
  sass = require('gulp-sass'),
  bourbon = require('node-bourbon'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer'),
  csswring = require('csswring'),
  htmlreplace = require('gulp-html-replace'),
  svgSprite = require('gulp-svg-sprite'),
  svg2png = require('gulp-svg2png'),
  favicons = require('favicons').stream,
  template = require('gulp-template'),
  ghPages = require('gulp-gh-pages'),
  minimist = require('minimist'),
  Observable = require('rx').Observable,
  appVersion = require('./package').version,
  appConfig = require('./package').config.application;

const cmdArguments = minimist(process.argv.slice(2), {
  boolean: ['production', 'watch']
});

const noop = () => {
};

const appDirPath = '../app';
const publicDirPath = 'public';
const htmlBaseUrl = '/';
const svgSpriteConf = {
  svg: {
    xmlDeclaration: false,
    doctypeDeclaration: false
  },
  // make sure the svgo phase is not breaking the SVG (removeUnknownsAndDefaults breaks the logo)
  transform: [{
    svgo: {
      js2svg: {
        pretty: !cmdArguments.production
      },
      plugins: [{
        removeStyleElement: true,
        removeUnknownsAndDefaults: false
      }]
    }
  }],
  mode: {
    symbol: {
      dest: '.',
      sprite: 'sprite.svg'
    }
  }
};
const faviconsConf = {
  settings: {
    appName: appConfig.name,
    vinylMode: true,
    version: 1,
    background: appConfig.color
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
      param_value: appVersion
    }
  }
};

const cssPostproConf = [autoprefixer({browsers: ['last 1 version']})];
if (cmdArguments.production) {
  cssPostproConf.push(csswring);
}

gulp.task('build', gulp.parallel(checkJs, buildJs, buildCss, buildSvg, buildHtml));

gulp.task('html', buildHtml);

function buildCss() {
  if (cmdArguments.watch) {
    gulp.watch(`${appDirPath}/src/styles/**/*.scss`, runCssPipeline);
  }

  return runCssPipeline();

  function runCssPipeline() {
    return gulp.src(`${appDirPath}/src/styles/css/main.scss`)
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(sass({includePaths: bourbon.includePaths}))
      .pipe(postcss(cssPostproConf))
      .pipe(sourcemaps.write(cmdArguments.production ? './' : undefined))
      .pipe(gulp.dest(publicDirPath));
  }
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{configureBundle: function, pipelineFn: function, watch: boolean}} options
 * @returns {Stream.Readable}
 */
function runBrowserify(inputPath, outputPath, options) {
  const envifyTransform = envify({
    YOUTUBE_API_KEY: process.env.MIXTUBE_YOUTUBE_API_KEY
  });

  let bundle = browserify(inputPath, {cache: {}, packageCache: {}, fullPaths: true, debug: true});

  if (options.watch) {
    bundle = watchify(bundle);
    bundle.on('update', doBundle);
  }

  bundle.transform(envifyTransform);
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

function buildJs() {
  const runBrowserifyOptions = {
    configureBundle: noop,
    pipelineFn: noop,
    watch: cmdArguments.watch
  };

  if (cmdArguments.production) {
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
        .pipe(gulp.dest(publicDirPath));
    }
  } else {
    runBrowserifyOptions.pipelineFn = function devPipelineFn(pipeline) {
      return pipeline
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(ngAnnotate())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(publicDirPath));
    }
  }

  return merge(
    runBrowserify(`${appDirPath}/src/scripts/main.js`, 'main.js', runBrowserifyOptions),
    runBrowserify(`${appDirPath}/src/scripts/components/capabilities/videoCallPlayTest.js`,
      'components/capabilities/videoCallPlayTest.js', runBrowserifyOptions)
  );
}

function checkJs() {
  const checkedGlobPath = `${appDirPath}/src/scripts/**/*.js`;

  if (cmdArguments.watch) {
    gulp.watch(checkedGlobPath, runCheckJsPipeline);
  }

  return runCheckJsPipeline();

  function runCheckJsPipeline() {
    return gulp.src(checkedGlobPath)
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'));
  }
}

function buildHtml(doneBuildHtml) {
  const inlineCssSource = `${appDirPath}/src/styles/css/inline.scss`;
  const faviconSource = `${appDirPath}/src/images/mt-logo.svg`;
  const htmlSource = `${appDirPath}/src/index.html`;

  const combinedObs = [];

  const htmlObs = Observable.create(observer => {
    if (cmdArguments.watch) {
      gulp.watch(htmlSource, () => observer.onNext());
    }

    observer.onNext();
  });

  combinedObs.push(htmlObs);

  if (cmdArguments.production) {
    const inlineCssObs = Observable.create(observer => {
      if (cmdArguments.watch) {
        gulp.watch(inlineCssSource, runInlineCssPipeline);
      }

      runInlineCssPipeline();

      function runInlineCssPipeline() {
        return gulp.src(inlineCssSource)
          .pipe(plumber())
          .pipe(sass({includePaths: bourbon.includePaths}))
          .pipe(postcss(cssPostproConf))
          .pipe(gutil.buffer(function(err, files) {
            observer.onNext(files.map(file => {
              return file.contents.toString();
            }).join(''));
          }));
      }
    });

    const faviconsObs = Observable.create(observer => {
      if (cmdArguments.watch) {
        gulp.watch(faviconSource, runFaviconsPipeline);
      }

      runFaviconsPipeline();

      function runFaviconsPipeline() {
        let faviconsOperator = null;

        const htmlCodePromise = new Promise(resolve => {
          faviconsOperator = favicons(faviconsConf, resolve);
        });

        const faviconsStream =
          gulp.src(faviconSource)
            .pipe(svg2png())
            .pipe(faviconsOperator)
            .pipe(gulp.dest(publicDirPath));

        const faviconsPromise = new Promise((resolve, reject) => {
          faviconsStream.on('end', resolve).on('error', reject);
        });

        Promise.all([htmlCodePromise, faviconsPromise])
          .then(values => {
            observer.onNext(values[0]);
          });
      }
    });

    combinedObs.push(inlineCssObs, faviconsObs);
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
}

function buildSvg() {
  const svgPaths = [
    `${appDirPath}/node_modules/Ionicons/src/ios-search.svg`,
    `${appDirPath}/node_modules/Ionicons/src/ios-close.svg`,
    `${appDirPath}/node_modules/Ionicons/src/ios-close-empty.svg`,
    `${appDirPath}/node_modules/Ionicons/src/ios-videocam.svg`,
    `${appDirPath}/node_modules/Ionicons/src/load-c.svg`,
    `${appDirPath}/src/images/mt-play-circle.svg`,
    `${appDirPath}/src/images/mt-pause-circle.svg`,
    `${appDirPath}/src/images/mt-logo.svg`
  ];

  if (cmdArguments.watch) {
    gulp.watch(svgPaths, runSvgPipeline);
  }

  return runSvgPipeline();

  function runSvgPipeline() {
    return gulp.src(svgPaths)
      .pipe(svgSprite(svgSpriteConf))
      .pipe(gulp.dest(publicDirPath));
  }
}
