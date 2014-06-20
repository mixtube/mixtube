(function (mt) {
    'use strict';

    /**
     * @ngdoc animation
     * @name mt.animation:.mt-js-animation-enter-leave__slide-and-size
     *
     * @description
     * A animation tailored for queue's items (enter and leave events).
     */
    mt.MixTubeApp.animation('.mt-js-animation-enter-leave__slide-and-size', function () {

        var BASE_VELOCITY_ANIM_CONF = {
            duration: 175,
            easing: [ .8, 0, .2, 1 ] // see sass $easeInOut
        };

        // creates the params used by enter and leave method
        function buildParams(element) {
            // we might get a comment node as well here so we need to filter only the element
            element = element.eq(0);

            // we get the (floating point precision) height value just before the animation
            var nominalHeight = element[0].getBoundingClientRect().height;

            return {
                element: element,
                nominalHeight: nominalHeight
            };
        }

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
            var rElem = self[0];

            do {
                if (rElem.nodeType === Node.ELEMENT_NODE || rElem.nodeType === Node.COMMENT_NODE) {
                    rMatched.push(rElem);
                }
                // get the next sibling and loop
                rElem = rElem.nextSibling;
            } while (rElem);

            return angular.element(rMatched);
        }

        return {

            enter: function (element, done) {

                var params = buildParams(element);

                params.element.velocity(
                    {translateX: [0, '-100%']},
                    _.defaults({
                        complete: function () {
                            params.element.css({transform: ''});
                            done();
                        }
                    }, BASE_VELOCITY_ANIM_CONF));
            },

            leave: function (element, done) {
                var params = buildParams(element);

                params.element.velocity(
                    {translateX: ['-100%', 0]},
                    _.defaults({
                        complete: function () {

                            var $nextAll = selfAndNextAllIncludingComments(params.element.next());

                            var $wrapper = angular.element('<div>')
                                .css({transform: 'translateY(' + params.nominalHeight + 'px)'})
                                .append($nextAll);

                            params.element.after($wrapper);
                            params.element.css({display: 'none'});

                            $wrapper.velocity(
                                {translateY: [0, params.nominalHeight]},
                                _.defaults({
                                    complete: function () {
                                        params.element.after($nextAll);
                                        $wrapper.remove();
                                        done();
                                    }
                                }, BASE_VELOCITY_ANIM_CONF));
                        }
                    }, BASE_VELOCITY_ANIM_CONF));
            },

            move: function (element, done) {
                // move doesn't really make sense for the queue's animation
                done();
            }
        };
    });
})(mt);