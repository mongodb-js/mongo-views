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
    };

    // create global DBView constructor
    var DBView = function(target, name, query, projection, join) {
        this._target = target;
        this._name = name;
        this._query = query;
        this._projection = projection;
        this._join = join;
    };

    // class-level factory
    DBView.instantiate = function (target, name, query, projection, join) {

        var view = new DBView(target, name, query, projection, join);
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
    DBView.prototype.createView = function(name, query, projection, join) {

        // Avoid conflicts with predefined db._xxx properties
        if (typeof name !== 'string' || (('_' + name) in db())) {
            return { errmsg: 'invalid namespace', code: 73, ok : 0 };
        }

        // Note: duplication prevention redundant as underscore workaround prevents dupes --JJM
        // However, duplicates will prevent issues when

        DBView.instantiate(this, name, query, projection, join);

        // persist
        return db().getCollection(config.VIEWS_COLLECTION_NAME).insert(
            {
                name: name,
                target: this.getName(),
                query: JSON.stringify(query),
                projection: JSON.stringify(projection),
                join: JSON.stringify(join ? Object.extend(Object.extend({}, join), { target: join.target.getName() }) : {})
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

        var target, tmpCollection;

        // if join exists
        if (this._join) {

            // create a temp collection
            target = tmpCollection = createTempCollection(this._target, this._join.target, this._join.from, this._join.to);

        } else {

            // otherwise use the view's target
            target = this._target;
        }

        // return the find prototype with the merged query
        var result = target.find.apply(target, [finalQuery, finalProjection].concat(args));

        // when tmpCollection exists
        if (tmpCollection) {
            // and cursor is exhausted
            var originalHasNext = result.hasNext;
            result.hasNext = function () {

                // then remove the temp collection
                return originalHasNext.call(result) ? true : tmpCollection.drop() && false;
            };
        }

        return result;
    };

    DBView.prototype.inspect = function () {
        var doc = db().getCollection(config.VIEWS_COLLECTION_NAME).findOne({ name: this.getName() });

        return {
            name: doc.name,
            target: doc.target,
            query: JSON.parse(doc.query),
            projection: JSON.parse(doc.projection),
            join: JSON.parse(doc.join)
        };
    };

    // in memory (could be very expensive)
    function createTempCollection(from, to, fromKey, toKey) {

        // refine from results to documents with the
        var fromQuery = {};
        fromQuery[fromKey] = { $exists: true };

        // toArray() makes this in memory, and could be expensive
        var fromResults = from.find(fromQuery).toArray();

        var toCursor = to.find();

        var toObj = {};

        // create cache (assumes unique 'to' key)
        while (toCursor.hasNext()) {
            var doc = toCursor.next();
            toObj[doc[toKey]] = doc;
        }

        var tmpCollection = db().getCollection('__' + new Date().getTime());

        tmpCollection.insert(fromResults.map(function (fromDoc) {
            // extract ids
            var newId = Object.extend({ _id: { from: fromDoc._id, to: toObj[fromDoc[fromKey]]._id } });

            var toDoc = toObj[fromDoc[fromKey]];

            for (var prop in toDoc) {
                // naming clash
                if (prop === '_id') {
                    continue;
                // naming clash
                } else if (prop in fromDoc) {
                    fromDoc[from.getName() + '_' + prop] = fromDoc[prop];
                    fromDoc[to.getName() + '_' + prop] = toDoc[prop];
                    delete fromDoc[prop];
                } else {
                    fromDoc[prop] = toDoc[prop];
                }
            }
            return Object.extend(fromDoc, newId);
        }));

        return tmpCollection;
    }

    // handle removal of views
    DBView.prototype.drop = function () {
        // delete local reference
        delete db()['_' + this._name];

        // delete db reference
        return db().getCollection(config.VIEWS_COLLECTION_NAME).remove({ name: this._name });
    };

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
