'use strict';

const browserSync = require('browser-sync'),
  compression = require('compression');

/**
 * @param {{publicDirPath: string, htmlBaseUrl: string, watch: boolean, production: boolean}} config
 * @returns {function}
 */
module.exports = function makeServe(config) {

  return function serve(done) {

    const server = browserSync.create();
    server.init({
      server: config.publicDirPath,
      https: true,
      ghostMode: false,
      open: false,
      notify: false,
      middleware: compression()
    }, done);
  };
};
