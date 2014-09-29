(function(mt) {
  'use strict';

  angular.module('Mixtube').animation('.mt-js-animation-enter-leave__slide-and-size', function(SlideSizeAnimationBuilder) {
    return SlideSizeAnimationBuilder();
  });

})(mt);