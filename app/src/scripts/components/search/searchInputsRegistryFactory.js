'use strict';

// @ngInject
function searchInputsRegistryFactory(asyncRegistryFactory) {
  return asyncRegistryFactory('SearchInputs');
}

module.exports = searchInputsRegistryFactory;
