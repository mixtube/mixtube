'use strict';

var Velocity = require('velocity-animate'),
  defaults = require('lodash/object/defaults'),
  has = require('lodash/object/has');

function slideAnimation(AnimationsConfig) {

  function emptyAnimation(element, done) {
    done();
  }

  function enter(element, done) {
    Velocity(
      element[0],
      'slideDown',
      defaults(
        {complete: done},
        {
          duration: AnimationsConfig.transitionDuration,
          easing: AnimationsConfig.easeInOutBezierPoints
        }));
  }

  function leave(element, done) {
    Velocity(
      element[0],
      'slideUp',
      defaults(
        {complete: done},
        {
          duration: AnimationsConfig.transitionDuration,
          easing: AnimationsConfig.easeInOutBezierPoints
        }));
  }

  return {
    enter: enter,
    leave: leave,
    move: emptyAnimation
  };
}

module.exports = slideAnimation;