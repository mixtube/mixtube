(function (mt) {
    'use strict';

    /**
     * @ngdoc animation
     * @name mt.animation:.mt-js-queue__entry__animation-repeat
     *
     * @description
     * A animation tailored for queue's items (enter and leave events).
     *
     * It actually doesn't rely on AngularJS for animation but instead use a custom mix of CSS transitions and JS sequencing.
     * The animation framework here is just used as an "event" system for us to be notified of new element insertion / removal.
     */
    mt.MixTubeApp.animation('.mt-js-queue__entry__animation-repeat', function (mTransitionsSequenceFactory) {

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

        // we use the animation just as a hook to be notified of the list (managed by "ng-repeat") modifications
        return {

            enter: function (element, done) {
                var params = buildParams(element);

                var ts = mTransitionsSequenceFactory.getInstance();

                ts.begin().addClass('slidein-start grow-start'); // part of the begin stage

                ts.then().removeClass('grow-start')
                    .addClass('grow grow-end').css('height', params.nominalHeight + 'px');

                ts.then().exec(function () {
                    element.triggerHandler('$animate:mtSized');
                }).removeClass('grow grow-init').css('height', '').removeClass('slidein-start')
                    .addClass('slidein slidein-end');

                ts.then().removeClass('grow-end slidein slidein-end');

                // run the sequence
                ts.end(params.element, done);
            },

            leave: function (element, done) {
                var params = buildParams(element);

                var ts = mTransitionsSequenceFactory.getInstance();

                ts.begin().addClass('slideout-start shrink-init').css('height', params.nominalHeight + 'px'); // part of the begin stage

                ts.then().addClass('slideout slideout-end');

                // reset the inline defined height so that the value declared in the stylesheet takes over and let the CSS magic happen
                ts.then().removeClass('slideout slideout-start').css('height', '')
                    .addClass('shrink shrink-end');

                // run the sequence
                ts.end(params.element, done);
            },

            move: function (element, done) {
                // move doesn't really make sense for the queue's animation
                done();
            }
        };
    });
})(mt);