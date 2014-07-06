(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtSlideSizeAnimationBuilder', function (EASE_IN_OUT_BEZIER_POINTS) {

        var BASE_VELOCITY_ANIM_CONF = {
            duration: 175,
            easing: EASE_IN_OUT_BEZIER_POINTS
        };

        /**
         * Collect the given element and the siblings including comment nodes.
         *
         * Required to work with ngRepeat since it manages the collection insertion with the comment between each item.
         *
         * @param {JQLite} self the element to start from (including it)
         * @returns {JQLite} the element itself plus the siblings
         */
        function selfAndNextAllIncludingComments(self) {
            var rMatched = [];
            if (self.length) {
                var rElem = self[0];

                do {
                    if (rElem.nodeType === Node.ELEMENT_NODE || rElem.nodeType === Node.COMMENT_NODE) {
                        rMatched.push(rElem);
                    }
                    // get the next sibling and loop
                    rElem = rElem.nextSibling;
                } while (rElem);
            }

            return angular.element(rMatched);
        }

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

                    element.velocity(
                        {translateX: [0, config.ltr ? '-100%' : '100%']},
                        _.defaults({
                            complete: function () {
                                element.css({transform: ''});
                                done();
                            }
                        }, BASE_VELOCITY_ANIM_CONF));
                },

                leave: function (element, done) {

                    var config = buildConfig(element);
                    var nominalHeight = element[0].getBoundingClientRect().height;

                    element.velocity(
                        {translateX: [config.ltr ? '-100%' : '100%', 0]},
                        _.defaults({
                            complete: function () {

                                // there may be no next element but that's ok, the nextAll collection will just be empty
                                var $nextAll = selfAndNextAllIncludingComments(element.next());

                                var $wrapper = angular.element('<div>')
                                    .css({transform: 'translateY(' + nominalHeight + 'px)'})
                                    .append($nextAll);

                                element.after($wrapper);
                                element.css({display: 'none'});

                                $wrapper.velocity(
                                    {translateY: [0, nominalHeight]},
                                    _.defaults({
                                        complete: function () {
                                            element.after($nextAll);
                                            $wrapper.remove();
                                            done();
                                        }
                                    }, BASE_VELOCITY_ANIM_CONF));
                            }
                        }, BASE_VELOCITY_ANIM_CONF));
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