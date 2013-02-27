(function (mt) {
    // a directive to link focus state of a field with model expression
    mt.MixTubeApp.directive('mtFocus', function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, elmt, attrs) {
                var setter = $parse(attrs.mtFocus).assign;
                if (setter) {
                    angular.element(elmt[0]).bind('blur', function () {
                        setter(scope, false);
                    });
                }

                scope.$watch(attrs.mtFocus, function (value) {
                    if (value === true) {
                        $timeout(function () {
                            elmt[0].focus();
                        }, 50);
                    }
                });
            }
        };
    });
})(mt);