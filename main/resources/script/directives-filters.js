(function (mt) {
    // a directive to link focus state of a field with model expression
    var FOCUS_DIRECTIVE_NAME = 'mtFocus';
    mt.MixTubeApp.directive(FOCUS_DIRECTIVE_NAME, function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, elmt, attrs) {
                var fn = $parse(attrs[FOCUS_DIRECTIVE_NAME]);
                elmt.bind('blur', function () {
                    scope.$apply(function () {
                        fn.assign(scope, false);
                    });
                });

                scope.$watch(attrs[FOCUS_DIRECTIVE_NAME], function (value) {
                    if (value === true) {
                        $timeout(function () {
                            elmt[0].focus();
                        }, 50);
                    }
                });
            }
        };
    });

    // a duration formatter that takes a duration in milliseconds and returns a formatted duration like "h:mm"
    mt.MixTubeApp.filter('mtDuration', function () {
        // time that represent the absolute zero for date, all fields to zero
        var ABSOLUTE_DATE_ZERO = -2209114800000;

        // reuse the date object between invocation since it is only used as a formatting tool
        var singletonDate = new Date();

        return function (time) {
            if(isNaN(time)) {
                return '';
            }

            // reset the time to the zero to calculate durations
            singletonDate.setTime(ABSOLUTE_DATE_ZERO);
            singletonDate.setMilliseconds(time);

            return (singletonDate.getHours() * 60 + singletonDate.getMinutes()) + ':' + singletonDate.getSeconds();
        }
    });
})(mt);