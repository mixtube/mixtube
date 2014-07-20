(function (mt) {
    'use strict';

    /**
     * A animation tailored for queue's items (enter and leave events).
     *
     * It overrides the default size and slide animation to add a special queue entry event (needed by mtQueue directive)
     */
    mt.MixTubeApp.animation('.mt-js-animation__queue-entry', function (mtSlideSizeAnimationBuilder) {
        return _.extend(
            mtSlideSizeAnimationBuilder(),
            {
                enter: function (element, done) {

                    var config = mtSlideSizeAnimationBuilder.buildConfig(element);
                    var scope = element.scope();

                    scope.$emit('mtQueueEntryAnimation::started', scope.entry);

                    // first step of the animation
                    element.css({transform: 'translateX(-100%)'});

                    // second step that may be delayed
                    function nextStep() {
                        element.velocity(
                            {translateX: [0, config.ltr ? '-100%' : '100%']},
                            _.defaults({
                                complete: function () {
                                    element.css({transform: ''});
                                    done();

                                }
                            }, mtSlideSizeAnimationBuilder.BASE_VELOCITY_ANIM_CONF));
                    }

                    var suspended = false;
                    var continuation = {
                        suspend: function () {
                            suspended = true;
                        },
                        continue: function () {
                            suspended = false;
                            nextStep();
                        }
                    };

                    // may be overkill but describes better the intent where the sizing could be animated
                    scope.$emit('mtQueueEntryAnimation::sizingDone', scope.entry, continuation);

                    // at this stage the continuation may have been suspended by someone listening to the event
                    if (!suspended) {
                        continuation.continue();
                    }
                }
            }
        );

    });
})(mt);