(function (mt) {
    'use strict';

    mt.MixTubeApp.factory('mtDirectivesRegistryHelper', function () {

        return {
            install: function (facade, registry, directiveName, directiveScope, directiveAttrs) {
                var name = directiveAttrs[directiveName];
                if (!name || name.trim().length === 0) {
                    throw new Error(directiveName + ' expected a non empty string as name value');
                }
                registry.register(name, facade);
                directiveScope.$on('$destroy', function () {
                    registry.unregister(name);
                });
            }
        };
    });

})(mt);