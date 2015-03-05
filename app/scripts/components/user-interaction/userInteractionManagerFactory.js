'use strict';

// @ngInject
function userInteractionManagerFactory($rootScope, $timeout, interactiveChromesManager, pointerManager) {

  var ACTIVITY_DELAY = 4000;

  // we consider the loading phase as activity so that it shows the chrome (better discoverability)
  var userInteracting = true;
  var activityTO = null;

  activate();

  function renewActivityTO() {
    $timeout.cancel(activityTO);
    activityTO = $timeout(function activityTOCb() {
      if (interactiveChromesManager.isChromeInteracted()) {
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
    pointerManager.bindMove({
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
   * @name userInteractionManager
   */
  var userInteractionManager = {
    /**
     * Is the user actively interacting with the UI.
     *
     * @returns {boolean}
     */
    get userInteracting() {
      return userInteracting;
    }
  };

  return userInteractionManager;
}

module.exports = userInteractionManagerFactory;