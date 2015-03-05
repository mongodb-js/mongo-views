// loader for Mongo shell

// as loader has no return ability, we need a global to bind to
var __modules = {
    views: { }
};

function require(relPath) {
    'use strict';

    var moduleName = relPath.replace(/^[\.\/]+/, '');

    if (!(moduleName in __modules.views)) {
        load('./lib/' + moduleName);
    }

    return __modules.views[moduleName];
}

(function (internals) {
    'use strict';

    load('./lib/init.js');

    __modules['views']['init.js'](internals);

})({ DBCollection: DBCollection, shellHelper: shellHelper, DB: DB });
