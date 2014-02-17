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
     * can't be guaranteed by AngularJS (because of the digestion loop).
     * On click on ".mt-search-input__button" we focus the real input first and then we start the animation of
     * ".mt-search-input". We are leveraging the regular ngHide animation so the required styles are the same.
     */
    mt.MixTubeApp.directive('mtSearchInput', function ($animate, $$animateReflow, mtSearchInputsRegistry) {
        return {
            restrict: 'E',
            templateUrl: '/scripts/v2/components/search-input/search-input.html',
            replace: true,
            scope: {
                inputModel: '=ngModel'
            },
            controller: function ($scope, $element, $attrs) {

                var name = $attrs.name;

                if (!name || name.trim().length === 0) {
                    throw new Error('mtSearchInput expected a non empty string as name value');
                }

                mtSearchInputsRegistry.register(name, this);
                $scope.$on('$destroy', function () {
                    mtSearchInputsRegistry.unregister(name);
                });

                var form = $element;
                var field = mt.tools.querySelector($element, '.mt-js-search-input__field');
                var fakeField = mt.tools.querySelector($element, '.mt-js-search-input__fake-field');

                var _show = null;
                var animationRunning = false;

                function sync() {
                    animationRunning = true;
                    field.css('opacity', 0);

                    if (_show) {
                        $animate.removeClass(form, 'ng-hide', function () {
                            // needed to avoid animation cancellation due to multiple animation run "in the same time"
                            $$animateReflow(function () {
                                $animate.removeClass(fakeField, 'ng-hide', function () {
                                    field.css('opacity', null);
                                    animationRunning = false;
                                });
                            });
                        });
                    } else {
                        $animate.addClass(fakeField, 'ng-hide', function () {
                            $$animateReflow(function () {
                                $animate.addClass(form, 'ng-hide', function () {
                                    field.css('opacity', null);
                                    animationRunning = false;
                                });
                            });
                        });
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