print('mongo-views is initiating!');

if (typeof dbv === 'undefined') {
    dbv = { };
}

if (typeof DBView === 'undefined') {
    DBView = function(coll, name, query) {
        this._coll = coll;
        this._name = name;
        this._query = query;
    };
}

DBView.prototype.find = function(){
    // transform arguments
    var args = [].slice.call(arguments);

    // get the first parameter, the find's query
    var findQuery = args.splice(0, 1)[0] || {};

    // create a new $and query combining the View query with the find's query
    var finalQuery = { $and: [this._query, findQuery] };

    // return the find prototype with the merged query
    return DBCollection.prototype.find.call(this._coll, finalQuery);
};

DBCollection.prototype.createView = function(name, query) {
    dbv[name] = new DBView(this, name, query);

    return { ok: 1 };
};
