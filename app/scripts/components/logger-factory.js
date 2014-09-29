(function(buildTimeString) {
  'use strict';

  function LoggerFactoryFactory($log) {

    /** @type {Object.<string, Object>} */
    var loggerByName = {};

    /**
     * Returns a logger for the given name or the global logger if no name provided.
     *
     * @name LoggerFactory
     * @param {string=} name the logger name. Empty means global logger.
     */
    function LoggerFactory(name) {
      var loggerName = angular.isDefined(name) ? name : 'global';
      if (!loggerByName.hasOwnProperty(loggerName)) {
        var decoratedLogger = {};
        _.functions($log).forEach(function(fnName) {
          decoratedLogger[fnName] = function() {
            arguments[0] = '[' + buildTimeString(new Date()) + ']' + ' ' + loggerName + ': ' + arguments[0];
            $log[fnName].apply(null, arguments);
          };
        });
        loggerByName[loggerName] = decoratedLogger;
      }
      return loggerByName[loggerName];
    }

    // backward dependency
    LoggerFactory.logger = LoggerFactory;

    return LoggerFactory;
  }

  angular.module('Mixtube').factory('LoggerFactory', LoggerFactoryFactory);

})(mt.commons.buildTimeString);