(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtSlideSizeAnimationBuilder', function (EASE_IN_OUT_BEZIER_POINTS) {

        var BASE_VELOCITY_ANIM_CONF = {
            duration: 175,
            easing: EASE_IN_OUT_BEZIER_POINTS
        };

        /**
         * Creates the config used by enter and leave method
         *
         * @param {JQLite} element
         * @returns {{ltr: boolean}} true if the slide move should be from left to right, false else
         */
        function buildConfig(element) {
            return {
                ltr: !element.hasClass('from-right')
            };
        }

        function builder() {
            return {

                enter: function (element, done) {

                    var config = buildConfig(element);
                    var txBeginning = config.ltr ? '-100%' : '100%';
                    var nominalHeight = element[0].getBoundingClientRect().height;

                    element.css({transform: 'translateX(' + txBeginning + ')'});

                    element
                        .velocity({height: [nominalHeight, 0]}, BASE_VELOCITY_ANIM_CONF)
                        .velocity({translateX: [0, txBeginning]}, _.defaults(
                            {
                                complete: function () {
                                    element.css({transform: '', height: ''});
                                    done();
                                }
                            }, BASE_VELOCITY_ANIM_CONF));
                },

                leave: function (element, done) {

                    var config = buildConfig(element);
                    var nominalHeight = element[0].getBoundingClientRect().height;

                    element
                        .velocity({translateX: [config.ltr ? '-100%' : '100%', 0]}, BASE_VELOCITY_ANIM_CONF)
                        .velocity({height: [0, nominalHeight]}, _.defaults({complete: done}, BASE_VELOCITY_ANIM_CONF));
                },

                move: function (element, done) {
                    // move doesn't really make sense for the use cases sor far
                    done();
                }
            };
        }

        builder.buildConfig = buildConfig;
        builder.BASE_VELOCITY_ANIM_CONF = BASE_VELOCITY_ANIM_CONF;
        return builder;
    });
})(mt);