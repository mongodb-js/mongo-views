(function (factory) {
    'use strict';

    // node
    if (module && 'exports' in module) {
        module.exports = factory;

    // mongo shell
    } else {
        __modules['views']['init.js'] = factory;
    }

})(function (internal) {
    'use strict';

    print('mongo-views is initiating!');

    var config = require('./config.js');
    var db = config.getCurrentDb;

    var DBView = require('./views.js');


    // track original show functionality
    var shellHelperShow = internal.shellHelper.show;

    // now overload show
    internal.shellHelper.show = function (what) {
        // to support views'
        if (what === 'views') {
            var cursor = db().getCollection(config.VIEWS_COLLECTION_NAME).find();
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
        DBView = function(target, name, query, projection) {
            this._target = target;
            this._name = name;
            this._query = query;
            this._projection = projection;
        };
    }

    function getViewFromStore (name) {
        return db().getCollection(config.VIEWS_COLLECTION_NAME).findOne({ name: name });
    }

    var getViewByName = internal.DB.prototype.getView = function(name) {
        var doc = getViewFromStore(name);
        if (doc) {
            return new DBView(getTargetByName(doc.target), doc.name, JSON.parse(doc.query));
        }
    };

    // return a target (Collection or View) by name
    function getTargetByName(name) {
        var collection = db().getCollection(name);
        // if a collection
        if (collection.exists()) {
            return db().getCollection(name);
        // or if a view exists
        } else if (getViewFromStore(name)) {
            return getViewByName(name);
        }
    }

    (function () {
        // load any existing views on session start
        // TODO - should occur when db is switched/loaded
        if (db().getCollection(config.VIEWS_COLLECTION_NAME).exists()) {

            // grab the views
            var cursor = db().getCollection(config.VIEWS_COLLECTION_NAME).find();

            while (cursor.hasNext()) {

                var doc = cursor.next();

                var target = getTargetByName(doc.target);

                if (target) {

                    try {
                        DBView.instantiate(target, doc.name, JSON.parse(doc.query), JSON.parse(doc.projection));
                    } catch (err) {
                        print('Error while loading view: ' + doc.name);
                    }

                // otherwise, if target cannot be found (likely dropped)
                } else {
                    // remove this view
                    db().getCollection(config.VIEWS_COLLECTION_NAME).remove(doc);
                }
            }

        } else {
            // ensure unique index on name
            db().getCollection(config.VIEWS_COLLECTION_NAME).createIndex({ name: 1 }, { unique: true });
        }

    })();

    // support for createView function
    internal.DBCollection.prototype.createView = DBView.prototype.createView;

});
