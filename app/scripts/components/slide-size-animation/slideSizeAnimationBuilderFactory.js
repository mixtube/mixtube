'use strict';

var defaults = require('lodash/object/defaults'),
  velocity = require('velocity-animate');

// @ngInject
function slideSizeAnimationBuilderFactory(animationsConfig) {

  var BASE_VELOCITY_ANIM_CONF = {
    duration: animationsConfig.transitionDuration,
    easing: animationsConfig.easeInOutBezierPoints
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

  function enter(element, done) {

    var config = buildConfig(element);
    var txBeginning = config.ltr ? '-100%' : '100%';

    velocity(
      element[0],
      'slideDown',
      defaults(
        {
          // disable mobile optimisation because VelocityJS uses the null transform hack
          // which would override our translate value
          mobileHA: false,

          complete: function() {
            velocity(
              element[0],
              {translateX: [0, txBeginning]},
              defaults(
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
  }

  function leave(element, done) {

    var config = buildConfig(element);

    velocity(
      element[0],
      {translateX: [config.ltr ? '-100%' : '100%', 0]},
      defaults(
        {
          complete: function() {
            velocity(
              element[0],
              'slideUp',
              defaults({complete: done}, BASE_VELOCITY_ANIM_CONF));
          }
        }, BASE_VELOCITY_ANIM_CONF)
    );
  }

  function move(element, done) {
    // move doesn't really make sense for the use cases sor far
    done();
  }

  /**
   * @name slideSizeAnimationBuilder
   */
  function slideSizeAnimationBuilder() {
    return {
      enter: enter,
      leave: leave,
      move: move
    };
  }

  slideSizeAnimationBuilder.buildConfig = buildConfig;
  slideSizeAnimationBuilder.BASE_VELOCITY_ANIM_CONF = BASE_VELOCITY_ANIM_CONF;

  return slideSizeAnimationBuilder;
}

module.exports = slideSizeAnimationBuilderFactory;