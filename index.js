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

    //  Return true iff object has any properties with the given value
    function hasPropertiesWithValue(object, value) {
        for (prop in object) {
           if (object[prop] == value) return true;
        }
        return false;
    }

    //  Merge projections of first, followed by a projection of second
    function mergeProjections(first, second) {
        var projection = {}
        if (hasPropertiesWithValue(first, 1)) {
            if (hasPropertiesWithValue(second, 1)) {
                //  Only include fields included in both first and second
                for (field in first) {
                    if (second[field]) {
                        projection[field] = 1;
                    }
                }
            }
            else if (hasPropertiesWithValue(second, 0)) {
                //  Include properties from first that are not excluded in second
                for (field in first) {
                    if (!(second[field] == 0)) {
                        projection[field] = 1;
                    }
                }
            }
        }
        else if (hasPropertiesWithValue(first, 0)) {
            if (hasPropertiesWithValue(second, 0)) {
                // Exclude properties that are excluded in either first or second
                for (field in first) {
                    projection[field] = 0;
                }
                for (field in second) {
                    projection[field] = 0;
                }
            }
            else if (hasPropertiesWithValue(second, 1)) {
                // Include properties from second that are not excluded in first
                for (field in second) {
                    if (!(first[field] == 0)) {
                        projection[field] = 1;
                    }
                }
            }
        }
        return projection;
    }

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

