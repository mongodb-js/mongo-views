print('mongo-views is initiating!');

// setup views helper instance
if (typeof dbv === 'undefined') {
    dbv = { };
}

// track original show functionality
var shellHelperShow = shellHelper.show;

// now overload show
shellHelper.show = function (what) {
    // to support views'
    if (what === 'views') {
        Object.keys(dbv).forEach(function (x) { print(x); });
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
DBCollection.prototype.createView = function(name, query) {
    dbv[name] = new DBView(this, name, query);

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


