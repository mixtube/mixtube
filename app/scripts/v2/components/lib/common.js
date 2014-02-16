(function (mt) {
    'use strict';

    mt.commons = {

        buildAsyncDictionary: function () {
            getter._store = {};
            getter._pending = {};
            getter.set = function (key, value) {
                getter._store[key] = value;

                _.defer(function () {
                    var pending = getter._pending[key];
                    if (pending) {
                        for (var idx = 0; idx < pending.length; idx++) {
                            getter._pending[key][idx](value);
                        }
                        getter._pending[key] = null;
                    }
                });

            };
            getter.delete = function (key) {
                delete getter._store[key];
            };

            function getter(key) {
                return {
                    ready: function (callback) {
                        if (!getter._store.hasOwnProperty(key)) {
                            (getter._pending[key] || (getter._pending[key] = [])).push(callback);
                        } else {
                            callback(getter._store[key]);
                        }
                    }
                };
            }

            return getter;
        },

        buildTimeString: function (date) {
            var dateParts = [date.getHours(), date.getMinutes(), date.getSeconds()];
            var dateStringBuffer = [];

            for (var idx = 0; idx < dateParts.length; idx++) {
                var dateStringPart = dateParts[idx].toString();
                if (dateStringPart.length < 2) {
                    dateStringPart = '0' + dateStringPart;
                }
                dateStringBuffer.push(dateStringPart);
            }

            return dateStringBuffer.join(':');
        }
    };
})(mt);