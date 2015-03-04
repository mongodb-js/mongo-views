// note: db is a reference, that we cannot pass through

(function (internal) {
    'use strict';

    print('mongo-views is initiating!');

    var views, DBView;

    // setup views helper instance
    views = { };

    // track original show functionality
    var shellHelperShow = internal.shellHelper.show;

    // now overload show
    internal.shellHelper.show = function (what) {
        // to support views'
        if (what === 'views') {
            Object.keys(views[db.getName()] || {}).forEach(function (x) { print(x); });
            return '';
        } else {
            return shellHelperShow.apply(this, [].slice.call(arguments));
        }
    };

    if (typeof DBView === 'undefined') {

        // create global DBView constructor
        DBView = function(coll, name, query) {
            this._coll = coll;
            this._name = name;
            this._query = query;
        };
    }

    // support for createView function
    internal.DBCollection.prototype.createView = function(name, query) {

        // prevent dupes
        // Note: commented out as underscore workaround prevents dupes --JJM

        // var collections = db.getCollectionNames();
        // assert(collections.indexOf(name), 'view cannot have the name of an existing collection');

        var view = new DBView(this, name, query);

        views[db.getName()] = views[db.getName()] || {};

        views[db.getName()][name] = view;

        db['_' + name] = view;

        return { ok: 1 };
    };

    // handle view.find() by
    DBView.prototype.find = function(){

        // transforming arguments
        var args = [].slice.call(arguments);

        // get the first parameter, the find's query
        var findQuery = args.splice(0, 1)[0] || {};

        // create a new $and query combining the View query with the find's query
        var finalQuery = { $and: [this._query, findQuery] };

        // return the find prototype with the merged query
        return DBCollection.prototype.find.call(this._coll, finalQuery);
    };

})({ DBCollection: DBCollection, shellHelper: shellHelper });

