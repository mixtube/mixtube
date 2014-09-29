(function(mt) {
  'use strict';

  /**
   * A animation tailored for queue's items (enter and leave events).
   *
   * It overrides the default size and slide animation to add a special queue entry event (needed by mtQueue directive)
   */
  function AnimationQueueEntry(SlideSizeAnimationBuilder) {

    return _.extend(
      SlideSizeAnimationBuilder(),
      {
        enter: function(element, done) {

          var txBeginning = '-100%';
          var scope = element.scope();

          scope.$emit('mtQueueEntryAnimation::started', scope.entry);

          // first step of the animation
          element.css({transform: 'translateX(' + txBeginning + ')'});

          // second step that may be delayed
          function nextStep() {
            Velocity(
              element[0],
              {translateX: [0, txBeginning]},
              _.defaults({
                complete: function() {
                  element.css({transform: ''});
                  done();
                }
              }, SlideSizeAnimationBuilder.BASE_VELOCITY_ANIM_CONF));
          }

          var suspended = false;
          var continuation = {
            suspend: function() {
              suspended = true;
            },
            continue: function() {
              suspended = false;
              nextStep();
            }
          };

          // may be overkill because it is triggered just after started but describes better the two phases
          // nature of this animation
          scope.$emit('mtQueueEntryAnimation::sizingDone', scope.entry, continuation);

          // at this stage the continuation may have been suspended by someone listening to the event
          if (!suspended) {
            continuation.continue();
          }
        }
      });
  }

  angular.module('Mixtube').animation('.mt-js-animation__queue-entry', AnimationQueueEntry);

})(mt);