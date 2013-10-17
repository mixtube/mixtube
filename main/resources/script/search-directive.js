(function (mt) {
    'use strict';

    // We need this directive to augment the search panel because some of the action we want to do on it need a very
    // controlled sequencing to open the search on type (show -> focus the field -> fill it with the typed char).
    // This level of control is not properly achievable with Angular. However, everything that can be managed without
    // problem by Angular stays in the regular controller + template duo.
    mt.MixTubeApp.directive('mtSearch', function ($parse, mtKeyboardShortcutManager) {
        return {
            restrict: 'E',
            link: function (scope, element, attr) {

                var mtSearchOpenGet = $parse(attr.mtSearchOpen);
                var mtSearchOpenSet = mtSearchOpenGet.assign;
                if (!mtSearchOpenSet) {
                    throw Error('Non-assignable mtSearchOpen expression: ' + attr.mtSearchOpen + 'for the mtSearch directive');
                }

                var localOpenValue;
                var input = mt.tools.querySelector(element, 'input[mt-search-field]');
                if (input.length === 0) {
                    throw Error('Could not find any input element with the mt-search-field attribute required by the mtSearch directive');
                }

                function focusAndSetField(firstChar) {
                    input[0].focus();
                    input.val(firstChar);
                }

                function updateDisplay() {
                    if (localOpenValue) {
                        element.css('display', '');

                        // force the focus to stay on the search field even when the user click on something else
                        // user testing actually proved that is how users expect it to work
                        input.bind('blur', function () {
                            // we need to defer the focus operation since focusing a field on blur seems forbidden
                            _.defer(function () {
                                input[0].focus();
                            });
                        });
                    } else {
                        input.unbind('blur');
                        element.css('display', 'none');
                    }
                }

                function syncBoundOpenValue() {
                    if (localOpenValue != mtSearchOpenGet(scope)) {
                        mtSearchOpenSet(scope, localOpenValue);
                    }
                }

                scope.$watch(function ngModelWatch() {
                    var boundOpenValue = mtSearchOpenGet(scope);

                    if (localOpenValue != boundOpenValue) {

                        // the search was open before and now we are about to close it so we need to leave the context
                        if (boundOpenValue === false && localOpenValue === true) {
                            mtKeyboardShortcutManager.leaveContext('search');
                        }

                        // values are out of sync, it means that the bound open value changed and we need to update the local value
                        localOpenValue = boundOpenValue;

                        updateDisplay();
                        if (localOpenValue) {
                            focusAndSetField();
                        }
                    }
                });

                mtKeyboardShortcutManager.register('global', /\w/, function (evt) {
                    // using keypress to focus a field and filling it with the typed char works in Chrome and IE but not in FF
                    // that's why here we have to stop the default behaviour and manually set the field to the typed char
                    evt.preventDefault();

                    mtKeyboardShortcutManager.enterContext('search');

                    localOpenValue = true;
                    updateDisplay();
                    focusAndSetField(String.fromCharCode(evt.which));
                    syncBoundOpenValue();
                });

                mtKeyboardShortcutManager.register('search', 'esc', function (evt) {
                    evt.preventDefault();

                    mtKeyboardShortcutManager.leaveContext('search');

                    localOpenValue = false;
                    updateDisplay();
                    syncBoundOpenValue();
                });
            }
        }
    });
})(mt);