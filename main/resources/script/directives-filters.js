(function (mt, undefined) {
    'use strict';

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

    // ensures that the element (most likely an input) is focused.
    var focusWhenName = 'mtFocuswhen';
    mt.MixTubeApp.directive(focusWhenName, function ($parse, $timeout) {
        var defaultConfig = {selectTextOnFocus: false};

        return function (scope, elmt, attrs) {
            scope.$watch(attrs[focusWhenName], function (config) {
                if (!angular.isObject(config)) {
                    config = {model: config};
                }
                config = angular.extend({}, defaultConfig, config);

                $timeout(function () {
                    var action = config.model ? 'focus' : 'blur';
                    elmt[action]();
                    if (config.selectTextOnFocus && action === 'focus') {
                        elmt.select();
                    }
                }, 50);
            }, true);
        };
    });

    // intercept rendering initiated by ngModel directive in order to focus the element on model change
    // it is useful to enforce good sequencing of focus then value affectation to get a proper caret position (FF and IE)
    mt.MixTubeApp.directive('mtFocusOnRender', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                var saved$render = ngModelCtrl.$render;
                ngModelCtrl.$render = function () {
                    element.focus();
                    saved$render();
                };
            }
        };
    });

    // mouse start and stop directive which are mouse move listener with debouncing for respectively leading and
    // trailing edge of the wait period defined by the related attribute "debounce"
    [
        {name: 'start', debounceParams: {leading: true, trailing: false}},
        {name: 'stop', debounceParams: {leading: false, trailing: true}}
    ].forEach(function (descriptor) {
            var directiveName = 'mtMouse' + descriptor.name;

            mt.MixTubeApp.directive(directiveName, function ($parse) {
                return function (scope, elmt, attr) {

                    var fn = $parse(attr[directiveName]);

                    // get the debounce wait value (default value if unspecified is 500ms)
                    var waitTime = parseInt(attr.debounce, 10) || 500;

                    elmt.bind('mousemove', _.debounce(function (evt) {
                        scope.$apply(function () {
                            fn(scope, {$event: evt});
                        });
                    }, waitTime, descriptor.debounceParams));
                };
            });
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