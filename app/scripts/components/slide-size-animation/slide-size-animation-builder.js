(function(mt) {
  'use strict';

  function SlideSizeAnimationBuilderFactory(AnimationsConfig) {

    var BASE_VELOCITY_ANIM_CONF = {
      duration: AnimationsConfig.transitionDuration,
      easing: AnimationsConfig.easeInOutBezierPoints
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

    /**
     * @name SlideSizeAnimationBuilder
     */
    function SlideSizeAnimationBuilder() {
      return {

        enter: function(element, done) {

          var config = buildConfig(element);
          var txBeginning = config.ltr ? '-100%' : '100%';

          Velocity(
            element[0],
            'slideDown',
            _.defaults(
              {
                // disable mobile optimisation because VelocityJS uses the null transform hack
                // which would override our translate value
                mobileHA: false,

                complete: function() {
                  Velocity(
                    element[0],
                    {translateX: [0, txBeginning]},
                    _.defaults(
                      {
                        complete: function() {
                          element.css({height: '', transform: ''});
                          done();
                        }
                      }, BASE_VELOCITY_ANIM_CONF));
                }
              },
              BASE_VELOCITY_ANIM_CONF));

          element.css({height: 0, transform: 'translateX(' + txBeginning + ')'});
        },

        leave: function(element, done) {

          var config = buildConfig(element);

          Velocity(
            element[0],
            {translateX: [config.ltr ? '-100%' : '100%', 0]},
            _.defaults(
              {
                complete: function() {
                  Velocity(
                    element[0],
                    'slideUp',
                    _.defaults({complete: done}, BASE_VELOCITY_ANIM_CONF));
                }
              }, BASE_VELOCITY_ANIM_CONF)
          );


        },

        move: function(element, done) {
          // move doesn't really make sense for the use cases sor far
          done();
        }
      };
    }

    SlideSizeAnimationBuilder.buildConfig = buildConfig;
    SlideSizeAnimationBuilder.BASE_VELOCITY_ANIM_CONF = BASE_VELOCITY_ANIM_CONF;

    return SlideSizeAnimationBuilder;
  }

  angular.module('Mixtube').factory('SlideSizeAnimationBuilder', SlideSizeAnimationBuilderFactory);

})(mt);