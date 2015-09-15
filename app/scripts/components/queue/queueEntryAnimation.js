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
              console.log(element[0].getAttribute('mt-anchor'));
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



  //return assign(
  //  slideSizeAnimationBuilder(),
  //  {
  //    enter: function(element, done) {
  //
  //      var txBeginning = '-100%';
  //      var scope = element.scope();
  //
  //      scope.$emit('mtQueueEntryAnimation::started', scope.entry);
  //
  //      // first step of the animation
  //      element.css({transform: 'translateX(' + txBeginning + ')'});
  //
  //      // second step that may be delayed
  //      function nextStep() {
  //        velocity(
  //          element[0],
  //          {translateX: [0, txBeginning]},
  //          defaults({
  //            complete: function() {
  //              element.css({transform: ''});
  //              done();
  //            }
  //          }, slideSizeAnimationBuilder.BASE_VELOCITY_ANIM_CONF));
  //      }
  //
  //      var suspended = false;
  //      var continuation = {
  //        suspend: function() {
  //          suspended = true;
  //        },
  //        continue: function() {
  //          suspended = false;
  //          nextStep();
  //        }
  //      };
  //
  //      // may be overkill because it is triggered just after started but describes better the two phases
  //      // nature of this animation
  //      scope.$emit('mtQueueEntryAnimation::sizingDone', scope.entry, continuation);
  //
  //      // at this stage the continuation may have been suspended by someone listening to the event
  //      if (!suspended) {
  //        continuation.continue();
  //      }
  //    }
  //  });
}

module.exports = queueEntryAnimation;