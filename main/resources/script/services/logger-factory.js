(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtLoggerFactory', function ($log) {

        /**
         * @const
         * @type {RegExp}
         */
        var TOKEN_REGEXP = /%s|%d/g;

        /** @type {Object.<string, Logger>} */
        var loggerByName = {};

        var Logger = {
            init: function (name) {
                this.name = name;
            },
            log: function () {
                this.delegate($log.log, arguments);
            },
            debug: function () {
                this.delegate($log.debug, arguments);
            },
            delegate: function (targetFn, origArgs) {

                var origPattern = _.first(origArgs);
                var origParams = _.rest(origArgs);

                // prepend extra info to the original pattern (time and logger name)
                var pattern = '[%s:%s:%s] %s : ' + origPattern;

                // prepend time original params
                var now = new Date();
                var extraParams = [now.getHours(), now.getMinutes(), now.getSeconds()].map(function (timePart) {
                    return mt.tools.leftPad(timePart.toString(10), 2, '0');
                });

                // prepend logger name
                extraParams.push(this.name);

                // concatenate everything
                var params = extraParams.concat(origParams);

                var idxParams = 0;
                var formatted = pattern.replace(TOKEN_REGEXP, function () {
                    var param = params[idxParams++];
                    if (param instanceof Error) {
                        return param.hasOwnProperty('stack') ? param.stack : param.name;
                    } else if (angular.isObject(param)) {
                        return JSON.stringify(param);
                    } else {
                        return param;
                    }
                });

                // extra empty string is to make AngularJS's IE9 log polyfill happy, else it appends "undefined" to the log trace
                targetFn.apply(console, [formatted, '']);
            }
        };

        return {
            /**
             * Returns a logger fir the given name or the global logger if no name provided.
             *
             * @param {string=} name the logger name. Empty means global logger.
             */
            logger: function (name) {
                var loggerName = angular.isDefined(name) ? name : 'global';
                if (!loggerByName.hasOwnProperty(loggerName)) {
                    var newLogger = Object.create(Logger);
                    newLogger.init(loggerName);
                    loggerByName[loggerName] = newLogger;
                }
                return loggerByName[loggerName];
            }
        };
    });
})(mt);