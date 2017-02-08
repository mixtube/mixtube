'use strict';

const browserSync = require('browser-sync'),
  compression = require('compression');

/**
 * @param {{publicDirPath: string, htmlBaseUrl: string}} config
 * @returns {function}
 */
module.exports = function makeServe(config) {

  return function serve(done) {

    const server = browserSync.create();
    server.init({
      server: {
        // this empty array is needed for "routes" to work
        baseDir: [],
        routes: {
          [config.htmlBaseUrl]: config.publicDirPath
        }
      },

      // watch changes and inject
      files: [`${config.publicDirPath}/*.css`],

      https: true,
      ghostMode: false,
      open: false,
      notify: false,
      middleware: compression()
    }, done);
  };
};
