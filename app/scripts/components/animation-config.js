(function() {
  'use strict';

  /**
   * Default configuration for animations. These values are shared with the SASS counterpart.
   *
   * @name AnimationsConfig
   */
  var AnimationsConfig = {
    // SASS $baseTransitionDuration
    get transitionDuration() {
      return 200;
    },
    // SASS $easeInOut
    get easeInOutBezierPoints() {
      return [.8, 0, .2, 1];
    }
  };

  angular.module('Mixtube').constant('AnimationsConfig', AnimationsConfig);

})();
