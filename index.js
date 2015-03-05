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
            return shellHelperShow.apply(null, [].slice.call(arguments));
        }
    };

    if (typeof DBView === 'undefined') {

        // create global DBView constructor
        DBView = function(target, name, query) {
            this._target = target;
            this._name = name;
            this._query = query;
        };
    }

    function getViewFromStore (name) {
        return db.getCollection(VIEWS_COLLECTION_NAME).findOne({ name: name });
    }

    var getViewByName = DB.prototype.getView = function(name) {
        var doc = getViewFromStore(name);
        if (doc) {
            return new DBView(getTargetByName(doc.target), doc.name, JSON.parse(doc.query));
        }
    };

    // return a target (Collection or View) by name
    function getTargetByName(name) {
        var collection = db.getCollection(name);
        // if a collection
        if (collection.exists()) {
            return db.getCollection(name);
        // or if a view exists
        } else if (getViewFromStore(name)) {
            return getViewByName(name);
        }
    }

    function instantiateView(target, name, query) {
        var view = new DBView(target, name, query);
        db['_' + name] = view;
        return view;
    }

    (function () {
        // load any existing views on session start
        // TODO - should occur when db is switched/loaded
        if (db.getCollection(VIEWS_COLLECTION_NAME).exists()) {

            var view;

            // grab the views
            var cursor = db.getCollection(VIEWS_COLLECTION_NAME).find();

            while (cursor.hasNext()) {

                var doc = cursor.next();

                var target = getTargetByName(doc.target);

                if (target) {

                    instantiateView(target, doc.name, JSON.parse(doc.query));

                // otherwise, if target cannot be found (likely dropped)
                } else {
                    // remove this view
                    db.getCollection(VIEWS_COLLECTION_NAME).remove(doc);
                }
            }

        } else {
            // ensure unique index on name
            db.getCollection(VIEWS_COLLECTION_NAME).createIndex({ name: 1 }, { unique: true });
        }

    })();

    DBView.prototype.exists = function () {
        return db.getCollection(VIEWS_COLLECTION_NAME).find({ name: this.getName() }).itcount() > 0;
    };

    // DBView.prototype.getDb = function () {

    // };

    // support for createView function
    internal.DBCollection.prototype.createView = DBView.prototype.createView = function(name, query) {

        // Note: duplication prevention redundant as underscore workaround prevents dupes --JJM

        instantiateView(this, name, query);

        // persist
        return db.getCollection(VIEWS_COLLECTION_NAME).insert(
            {
                name: name,
                target: this.getName(),
                query: JSON.stringify(query)
            }
        );
    };

    DBView.prototype.getName = function () {
        return this._name;
    };

    DBView.prototype.toString = DBView.prototype.tojson = DBView.prototype.shellPrint = function () {
        return this._name;
    };

    // handle view.find() by
    DBView.prototype.find = function(){

        // transforming arguments
        var args = [].slice.call(arguments);

        // get the first parameter, the find's query
        var findQuery = args.splice(0, 1)[0] || {};

        // create a new $and query combining the View query with the find's query
        var finalQuery = { $and: [this._query, findQuery] };

        // return the find with the merged query
        return this._target.find(finalQuery);
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

})({ DBCollection: DBCollection, shellHelper: shellHelper, DB: DB });

