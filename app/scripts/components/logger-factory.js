(function(mt) {
  'use strict';

  mt.MixTubeApp.factory('mtLoggerFactory', function($log) {

    /** @type {Object.<string, Object>} */
    var loggerByName = {};

    /**
     * Returns a logger for the given name or the global logger if no name provided.
     *
     * @param {string=} name the logger name. Empty means global logger.
     */
    function logger(name) {
      var loggerName = angular.isDefined(name) ? name : 'global';
      if (!loggerByName.hasOwnProperty(loggerName)) {
        var decoratedLogger = {};
        _.functions($log).forEach(function(fnName) {
          decoratedLogger[fnName] = function() {
            arguments[0] =
              '[' + mt.commons.buildTimeString(new Date()) + ']' + ' '
              + loggerName + ': ' + arguments[0];
            $log[fnName].apply(null, arguments);
          };
        });
        loggerByName[loggerName] = decoratedLogger;
      }
      return loggerByName[loggerName];
    }

    // backward dependency
    logger.logger = logger;

    return logger;
  });
})(mt);