'use strict';

var keymaster = require('keymaster'),
  isUndefined = require('lodash/lang/isUndefined');

// @ngInject
function keyboardShortcutManagerFactory($rootScope) {

  var defaultFilter = keymaster.filter;

  var ESC_KEY_CODE = 27;
  keymaster.filter = function(event) {
    return event.keyCode === ESC_KEY_CODE || defaultFilter(event);
  };

  function register(scope, combo, callback) {
    if (isUndefined(callback)) {
      callback = combo;
      combo = scope;
      scope = 'all';
    }

    keymaster(combo, scope, function(evt) {
      $rootScope.$apply(function() {
        callback(evt);
      });
    });
  }

  function enterScope(name) {
    keymaster.setScope(name);
  }

  function leaveScope(name) {
    if (name === keymaster.getScope(name)) {
      keymaster.setScope('all');
    }
  }

  /**
   * @name keyboardShortcutManager
   */
  var keyboardShortcutManager = {
    /**
     * Registers a shortcut in the given scope.
     *
     * @param {string} scope the scope name
     * @param {string} combo
     * @param {?function} callback
     */
    register: register,

    /**
     * @param {string} name the scope name
     */
    enterScope: enterScope,

    /**
     * Unbind the given scope and restore the global one.
     *
     * This methods does nothing if the scope given is not the currently active one this.
     *
     * @param {string} name scope name
     */
    leaveScope: leaveScope
  };

  return keyboardShortcutManager;
}

module.exports = keyboardShortcutManagerFactory;