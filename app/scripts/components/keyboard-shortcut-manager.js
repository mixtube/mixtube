(function() {
  'use strict';

  function KeyboardShortcutManagerFactory($rootScope) {

    var keymaster = key.noConflict();
    var defaultFilter = keymaster.filter;

    var ESC_KEY_CODE = 27;
    keymaster.filter = function(event) {
      return event.keyCode === ESC_KEY_CODE || defaultFilter(event);
    };

    /**
     * @name KeyboardShortcutManager
     */
    var KeyboardShortcutManager = {
      /**
       * Registers a shortcut in the given scope.
       *
       * @param {string} scope the scope name
       * @param {string} combo
       * @param {?function} callback
       */
      register: function(scope, combo, callback) {
        if (_.isUndefined(callback)) {
          callback = combo;
          combo = scope;
          scope = 'all';
        }

        keymaster(combo, scope, function(evt) {
          $rootScope.$apply(function() {
            callback(evt);
          });
        });
      },

      /**
       * @param {string} name the scope name
       */
      enterScope: function(name) {
        keymaster.setScope(name);
      },

      /**
       * Unbind the given scope and restore the global one.
       *
       * This methods does nothing if the scope given is not the currently active one this.
       *
       * @param {string} name scope name
       */
      leaveScope: function(name) {
        if (name === keymaster.getScope(name)) {
          keymaster.setScope('all');
        }
      }
    };

    return KeyboardShortcutManager;
  }

  angular.module('Mixtube').factory('KeyboardShortcutManager', KeyboardShortcutManagerFactory);

})();