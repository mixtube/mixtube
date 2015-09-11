'use strict';

// @ngInject
function foldAnimation($animateCss, animationsConfig) {

  function fold(element, unfold) {
    var height = element[0].getBoundingClientRect().height;

    var runner = $animateCss(element, {
      from: {height: (unfold ? '0' : height) + 'px'},
      to: {height: (!unfold ? '0' : height) + 'px'},
      easing: 'cubic-bezier(' + animationsConfig.easeInOutBezierPoints.join(', ') + ')',
      duration: animationsConfig.transitionDuration / 1000
    }).start();

    runner
      .done(function() {
        element[0].style.height = '';
      });

    return runner;
  }

  function enter(element) {
    return fold(element, true);
  }

  function leave(element) {
    return fold(element, false);
  }

  return {
    enter: enter,
    leave: leave
  };
}

module.exports = foldAnimation;