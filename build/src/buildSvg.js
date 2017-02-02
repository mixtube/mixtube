'use strict';

const gulp = require('gulp'),
  svgSprite = require('gulp-svg-sprite'),
  path = require('path');

/**
 * @param {{appDirPath: string, publicDirPath: string, svgLogoPath: string, watch: boolean, production: boolean}} config
 * @returns {function}
 */
module.exports = function makeBuildSvg(config) {

  const resolvedLogoPath = path.resolve(config.svgLogoPath);
  const svgSpriteConf = {
    svg: {
      xmlDeclaration: false,
      doctypeDeclaration: false
    },
    shape: {
      id: {
        // always set the id of the provided logo to "m-logo"
        generator(name, vinyl) {
          return vinyl.path === resolvedLogoPath ? 'm-logo' : vinyl.stem;
        }
      }
    },
    // make sure the svgo phase is not breaking the SVG (removeUnknownsAndDefaults breaks the logo)
    transform: [{
      svgo: {
        js2svg: {
          pretty: !config.production
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

  const svgPaths = [
    'node_modules/Ionicons/src/ios-search.svg',
    'node_modules/Ionicons/src/ios-close.svg',
    'node_modules/Ionicons/src/ios-close-empty.svg',
    'node_modules/Ionicons/src/ios-videocam.svg',
    'node_modules/Ionicons/src/load-c.svg',
    'src/images/mt-play-circle.svg',
    'src/images/mt-pause-circle.svg'
  ].map(path => `${config.appDirPath}/${path}`);
  svgPaths.push(config.svgLogoPath);

  return function buildSvg() {

    if (config.watch) {
      gulp.watch(svgPaths, runSvgPipeline);
    }

    return runSvgPipeline();

    function runSvgPipeline() {
      return gulp.src(svgPaths)
        .pipe(svgSprite(svgSpriteConf))
        .pipe(gulp.dest(config.publicDirPath));
    }
  };
};
