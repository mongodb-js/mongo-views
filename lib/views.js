(function (factory) {
    'use strict';

    // node
    if (module && 'exports' in module) {
        module.exports = factory();

    // mongo shell
    } else {
        __modules['views']['views.js'] = factory();
    }

})(function () {
    'use strict';

    var config = require('./config.js');
    var db = function () {
       return config.getCurrentDb();
    }

    // create global DBView constructor
    var DBView = function(target, name, query, projection) {
        this._target = target;
        this._name = name;
        this._query = query;
        this._projection = projection;
    };

    // class-level factory
    DBView.instantiate = function (target, name, query, projection) {
        var view = new DBView(target, name, query, projection);
        db()['_' + name] = view;
        return view;
    };

    // Any instantiated View will always exist by definition
    DBView.prototype.exists = function () {
        return !!db().getCollection(config.VIEWS_COLLECTION_NAME).findOne({ name: this.getName() });
    };

    // recurse up target tree to determine database
    DBView.prototype.getDB = function () {
        return this._target.getDB();
    };

    // support for createView function
    DBView.prototype.createView = function(name, query, projection) {

        // Avoid conflicts with predefined db._xxx properties
        if (typeof name !== 'string' || (('_' + name) in db())) {
            return { errmsg: 'invalid namespace', code: 73, ok : 0 };
        }

        // Note: duplication prevention redundant as underscore workaround prevents dupes --JJM

        DBView.instantiate(this, name, query, projection);

        // persist
        return db().getCollection(config.VIEWS_COLLECTION_NAME).insert(
            {
                name: name,
                target: this.getName(),
                query: JSON.stringify(query),
                projection: JSON.stringify(projection)
            }
        );
    };

    DBView.prototype.getName = function () {
        return this._name;
    };

    DBView.prototype.toString = DBView.prototype.tojson = DBView.prototype.shellPrint = function () {
        return this.getDB().toString() + '.' + this._name + ' (view)';
    };

    // handle view.find() by
    DBView.prototype.find = function(){

        // transforming arguments
        var args = [].slice.call(arguments);

        // get the first parameter, the find's query
        var findQuery = args.splice(0, 1)[0] || {};

        // create a new $and query combining the View query with the find's query
        var finalQuery = { $and: [this._query, findQuery] };

        // get the second parameter, the find's projection
        var findProjection = args.splice(0, 1)[0] || {};

        // create a new projection, combining the View projection with the find's projection
        var finalProjection = mergeProjections(this._projection, findProjection);

        // return the find prototype with the merged query
        return this._target.find.apply(this._target, [finalQuery, finalProjection].concat(args));
    };

    // handle removal of views
    DBView.prototype.drop = function () {
        // delete local reference
        delete db()['_' + this._name];

        return db().getCollection(config.VIEWS_COLLECTION_NAME).remove({ name: this._name });
    };

    // TODO refactor

    //  Return true iff object has any properties with the given value
    function hasPropertiesWithValue(object, value) {
        for (var prop in object) {
           if (object[prop] == value) return true;
        }
        return false;
    }

    //  Merge projections of first, followed by a projection of second
    function mergeProjections(first, second) {
        var projection = {}, field;
        if (hasPropertiesWithValue(first, 1)) {
            if (hasPropertiesWithValue(second, 1)) {
                //  Only include fields included in both first and second
                for (field in first) {
                    if (second[field]) {
                        projection[field] = 1;
                    }
                }
            }
            else {
                //  Include properties from first that are not excluded in second
                for (field in first) {
                    if (second[field] !== 0) {
                        projection[field] = 1;
                    }
                }
            }
        }
        else {
            if (hasPropertiesWithValue(second, 1)) {
                // Include properties from second that are not excluded in first
                for (field in second) {
                    if (first[field] !== 0) {
                        projection[field] = 1;
                    }
                }
            }
            else {
                // Exclude properties that are excluded in either first or second
                for (field in first) {
                    projection[field] = 0;
                }
                for (field in second) {
                    projection[field] = 0;
                }
            }
        }
        return projection;
    }

    return DBView;
});
