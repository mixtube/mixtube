'use strict';

const buffer = require('gulp-util').buffer;

/**
 * A gulp sink that concatenates files contents and calls the given callback with the resulting string.
 *
 * @param {function(Error=, string=)} cb
 * @returns {Stream.Writable}
 */
module.exports = function gulpConcatDest(cb) {
  return buffer((err, files) => {
    if (err) {
      cb(err);
    } else {
      cb(undefined, files.map(file => file.contents.toString()).join(''));
    }
  })
};
