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
        // reuse the date object between invocation since it is only used as a formatting tool
        var singletonDate = new Date(0, 0, 0, 0, 0, 0, 0);
        // time that represent the absolute zero for date, all fields to zero
        // needs to be computed because of timezones differences
        var absoluteDateZero = singletonDate.getTime();

        return function (time) {
            if (isNaN(time)) {
                return '';
            }

            // reset the time to the zero to calculate durations
            singletonDate.setTime(absoluteDateZero);
            singletonDate.setMilliseconds(time);

            return (singletonDate.getHours() * 60 + singletonDate.getMinutes()).toString(10) + ':' + mt.tools.leftPad(singletonDate.getSeconds().toString(10), 2, '0');
        }
    });
})(mt);