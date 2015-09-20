'use strict';

// @ngInject
function slideFoldAnimation(slideAnimationBuilder, foldAnimationBuilder) {

  var foldAnimation = foldAnimationBuilder();

  function buildFromTo(slideIn, leftToRight) {
    var fromTo = {from: 0, to: 0};
    if (slideIn) {
      fromTo.from = leftToRight ? -100 : 100 + '%';
    } else {
      fromTo.to = leftToRight ? -100 : 100 + '%';
    }

    return fromTo;
  }

  function enter(element, doneFn) {

    var fromTo = buildFromTo(true, !element.hasClass('from-right'));

    // make sure it is hidden before the animation starts
    element[0].style.transform = 'translateX(' + fromTo.from + ')';

    foldAnimation
      .enter(element)
      .done(function() {
        slideAnimationBuilder(fromTo)
          .enter(element)
          .done(doneFn);
      });
  }

  function leave(element, doneFn) {
    slideAnimationBuilder(buildFromTo(false, !element.hasClass('from-right')))
      .leave(element)
      .done(function() {
        foldAnimation
          .leave(element)
          .done(doneFn);
      });
  }

  return {
    enter: enter,
    leave: leave
  };
}

module.exports = slideFoldAnimation;