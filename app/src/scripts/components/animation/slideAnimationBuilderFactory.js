'use strict';

// @ngInject
function slideAnimationBuilderFactory($animateCss, animationsConfig) {

  function slide(element, fromTo) {

    var runner = $animateCss(element, {
      from: {transform: 'translateX(' + fromTo.from + ')'},
      to: {transform: 'translateX(' + fromTo.to + ')'},
      easing: 'cubic-bezier(' + animationsConfig.easeInOutBezierPoints.join(', ') + ')',
      duration: animationsConfig.transitionDuration / 1000
    }).start();

    return runner;
  }

  function slideAnimationBuilder(fromTo) {

    function enter(element) {
      var runner = slide(element, fromTo);

      runner
        .done(function() {
          element[0].style.transform = '';
        });

      return runner;
    }

    function leave(element) {
      return slide(element, fromTo);
    }

    return {
      enter: enter,
      leave: leave
    };
  }

  return slideAnimationBuilder;
}

module.exports = slideAnimationBuilderFactory;