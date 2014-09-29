(function(mt) {
  'use strict';

  function UserInteractionManagerFactory($rootScope, $timeout, InteractiveChromesManager, PointerManager) {

    var ACTIVITY_DELAY = 4000;

    // we consider the loading phase as activity so that it shows the chrome (better discoverability)
    var userInteracting = true;
    var activityTO = null;

    activate();

    function renewActivityTO() {
      $timeout.cancel(activityTO);
      activityTO = $timeout(function activityTOCb() {
        if (InteractiveChromesManager.isChromeInteracted()) {
          renewActivityTO();
        } else {
          $rootScope.$apply(function() {
            userInteracting = false;
          });
        }
      }, ACTIVITY_DELAY, false);
    }

    function suspendActivityTO() {
      $timeout.cancel(activityTO);
    }

    function activate() {
      PointerManager.bindMove({
        start: function() {
          suspendActivityTO();
          $rootScope.$apply(function() {
            userInteracting = true;
          });
        },

        stop: function() {
          renewActivityTO();
        }
      });

      renewActivityTO();
    }

    /**
     * @name UserInteractionManager
     */
    var UserInteractionManager = {
      /**
       * Is the user actively interacting with the UI.
       *
       * @returns {boolean}
       */
      get userInteracting() {
        return userInteracting;
      }
    };

    return UserInteractionManager;
  }

  angular.module('Mixtube').factory('UserInteractionManager', UserInteractionManagerFactory);

})(mt);