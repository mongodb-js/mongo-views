print('mongo-views is initiating!');

if ((typeof DBView) == "undefined") {
    DBView = function(coll, name, query) {
        this._coll = coll;
        this._name = name;
        this._query = query;
    };
}

DBView.prototype.find = function(){
    var args = [].slice.call(arguments);
    var findQuery = args.splice(0, 1)[0] || {};
    var finalQuery = { $and: [this._query, findQuery] };

    // print(this._coll + ".find(" + tojson(finalQuery) + ")");

    return DBCollection.prototype.find.call(this._coll, finalQuery)
};

DBCollection.prototype.createView = function(name, query) {
    return(new DBView(this, name, query));
};
