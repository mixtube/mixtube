(function(Velocity) {
  'use strict';

  function AnimationSlide(AnimationsConfig) {

    function emptyAnimation(element, done) {
      done();
    }

    return {
      enter: function(element, done) {
        Velocity(
          element[0],
          'slideDown',
          _.defaults(
            {complete: done},
            {
              duration: AnimationsConfig.transitionDuration,
              easing: AnimationsConfig.easeInOutBezierPoints
            }));
      },
      leave: function(element, done) {
        Velocity(
          element[0],
          'slideUp',
          _.defaults(
            {complete: done},
            {
              duration: AnimationsConfig.transitionDuration,
              easing: AnimationsConfig.easeInOutBezierPoints
            }));
      },
      move: emptyAnimation
    };
  }

  angular.module('Mixtube').animation('.mt-js-animation__slide', AnimationSlide);

})(window.Velocity);
