(function(mt) {
  'use strict';

  function SearchCtrlHelperFactory(mtKeyboardShortcutManager, mtSearchInputsRegistry) {

    var searchShown = false;
    var searchTerm = null;

    /**
     * @param {boolean=} showOrHide if not given it will toggle the visibility
     */
    function toggleSearch(showOrHide) {
      searchShown = _.isUndefined(showOrHide) ? !searchShown : showOrHide;

      if (searchShown) {
        // reset search term before showing the search input
        searchTerm = null;
        mtKeyboardShortcutManager.enterScope('search');
      } else {
        mtKeyboardShortcutManager.leaveScope('search');
      }

      mtSearchInputsRegistry('search').ready(function(searchInput) {
        searchInput.toggle(searchShown);
      });
    }

    /**
     * @name SearchCtrlHelper
     */
    var SearchCtrlHelper = {

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

    return SearchCtrlHelper;
  }

  mt.MixTubeApp.factory('SearchCtrlHelper', SearchCtrlHelperFactory);
})(mt);
