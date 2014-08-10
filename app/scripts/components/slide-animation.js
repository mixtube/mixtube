(function (mt) {
    'use strict';

    mt.MixTubeApp.animation('.mt-js-animation__slide', function (animationsConfig) {

        function noopAnimation(element, done) {
            done();
        }

        return {
            enter: function (element, done) {

                var nominalHeight = element[0].getBoundingClientRect().height;

                element
                    .css({height: 0})
                    .velocity({height: [nominalHeight, 0]}, _.defaults(
                        {
                            complete: function () {
                                element.css({height: ''});
                                done();
                            }
                        },
                        {
                            duration: animationsConfig.transitionDuration,
                            easing: animationsConfig.easeInOutBezierPoints
                        }));
            },
            leave: function (element, done) {

                element
                    .velocity({height: 0}, _.defaults(
                        {
                            complete: done
                        },
                        {
                            duration: animationsConfig.transitionDuration,
                            easing: animationsConfig.easeInOutBezierPoints
                        }));
            },
            move: noopAnimation
        };
    });

})(mt);
