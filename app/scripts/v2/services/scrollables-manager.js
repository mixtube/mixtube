(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtScrollablesManager', function () {

        var store = {};

        function scrollablesAccessor(name) {
            if (!(name in store)) {
                throw new Error('The given scrollable name (' + name + ') doesn\'t match any registered scrollable');
            }

            return {
                putInViewPort: function (target) {
                    store[name].putInViewPort(target);
                }
            };
        }

        scrollablesAccessor.register = function (name, handler) {
            store[name] = handler;
        };

        scrollablesAccessor.unregister = function (name) {
            delete store[name];
        };

        return scrollablesAccessor;
    });

})(mt);