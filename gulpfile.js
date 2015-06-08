'use strict';

var path = require('path'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  merge = require('merge-stream'),
  del = require('del'),
  runSequence = require('run-sequence'),
  buffer = require('vinyl-buffer'),
  source = require('vinyl-source-stream'),
  watchify = require('watchify'),
  browserify = require('browserify'),
  collapse = require('bundle-collapser/plugin'),
  sourcemaps = require('gulp-sourcemaps'),
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  compression = require("compression"),
  jshint = require('gulp-jshint'),
  uglify = require('gulp-uglify'),
  ngAnnotate = require('gulp-ng-annotate'),
  sass = require('gulp-sass'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer-core'),
  csswring = require('csswring'),
  htmlreplace = require('gulp-html-replace'),
  svgSprite = require('gulp-svg-sprite'),
  replace = require('gulp-replace'),
  svg2png = require('gulp-svg2png'),
  favicons = require('gulp-favicons'),
  ghPages = require('gulp-gh-pages'),
  appVersion = require('./package').version,
  appConfig = require('./package').config.application;

function browserifiedSrc(src, baseDir) {
  var b = browserify(src, {cache: {}, packageCache: {}, fullPaths: false, debug: true});
  // convert bundle paths to IDS to save bytes in browserify bundles
  b.plugin(collapse);
  b.on('log', gutil.log);
  return b.bundle()
    .pipe(source(path.relative(baseDir, src)));
}

function watchifiedSrc(src, baseDir, pipelineFn) {
  var b = watchify(browserify(src, {cache: {}, packageCache: {}, fullPaths: true, debug: true}));

  function doBundle() {
    return pipelineFn(
      b.bundle()
        .pipe(source(path.relative(baseDir, src)))
    );
  }

  b.on('log', gutil.log);
  b.on('update', doBundle);

  return doBundle();
}

// do the work on svg assets, just need to be piped out
function doSvg() {
  return gulp.src([
    'node_modules/Ionicons/src/ios-search.svg',
    'node_modules/Ionicons/src/ios-close.svg',
    'node_modules/Ionicons/src/ios-close-empty.svg',
    'node_modules/Ionicons/src/ios-videocam.svg',
    'node_modules/Ionicons/src/load-c.svg',
    'app/images/mt-plus-corner.svg',
    'app/images/mt-play-circle.svg',
    'app/images/mt-pause-circle.svg',
    'app/images/mt-logo.svg'
  ])
    .pipe(svgSprite({
      svg: {
        xmlDeclaration: ' ', //work around until svg-sprites handle false value properly
        doctypeDeclaration: ' '
      },
      // make sure the svgo phase is not breaking the SVG (removeUnknownsAndDefaults breaks the logo)
      transform: [{
        svgo: {
          plugins: [{
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
    }));
}

function buildInlineCss(opts) {
  return new Promise(
    function(resolve, reject) {
      var postCssFilters = [
        autoprefixer({browsers: ['last 1 version']})
      ];
      if (opts && opts.minify) {
        postCssFilters.push(csswring());
      }

      gulp.src('app/styles/css/inline.scss')
        .pipe(sass({
          errLogToConsole: true
        }))
        .pipe(postcss(postCssFilters))
        .pipe(buffer())
        .pipe(gutil.buffer(function(err, cssFiles) {
          if (err) {
            reject(err);
          } else {
            resolve(cssFiles.reduce(function(previous, cssFile) {
              return previous + cssFile.contents.toString() + '\n';
            }, ''));
          }
        }));
    });
}

function doHtml(opts) {
  return gulp.src('app/index.html', {base: 'app'})
    .pipe(htmlreplace({
      cssInline: {
        src: opts.inlineCssCode || '',
        tpl: '<style>%s</style>'
      },
      favicons: opts.faviconsCode || ''
    }));
}

function doFavicons(htmlCodeCb) {
  return gulp.src('app/images/mt-logo.svg')
    .pipe(svg2png())
    .pipe(favicons({
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
    }, htmlCodeCb));
}

gulp.task('jshint', function() {
  return gulp.src('app/scripts/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('svg:dev', function() {
  return doSvg()
    .pipe(gulp.dest('build/images'));
});

gulp.task('css:dev', function() {
  return gulp.src('app/styles/css/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(postcss([
      autoprefixer({browsers: ['last 1 version']})
    ]))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build/styles'))
    .pipe(reload({stream: true}));
});

gulp.task('js:dev', function() {
  function pipelineFn(pipeline) {
    return pipeline
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(ngAnnotate())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build/scripts'));
  }

  // generates the bundle and watches changes
  return merge(
    watchifiedSrc('./app/scripts/app.js', './app/scripts/', pipelineFn),
    watchifiedSrc('./app/scripts/components/capabilities/videoAutoPlayTest.js', './app/scripts/', pipelineFn));
});

gulp.task('clean:dev', function() {
  del('build');
});

gulp.task('serve', ['clean:dev', 'jshint'], function(done) {
  runSequence(['css:dev', 'js:dev', 'svg:dev'], function() {
    gulp.watch('app/scripts/**/*.js', ['jshint']);
    gulp.watch('app/images/*.svg', ['svg:dev']);
    gulp.watch('app/styles/**/*.scss', ['css:dev']);

    browserSync({
      open: false,
      notify: false,
      server: ['build', 'app'],
      https: true,
      ghostMode: false
    });

    done();
  });
});

gulp.task('svg:dist', function() {
  return doSvg()
    .pipe(gulp.dest('dist/images'));
});

gulp.task('css:dist', function() {
  return gulp.src('app/styles/css/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(postcss([
      autoprefixer({browsers: ['last 1 version']}),
      csswring
    ]))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('js:dist', function() {
  return merge(
    browserifiedSrc('./app/scripts/app.js', './app/scripts/'),
    browserifiedSrc('./app/scripts/components/capabilities/videoAutoPlayTest.js', './app/scripts/'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('html:dist', function() {
  var doHtmlStream = gutil.noop(),
    doFaviconsStream = gutil.noop();

  Promise.all([
    buildInlineCss({minify: true}),
    new Promise(function(resolve) {
      doFavicons(function(htmlCode) {
        resolve(htmlCode);
      })
        .pipe(gulp.dest('dist'))
        .pipe(doFaviconsStream);
    })])
    .then(function(codes) {
      doHtml({inlineCssCode: codes[0], faviconsCode: codes[1]})
        .pipe(gulp.dest('dist'))
        .pipe(doHtmlStream);
    });

  return merge(doHtmlStream, doFaviconsStream);
});

gulp.task('clean:dist', function() {
  del('dist');
});

gulp.task('dist', ['clean:dist', 'jshint'], function(done) {
  runSequence(['js:dist', 'css:dist', 'html:dist', 'svg:dist'], done);
});

gulp.task('serve:dist', ['dist'], function() {
  browserSync({
    open: false,
    notify: false,
    server: {
      baseDir: 'dist',
      middleware: compression()
    },
    https: true,
    ghostMode: false
  });
});

gulp.task('dist:gh', ['dist'], function() {
  return gulp.src('dist/index.html')
    .pipe(replace('<base href="/">', '<base href="/mixtube/">'))
    .pipe(gulp.dest('dist'));
});

gulp.task('deploy:gh', ['dist:gh'], function() {
  return gulp.src('dist/**/*')
    .pipe(ghPages());
});