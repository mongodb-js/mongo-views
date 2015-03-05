// note: db is a reference, that we cannot pass through, so use it as a global

(function (internal) {
    'use strict';

    print('mongo-views is initiating!');

    var VIEWS_COLLECTION_NAME = '__views';

    var DBView;

    // track original show functionality
    var shellHelperShow = internal.shellHelper.show;

    // now overload show
    internal.shellHelper.show = function (what) {
        // to support views'
        if (what === 'views') {
            var cursor = db.getCollection(VIEWS_COLLECTION_NAME).find();
            while (cursor.hasNext()) {
                print(cursor.next().name);
            }
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

    function addViewToDb(db, name, view) {
        db['_' + name] = view;
        return view;
    }

    // load any existing views on session start
    // TODO - should occur when db is switched/loaded
    if (db.getCollection(VIEWS_COLLECTION_NAME).exists()) {

        var cursor = db.getCollection(VIEWS_COLLECTION_NAME).find();
        while (cursor.hasNext()) {
            var doc = cursor.next();
            var query = JSON.parse(doc.query);
            var view = new DBView(db.getCollection(doc.collection), doc.name, query);
            addViewToDb(db, doc.name, view);
        }

    } else {
        // ensure unique index on name
        db.getCollection(VIEWS_COLLECTION_NAME).createIndex({ name: 1 }, { unique: true });
    }

    // support for createView function
    internal.DBCollection.prototype.createView = function(name, query) {

        // Note: duplication prevention redundant as underscore workaround prevents dupes --JJM

        var view = new DBView(this, name, query);

        // track in session
        addViewToDb(db, name, view);

        // persist
        var result = db.getCollection(VIEWS_COLLECTION_NAME).insert(
            {
                collection: this.getName(),
                name: name,
                query: JSON.stringify(query)
            }
        );

        return result;
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

    // handle removal of views
    DBView.prototype.drop = function () {
        // delete local reference
        delete db['_' + this._name];

        return db.getCollection(VIEWS_COLLECTION_NAME).remove({ name: this._name });
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
            else if (hasPropertiesWithValue(second, 0)) {
                //  Include properties from first that are not excluded in second
                for (field in first) {
                    if (second[field] !== 0) {
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
                    if (first[field] !== 0) {
                        projection[field] = 1;
                    }
                }
            }
        }
        return projection;
    }

})({ DBCollection: DBCollection, shellHelper: shellHelper });

