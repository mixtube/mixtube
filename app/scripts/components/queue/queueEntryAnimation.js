'use strict';

/**
 * A animation tailored for queue's items (enter and leave events).
 *
 * It overrides the default size and slide animation to add a special queue entry event (needed by mtQueue directive)
 */
// @ngInject
function queueEntryAnimation(slideAnimationBuilder, foldAnimationBuilder) {

  var foldAnimation = foldAnimationBuilder();

  function enter(element, doneFn) {

    var scope = element.scope();

    // make sure it is hidden before the animation starts
    element[0].style.transform = 'translateX(-100%)';

    foldAnimation
      .enter(element)
      .done(function() {
        scope.$emit('mtQueueEntryAnimation::foldDone', scope.entry, {
          waitUntil: function(promiseWaited) {
            promiseWaited.then(function() {
              slideAnimationBuilder({from: '-100%', to: '0%'})
                .enter(element)
                .done(doneFn);
            });
          }
        });
      });
  }

  function leave(element, doneFn) {
    slideAnimationBuilder({from: '0%', to: '-100%'})
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

module.exports = queueEntryAnimation;