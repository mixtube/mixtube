(function(mt) {
  'use strict';

  function mtSmartImg($rootScope, $document, $animate, $filter) {

    var imgCacheUrlFilter = $filter('mtCacheImgUrl');

    return {
      restrict: 'E',
      template: '<div class="mt-smart-img__image"></div><div class="mt-smart-img__loading-indicator-container"></div>',
      transclude: true,
      link: function(scope, iElement, iAttrs, controller, transcludeFn) {

        var children = iElement.children();
        var image = children.eq(0);
        var indicatorContainer = children.eq(1);

        var indicator;
        transcludeFn(scope, function(indicatorClone) {
          indicator = indicatorClone;
          indicatorContainer.append(indicatorClone);
        });

        var loader = $document[0].createElement('img');

        iAttrs.$observe('source', function(source) {
          if (source) {
            source = imgCacheUrlFilter(source);
            loader.src = source;
            loader.onload = function() {
              $animate.addClass(indicatorContainer, 'ng-hide');
              $animate.removeClass(image, 'mt-loading');
              $rootScope.$digest();
            };

            $animate.removeClass(indicatorContainer, 'ng-hide');
            $animate.addClass(image, 'mt-loading');

            image.css({'background-image': 'url(' + source + ')'});
          } else {
            image.css({'background-image': 'none'});
          }
        });
      }
    };
  }

  angular.module('Mixtube').directive('mtSmartImg', mtSmartImg);

})(mt);