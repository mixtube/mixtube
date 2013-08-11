(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtKeyboardShortcutManager', function ($rootScope) {
        /** @type {Object.<string, {combo: string|RegExp, callback: function}>} */
        var contexts = {};
        /** @type {Array.<string>} */
        var contextStack = [];

        var bindContext = function (name) {
            if (contexts.hasOwnProperty(name)) {
                angular.forEach(contexts[name], function (binding) {
                    var bindFn = Mousetrap[!_.isRegExp(binding.combo) ? 'bind' : 'bindRegExp'];
                    bindFn(binding.combo, function (evt, combo) {
                        $rootScope.$apply(function () {
                            binding.callback(evt, combo);
                        });
                    });
                });
            }
        };

        var unbindContext = function (name) {
            if (contexts.hasOwnProperty(name)) {
                angular.forEach(contexts[name], function (binding) {
                    var unbindFn = Mousetrap[!_.isRegExp(binding.combo) ? 'unbind' : 'unbindRegExp'];
                    unbindFn(binding.combo);
                });
            }
        };

        return {
            /**
             * Registers a shortcut for the in the given context.
             *
             * @param {string} context the context name
             * @param {string|RegExp} combo
             * @param {function} callback
             */
            register: function (context, combo, callback) {
                var bindings = contexts[context] = contexts.hasOwnProperty(context) ? contexts[context] : [];
                bindings.push({combo: combo, callback: callback});
            },
            /**
             * Unbinds the previous context shortcuts and binds the new ones.
             *
             * @param {string} name the context name
             */
            enterContext: function (name) {
                if (contextStack.length > 0) {
                    unbindContext(contextStack[contextStack.length - 1]);
                }

                contextStack.push(name);
                bindContext(name);
            },
            /**
             * Unbind the current context and restore the previous one.
             *
             * Calls to enter / leave should be balanced.
             *
             * @param {string} name context name
             */
            leaveContext: function (name) {
                var popped = contextStack.pop();
                if (name !== popped) throw new Error('Can not pop context ' + name + ' probably because of unbalanced enter / leave calls , found ' + popped);

                unbindContext(name);
                if (contextStack.length > 0) {
                    bindContext(contextStack[contextStack.length - 1]);
                }
            }
        };
    });
})(mt);