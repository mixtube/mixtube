'use strict';

var velocity = require('velocity-animate'),
  defaults = require('lodash/object/defaults'),
  has = require('lodash/object/has');

function slideAnimation(animationsConfig) {

  function emptyAnimation(element, done) {
    done();
  }

  function enter(element, done) {
    velocity(
      element[0],
      'slideDown',
      defaults(
        {complete: done},
        {
          duration: animationsConfig.transitionDuration,
          easing: animationsConfig.easeInOutBezierPoints
        }));
  }

  function leave(element, done) {
    velocity(
      element[0],
      'slideUp',
      defaults(
        {complete: done},
        {
          duration: animationsConfig.transitionDuration,
          easing: animationsConfig.easeInOutBezierPoints
        }));
  }

  return {
    enter: enter,
    leave: leave,
    move: emptyAnimation
  };
}

module.exports = slideAnimation;