if ((typeof DBView) == "undefined") {
    DBView = function(coll, name, query) {
        this._coll = coll;
        this._name = name;
        this._query = query;
    }
}

DBView.prototype.find = function(){
    var args = [].slice.call(arguments);
    var findQuery = args.splice(0, 1)[0] || {};
    var finalQuery = {$and:[this._query, findQuery]};
    // print(this._coll + ".find(" + tojson(finalQuery) + ")");
    return(this._coll.find({$and:[this._query, findQuery]}));
}

DBCollection.prototype.createView = function(name, query) {
    return(new DBView(this, name, query));
}
