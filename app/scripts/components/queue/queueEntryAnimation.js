'use strict';

var velocity = require('velocity-animate'),
  assign = require('lodash/object/assign'),
  defaults = require('lodash/object/defaults');

/**
 * A animation tailored for queue's items (enter and leave events).
 *
 * It overrides the default size and slide animation to add a special queue entry event (needed by mtQueue directive)
 */
// @ngInject
function queueEntryAnimation(slideSizeAnimationBuilder) {

  return assign(
    slideSizeAnimationBuilder(),
    {
      enter: function(element, done) {

        var txBeginning = '-100%';
        var scope = element.scope();

        scope.$emit('mtQueueEntryAnimation::started', scope.entry);

        // first step of the animation
        element.css({transform: 'translateX(' + txBeginning + ')'});

        // second step that may be delayed
        function nextStep() {
          velocity(
            element[0],
            {translateX: [0, txBeginning]},
            defaults({
              complete: function() {
                element.css({transform: ''});
                done();
              }
            }, slideSizeAnimationBuilder.BASE_VELOCITY_ANIM_CONF));
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

module.exports = queueEntryAnimation;