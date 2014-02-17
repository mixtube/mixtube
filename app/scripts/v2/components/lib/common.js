(function (mt) {
    'use strict';

    mt.commons = {

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