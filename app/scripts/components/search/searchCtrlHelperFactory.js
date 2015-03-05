'use strict';

var isUndefined = require('lodash/lang/isUndefined');

// @ngInject
function searchCtrlHelperFactory(keyboardShortcutManager, searchInputsRegistry) {

  var searchShown = false;
  var searchTerm = null;

  /**
   * @param {boolean=} showOrHide if not given it will toggle the visibility
   */
  function toggleSearch(showOrHide) {
    searchShown = isUndefined(showOrHide) ? !searchShown : showOrHide;

    if (searchShown) {
      // reset search term before showing the search input
      searchTerm = null;
      keyboardShortcutManager.enterScope('search');
    } else {
      keyboardShortcutManager.leaveScope('search');
    }

    searchInputsRegistry('search').ready(function(searchInput) {
      searchInput.toggle(searchShown);
    });
  }

  /**
   * @name searchCtrlHelper
   */
  var searchCtrlHelper = {

    get searchShown() {
      return searchShown;
    },

    get searchTerm() {
      return searchTerm;
    },

    set searchTerm(value) {
      searchTerm = value;
    },

    toggleSearch: toggleSearch
  };

  return searchCtrlHelper;
}

module.exports = searchCtrlHelperFactory;
