(function (mt) {
    'use strict';

    /**
     * @ngdoc directive
     * @name mt.directive:mtSearchInput
     * @restrict A
     *
     * @description
     * A single usage directive that controls the sequencing of search input animation.
     *
     * Focus needs to be called inside a user initiated DOM event handler to show the virtual keyboard on mobile which
     * can't be guaranteed by AngularJS when using ngTouch module.
     * On click on ".mt-search-input__button" we focus the real input first and then we start the animation of
     * ".mt-search-input".
     */
    mt.MixTubeApp.directive('mtSearchInput', function (mtSearchInputsRegistry, mtDirectivesRegistryHelper, animationsConfig) {

        return {
            restrict: 'E',
            templateUrl: '/scripts/components/search/search-input.html',
            replace: true,
            scope: {
                inputModel: '=ngModel'
            },
            controller: function ($scope, $element, $attrs) {

                mtDirectivesRegistryHelper.install(this, mtSearchInputsRegistry, 'name', $scope, $attrs);

                var form = $element;
                var field = mt.commons.querySelector($element, '.mt-js-search-input__field');
                var fakeField = mt.commons.querySelector($element, '.mt-js-search-input__fake-field');

                // helps to differentiate first rendering from next ones
                var init = true;

                var _show = null;
                var animationRunning = false;

                function sync() {
                    animationRunning = true;
                    field.css({opacity: 0});

                    var baseAnimConf = {
                        // in init phase we don't want to animate
                        duration: init ? 0 : animationsConfig.transitionDuration,
                        easing: animationsConfig.easeInOutBezierPoints
                    };

                    if (_show) {
                        form.css({display: ''});
                        fakeField.velocity(
                            {translateX: ['0', '100%']},
                            _.extend(baseAnimConf, {
                                complete: function () {
                                    field.css({opacity: ''});
                                    animationRunning = false;
                                }
                            })
                        );
                    } else {
                        fakeField.velocity(
                            {translateX: ['100%', '0']},
                            _.extend(baseAnimConf, {
                                complete: function () {
                                    form.css({display: 'none'});
                                    field.css({opacity: ''});
                                    animationRunning = false;
                                }
                            })
                        );
                    }

                    if (init) {
                        init = false;
                    }

                    field[0][_show ? 'focus' : 'blur']();
                }

                // we need to blur the field on form submit to hide the virtual keyboard on mobile
                form.on('submit', function () {
                    if (!animationRunning) {
                        field[0].blur();
                    }
                });

                this.toggle = function (show) {
                    if (show !== _show && !animationRunning) {
                        _show = show;
                        sync();
                    }
                };
            }
        }
    });
})(mt);