'use strict';

var buildTimeString = require('../commons').buildTimeString,
  functions = require('lodash/object/functions'),
  isUndefined = require('lodash/lang/isUndefined'),
  has = require('lodash/object/has');

function loggerFactoryFactory($log) {

  /** @type {Object.<string, Object>} */
  var loggerByName = {};

  /**
   * Returns a logger for the given name or the global logger if no name provided.
   *
   * @name LoggerFactory
   * @param {string=} name the logger name. Empty means global logger.
   */
  function LoggerFactory(name) {
    var loggerName = isUndefined(name) ? 'global' : name;
    if (!has(loggerByName, loggerName)) {
      var decoratedLogger = {};
      functions($log).forEach(function(fnName) {
        decoratedLogger[fnName] = function() {
          arguments[0] = '[' + buildTimeString(new Date()) + ']' + ' ' + loggerName + ': ' + arguments[0];
          $log[fnName].apply(null, arguments);
        };
      });
      loggerByName[loggerName] = decoratedLogger;
    }
    return loggerByName[loggerName];
  }

  return LoggerFactory;
}

module.exports = loggerFactoryFactory;