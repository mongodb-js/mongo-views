// loader for Mongo shell (dar be globals!)

// as loader has no return ability, we need a global to bind to
var __modules = {
    views: { }
};

// Note: __CURDIR is set by the Makefile to ensure module loading works relative to this path

function require(relPath) {
    'use strict';

    var moduleName = relPath.replace(/^[\.\/]+/, '');

    if (!(moduleName in __modules.views)) {
        load(__CURDIR + '/lib/' + moduleName);
    }

    return __modules.views[moduleName];
}

(function (internals) {
    'use strict';

    load(__CURDIR + '/lib/init.js');

    print('mongo-views is initiating!');

    __modules['views']['init.js'](internals);

})({ DBCollection: DBCollection, shellHelper: shellHelper, DB: DB });
