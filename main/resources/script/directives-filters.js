(function (mt) {
    // simple event listener directives for focus and blur events type
    ['blur', 'focus'].forEach(function (evtName) {
        var directiveName = 'mt' + mt.tools.capitalize(evtName);
        mt.MixTubeApp.directive(directiveName, function ($parse) {
            return function (scope, elmt, attr) {
                var fn = $parse(attr[directiveName]);
                elmt.bind(evtName, function (event) {
                    scope.$apply(function () {
                        fn(scope, {$event: event});
                    });
                });
            };
        });
    });

    // a directive to link focus state of a field with model expression
    var focusModelName = 'mtFocusModel';
    mt.MixTubeApp.directive(focusModelName, function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, elmt, attrs) {
                var fn = $parse(attrs[focusModelName]);
                elmt.bind('focus', function () {
                    scope.$apply(function () {
                        fn.assign(scope, true);
                    });
                });
                elmt.bind('blur', function () {
                    scope.$apply(function () {
                        fn.assign(scope, false);
                    });
                });

                scope.$watch(attrs[focusModelName], function (value) {
                    if (value) {
                        $timeout(function () {
                            elmt[0].focus();
                        }, 50);
                    } else {
                        $timeout(function () {
                            elmt[0].blur();
                        }, 50);
                    }
                });
            }
        };
    });

    // ensures that the element (most likely an input) is focus when shown. Works with ngShow or ngHide.
    var focusWhenName = 'mtFocuswhen';
    mt.MixTubeApp.directive(focusWhenName, function ($parse, $timeout) {
        return function (scope, elmt, attrs) {
            var fn = $parse(attrs[focusWhenName]);
            var config = angular.extend({}, {selectTextOnFocus: false}, fn(scope));
            var watcher = function (shown) {
                $timeout(function () {
                    var action = (shown ? 'focus' : 'blur');
                    elmt[action]();
                    if (config.selectTextOnFocus && action === 'focus') {
                        elmt.select();
                    }
                }, 50);
            };

            if (attrs.hasOwnProperty('ngShow')) {
                scope.$watch(attrs['ngShow'], watcher);
            } else if (attrs.hasOwnProperty('ngHide')) {
                scope.$watch(attrs['ngHide'], function (hidden) {
                    watcher(!hidden);
                });
            } else {
                throw new Error(focusWhenName + ' directive must be used with ngShow or ngHide');
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