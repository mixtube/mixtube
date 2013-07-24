/**
 * Adds a bindRegExp method to Mousetrap that allows bind specific keyboard shortcuts that will tested on the given
 * RegExp. If a RegExp binding match a key, the chain is stopped so that no other (string based) binding callback will
 * be executed.
 *
 * It listen for only keypress event because RegExp works only with characters and keypress is the only one reliable to get
 * character code.
 *
 * Needs v 1.4 of Mousetrap at least.
 */
(function (Mousetrap) {
    var savedHandleKeyFn = Mousetrap.handleKey;
    var bindingByKey = {};

    Mousetrap.handleKey = function (character, modifiers, evt) {
        var matched = false;

        // only keypress makes sense because we want to catch character and keypress is the only one reliable for that
        // only single character makes sense (we also filter out Mousetrap special characters like "space")
        if (character.length === 1 && evt.type === 'keypress') {
            for (var key in bindingByKey) {
                var bindings = bindingByKey[key];
                for (var idxBindings = 0; idxBindings < bindings.length; idxBindings++) {
                    var binding = bindings[idxBindings];
                    if (binding.regExp.test(character)) {
                        matched = true;
                        executeCallback(binding.callback, evt, binding.regExp);
                    }
                }
            }
        }

        if (!matched) {
            savedHandleKeyFn(character, modifiers, evt);
        }
    };

    function executeCallback(callback, evt, combo) {
        // may be we have to stop
        if (Mousetrap.stopCallback(evt, evt.target || evt.srcElement)) {
            return;
        }

        if (callback(evt, combo) === false) {
            if (evt.preventDefault) {
                evt.preventDefault();
            }

            if (evt.stopPropagation) {
                evt.stopPropagation();
            }
        }
    }

    /**
     * @param {Array.<RegExp>} regExps
     * @param {Function} callback
     */
    function bind(regExps, callback) {
        for (var idx = 0; idx < regExps.length; idx++) {
            var regExp = regExps[idx];
            // unique binding by regExp
            var key = regExp.toString();
            bindingByKey[key] = bindingByKey[key] || [];
            bindingByKey[key].push({
                regExp: regExps[idx],
                callback: callback
            });
        }
    }

    /**
     * @param {Array.<RegExp>} regExps
     */
    function unbind(regExps) {
        for (var idx = 0; idx < regExps.length; idx++) {
            var regExp = regExps[idx];
            delete bindingByKey[regExp.toString()];
        }
    }

    /**
     * @param {RegExp|Array.<RegExp>} regExp
     * @param {Function} callback
     */
    Mousetrap.bindRegExp = function (regExp, callback) {
        bind(regExp instanceof Array ? regExp : [regExp], callback);
    };

    Mousetrap.unbindRegExp = function (regExp) {
        unbind(regExp instanceof Array ? regExp : [regExp]);
    };
})(Mousetrap);