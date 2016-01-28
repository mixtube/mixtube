'use strict';

var angular = require('angular');

// brfs requires this to be on its own line
var fs = require('fs');

// @ngInject
function spinnerDirective() {

  return {
    restrict: 'E',
    template: fs.readFileSync(__dirname + '/spinner.svg', 'utf8')
  };
}

module.exports = spinnerDirective;