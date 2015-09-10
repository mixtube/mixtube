'use strict';

// @ngInject
function foldAnimation($animateCss, animationsConfig) {

  function fold(element, unfold, doneCb) {
    var height = element[0].getBoundingClientRect().height;

    $animateCss(element, {
      from: {height: (unfold ? '0' : height) + 'px'},
      to: {height: (!unfold ? '0' : height) + 'px'},
      easing: 'cubic-bezier(' + animationsConfig.easeInOutBezierPoints.join(', ') + ')',
      duration: animationsConfig.transitionDuration / 1000
    })
      .start()
      .done(function() {
        element[0].style.height = '';
        doneCb();
      });
  }

  function enter(element, doneCb) {
    fold(element, true, doneCb);
  }

  function leave(element, doneCb) {
    fold(element, false, doneCb);
  }

  return {
    enter: enter,
    leave: leave
  };
}

module.exports = foldAnimation;