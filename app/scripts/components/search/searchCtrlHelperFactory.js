'use strict';

var isUndefined = require('lodash/lang/isUndefined');

// @ngInject
function searchCtrlHelperFactory($window, $document, keyboardShortcutManager, searchInputsRegistry) {

  var searchShown = false;
  var searchTerm = null;

  // copied from https://css-tricks.com/making-sass-talk-to-javascript-with-json/
  var REGEXP_CSS_CONTENT_QUOTES = /^['"]+|\s+|\\|(;\s?})+|['"]$/g;

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

    get resultsLayoutInfo() {
      var contentValue = $window.getComputedStyle(
        $document[0].querySelector('.mt-js-results'), ':before').getPropertyValue('content');

      return JSON.parse(contentValue.replace(REGEXP_CSS_CONTENT_QUOTES, ''));
    },

    toggleSearch: toggleSearch
  };

  return searchCtrlHelper;
}

module.exports = searchCtrlHelperFactory;
