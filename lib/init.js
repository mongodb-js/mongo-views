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

    var deserializer = require('./deserializer.js');
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

    // track original use functionality
    var shellHelperUse = internal.shellHelper.use;

    // now overload use
    internal.shellHelper.use = function () {
        // Switch databases
        shellHelperUse.apply(null, [].slice.call(arguments));
        loadViewsInDB();
    };

    function getViewFromStore (name) {
        return db().getCollection(config.VIEWS_COLLECTION_NAME).findOne({ name: name });
    }

    var getViewByName = internal.DB.prototype.getView = function(name) {
        var doc = getViewFromStore(name);
        if (doc) {
            return new DBView(getTargetByName(doc.target), doc.name, deserializer(doc.query), JSON.parse(doc.projection), deserializeJoin(doc.join));
        }
    };

    function deserializeJoin(join) {
        if (join !== '{}') {
            // load up the join target
            join = JSON.parse(join);

            // Note: this assumes join target is in the same DB

            // and mutate it to contain a real target instance
            return Object.extend(join, { target: getTargetByName(join.target) });
        }
    }

    // return a target (Collection or View) by name
    function getTargetByName(name) {
        var collection = db().getCollection(name);
        // if a collection
        if (collection.exists()) {
            return collection;
        // or if a view exists
        } else if (getViewFromStore(name)) {
            return getViewByName(name);
        }
    }

    // support for createView function
    internal.DBCollection.prototype.createView = DBView.prototype.createView;

    function loadViewsInDB() {
        if (db().getCollection(config.VIEWS_COLLECTION_NAME).exists()) {

            // grab the views
            var cursor = db().getCollection(config.VIEWS_COLLECTION_NAME).find();

            while (cursor.hasNext()) {

                var doc = cursor.next();

                try {
                    var target = getTargetByName(doc.target);

                    var join = deserializeJoin(doc.join);

                    if (target) {

                        DBView.instantiate(target,
                                           doc.name,
                                           deserializer(doc.query),
                                           JSON.parse(doc.projection),
                                           join);

                    // otherwise, if target cannot be found (likely dropped)
                    } else {
                        // remove this view
                        db().getCollection(config.VIEWS_COLLECTION_NAME).remove(doc);
                    }
                } catch (err) {
                    print('Error while loading view: ' + doc.name);
                }
            }

        } else {
            // ensure unique index on name
            db().getCollection(config.VIEWS_COLLECTION_NAME).createIndex({ name: 1 }, { unique: true });
        }
    }

    // load any existing views on session start
    loadViewsInDB();

});
