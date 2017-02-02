'use strict';

const gulp = require('gulp'),
  sass = require('gulp-sass'),
  bourbon = require('node-bourbon'),
  replace = require('gulp-replace-task'),
  concatDest = require('./gulpConcatDest');

/**
 * A wrapper for gulp sass that allows to define sass variables values at build time.
 *
 * @param {string} appDirPath the root directory of the app
 * @param {object<string>} variables a record of sass variables name with their values
 * @returns {Stream.Transform}
 */
module.exports = function gulpMixtubeSass({ appDirPath, variables }) {
  const variablesScssPromise = buildVariablesScss(appDirPath, variables);

  return sass({
    includePaths: bourbon.includePaths,
    // intercepts variables.scss import to inject variables values
    importer(url, prev, done) {
      if (url !== 'variables') {
        // returning null means leave it to the default importer
        return null;
      }

      variablesScssPromise.then(scss => done({ contents: scss }));
    }
  });

  /**
   * Pre-processes the scss file containing the variables to replace the static values with the one given here.
   *
   * @param {string} appDirPath
   * @param {object<string>} variables
   * @returns {Promise<string>} the processed content of the scss file
   */
  function buildVariablesScss(appDirPath, variables) {

    const replaceConf = {
      patterns: Object.keys(variables).map(varName => {
        return {
          match: new RegExp(`\\$${varName}:.*;`, 'g'),
          replacement: `$${varName}: ${variables[varName]};`
        }
      })
    };

    return new Promise((resolve, reject) => {
      gulp.src(`${appDirPath}/src/styles/css/_variables.scss`)
        .pipe(replace(replaceConf))
        .pipe(concatDest((err, content) => err ? reject(err) : resolve(content)));
    });
  }
};
