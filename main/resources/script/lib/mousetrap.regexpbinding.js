/**
 * Adds a bindRegExp method to Mousetrap that allows bind specific keyboard shortcuts that will tested on the given
 * RegExp. If a RegExp binding match a key, the chain is stopped so that no other (string based) binding callback will
 * be executed.
 *
 * Needs v 1.4 of Mousetrap at least.
 */
Mousetrap = (function (Mousetrap) {
    var savedHandleKeyFn = Mousetrap.handleKey;
    var bindingByKey = {};

    Mousetrap.handleKey = function (character, modifiers, evt) {
        var matched = false;

        // try to convert the key code to a string, if the typed key is not a character it will return en empty string
        var typedString = String.fromCharCode(evt.which);

        if (typedString.length > 0) {
            for (var key in bindingByKey) {
                var bindings = bindingByKey[key];
                for (var idxBindings = 0; idxBindings < bindings.length; idxBindings++) {
                    var binding = bindings[idxBindings];
                    if (binding.regExp.test(typedString)) {
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
     * @param {string=} action
     */
    function bind(regExps, callback, action) {
        for (var idx = 0; idx < regExps.length; idx++) {
            var regExp = regExps[idx];
            // unique binding by pair regExp / action
            var key = regExp.toString() + action;
            bindingByKey[key] = bindingByKey[key] || [];
            bindingByKey[key].push({
                regExp: regExps[idx],
                callback: callback,
                action: action
            });
        }
    }

    /**
     * @param {Array.<RegExp>} regExps
     * @param {string=} action
     */
    function unbind(regExps, action) {
        for (var idx = 0; idx < regExps.length; idx++) {
            var regExp = regExps[idx];
            delete bindingByKey[regExp.toString() + action];
        }
    }

    /**
     * @param {RegExp|Array.<RegExp>} regExp
     * @param {Function} callback
     * @param {string=} action
     */
    Mousetrap.bindRegExp = function (regExp, callback, action) {
        bind(regExp instanceof Array ? regExp : [regExp], callback, action || 'keypress');
    };

    Mousetrap.unbindRegExp = function (regExp, action) {
        unbind(regExp instanceof Array ? regExp : [regExp], action || 'keypress');
    };

    return Mousetrap;
})(Mousetrap);