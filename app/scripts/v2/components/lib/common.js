(function (mt) {
    'use strict';

    mt.commons = {
        buildGettingDictionary: function () {
            getter._store = {};
            getter.set = function (key, value) {
                getter._store[key] = value;
            };
            getter.delete = function (key) {
                delete getter._store[key];
            };

            function getter(key) {
                if (!getter._store.hasOwnProperty(key)) {
                    return null;
                }
                return getter._store[key];
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