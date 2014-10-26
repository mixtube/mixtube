(function(Velocity) {
  'use strict';

  function AnimationSlide(AnimationsConfig) {

    function emptyAnimation(element, done) {
      done();
    }

    function enter(element, done) {
      Velocity(
        element[0],
        'slideDown',
        _.defaults(
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
        _.defaults(
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

  angular.module('Mixtube').animation('.mt-js-animation__slide', AnimationSlide);

})(window.Velocity);
