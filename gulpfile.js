'use strict';

var path = require('path'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  buffer = require('vinyl-buffer'),
  source = require('vinyl-source-stream'),
  watchify = require('watchify'),
  browserify = require('browserify'),
  sourcemaps = require('gulp-sourcemaps'),
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  jshint = require('gulp-jshint'),
  uglify = require('gulp-uglify'),
  ngAnnotate = require('gulp-ng-annotate'),
  sass = require('gulp-sass'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer-core'),
  csswring = require('csswring'),
  svgSprite = require('gulp-svg-sprite'),
  replace = require('gulp-replace'),
  ghPages = require('gulp-gh-pages');

function browserifiedSrc(src) {
  var b = browserify(src);
  b.on('log', gutil.log);
  return b.bundle()
    .pipe(source(path.basename(src)))
    .pipe(buffer());
}

function watchifiedSrc(src, pipelineFn) {
  var b = watchify(browserify(src, {cache: {}, packageCache: {}, fullPaths: true, debug: true}));

  function doBundle() {
    return pipelineFn(
      b.bundle()
        .pipe(source(path.basename(src)))
        .pipe(buffer())
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
    'app/images/mt-plus-corner.svg',
    'app/images/mt-play-circle.svg',
    'app/images/mt-pause-circle.svg'
  ])
    .pipe(svgSprite({
      dest: 'build/images',
      svg: {
        dest: '.',
        xmlDeclaration: false,
        doctypeDeclaration: false
      },
      mode: {
        symbol: {
          dest: '.',
          sprite: 'sprite.svg'
        }
      }
    }));
}

gulp.task('jshint', function() {
  return gulp.src('app/scripts/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('svg:dev', function() {
  doSvg()
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
  // generates the bundle and watches changes
  return watchifiedSrc('./app/scripts/app.js', function(pipeline) {
    return pipeline
      .pipe(sourcemaps.init({loadMaps: true}))
      .pipe(ngAnnotate())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build/scripts'));
  });
});

gulp.task('serve', ['jshint', 'css:dev', 'js:dev', 'svg:dev'], function() {

  gulp.watch('app/scripts/**/*.js', ['jshint']);
  gulp.watch('app/styles/**/*.scss', ['css:dev']);

  browserSync({
    open: false,
    notify: false,
    server: ['build', 'app'],
    https: true
  });
});

gulp.task('copy:dist', function() {
  return gulp.src('app/index.html', {base: 'app'})
    .pipe(gulp.dest('dist'));
});

gulp.task('svg:dist', function() {
  doSvg()
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
  return browserifiedSrc('./app/scripts/app.js')
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('dist', ['js:dist', 'css:dist', 'copy:dist', 'svg:dist']);

gulp.task('serve:dist', ['dist'], function() {
  browserSync({
    open: false,
    notify: false,
    server: 'dist',
    https: true
  });
});

gulp.task('dist:gh', ['js:dist', 'css:dist', 'copy:dist', 'svg:dist'], function() {
  return gulp.src('dist/index.html')
    .pipe(replace('<base href="/">', '<base href="/mixtube/">'))
    .pipe(gulp.dest('dist'));
});

gulp.task('deploy:gh', ['dist:gh'], function() {
  return gulp.src('dist/**/*')
    .pipe(ghPages());
});