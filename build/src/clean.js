'use strict';

const del = require('del');

/**
 * @param {{publicDirPath: string}} config
 * @returns {function}
 */
module.exports = function makeClean(config) {
  return function clean() {
    return del(config.publicDirPath);
  };
};