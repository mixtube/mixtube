'use strict';

/**
 * Default configuration for animations. These values are shared with the SASS counterpart.
 *
 * @name animationsConfig
 */
var animationsConfig = {
  // SASS $baseTransitionDuration
  get transitionDuration() {
    return 200;
  },
  // SASS $easeInOut
  get easeInOutBezierPoints() {
    return [0.8, 0, 0.2, 1];
  }
};

module.exports = animationsConfig;