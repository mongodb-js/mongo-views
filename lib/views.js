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
    var db = config.getCurrentDb;

    // create global DBView constructor
    var DBView = function(target, name, query, projection) {
        this._target = target;
        this._name = name;
        this._query = query;
        this._projection = projection;
    };

    // class-level factory
    DBView.instantiate = function (target, name, query, projection, join) {

        var view = new DBView(target, name, query, projection);

        if (join !== undefined) {
            // TODO: clean up temporary collection at some point --CWS
            if (!(join instanceof Array)) {
                join = [join];
            }
            var tmpCollName;
            for (var j in join) {
                // There's another join ahead of us, make it use this temp collection.
                if (join[Number(j) + 1] !== undefined) {
                    tmpCollName = '__tmp' + j;
                    join[Number(j) + 1].srcCollName = tmpCollName;
                } else { // This is the last one, write it into a collection to match the name
                    tmpCollName = '__' + name;
                }
                var newArgs = [tmpCollName, {query: query, join: join[j]}];
                makeTempJoinCollection.apply(target, newArgs);
            }
            // Override find in this case to query the temporary collection
            // TODO: what about drop? --CWS
            view.find = function() {
                var mArgs = this._mergeFindArgs(arguments);

                var finalArgs = [mArgs.query, mArgs.projection].concat(mArgs.leftoverArgs);

                // return the find prototype with the merged query
                return db().getCollection(tmpCollName).find(finalArgs);
            };

        }

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
        if (typeof name !== 'string' || (('_' + name) in db)) {
            return { errmsg: 'invalid namespace', code: 73, ok : 0 };
        }

        // Note: duplication prevention redundant as underscore workaround prevents dupes --JJM

        DBView.instantiate(this, name, query, projection, join);

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

    DBView.prototype._mergeFindArgs = function() {
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

        return {query: finalQuery, projection: finalProjection, leftoverArgs: args};
    };

    // handle view.find() by
    DBView.prototype.find = function(){
        var mergedArgs = this._mergeFindArgs(arguments);

        var finalArgs = [mergedArgs.query, mergedArgs.projection].concat(mergedArgs.leftoverArgs);
        // return the find prototype with the merged query
        return this._target.find.apply(this._target, finalArgs);
    };

    // handle removal of views
    DBView.prototype.drop = function () {
        // delete local reference
        delete db()['_' + this._name];

        return db().getCollection(config.VIEWS_COLLECTION_NAME).remove({ name: this._name });
    };

    // --------------------- HELPERS RELATED TO VIEWS ---------------------------
    function isCollectionOrView(name) {
        //TODO: actual logic, or use exists --CWS
        return true;
    }

    // Sanity checks on arguments to join.
    function validateJoinArgs(name, joinParams) {

        if (!joinParams.hasOwnProperty('foreignKey')) {
            throw Error('No foreignKey attribute specified for the join');
        }

        if (!joinParams.hasOwnProperty('targets')) {
            throw Error('No targets attribute specified for the join');
        } else if (!(joinParams.targets instanceof Array) || joinParams.targets.length < 1) {
            throw Error('targets argument to join must be an array with at least one element.');
        } else {
            for (var i in joinParams.targets) {
                var target = joinParams.targets[i];
                if (typeof(target) !== 'object') {
                    throw Error('targets argument to join must contain objects');
                } else if (Object.keys(target).length !== 1) {
                    throw Error('elements in targets argument must contain exactly one key');
                } else if (!isCollectionOrView(target[Object.keys(target)[0]])) {
                    throw Error('elements in targets must have a key which is the name of an existing collection or view');
                }
            }
        }
    }

    function mergeIntoCollection(coll, totalJoins, cursors, joinKeys, collNames, topDocs) {
        // topDocs is an optional parameter, only used when recursing.
        // assert.eq(cursors.length, joinKeys.length);
        // Base case, only one non-exhausted cursor left, there can't be anything to merge
        if (cursors.length <= 1) {
            return;
        }

        // Helpers to make following code shorter and more readable
        var map = function(mapper, array) {
            var res = [];
            for (var i in array) {
                res.push(mapper(i, array[i]));
            }
            return res;
        };
        var min = function(array) {
            // Assume there is at least one element
            // assert.gt(array.length, 0);
            var min = array[0];
            for (var i = 1; i < array.length; i++) {
                if (array[i] < min) {
                    min = array[i];
                }
            }
            return min;
        };
        var haveMoreData = function haveMore(cursors, topDocs) {
            topDocs = topDocs || [];
            for (var i in cursors) {
                if (!cursors[i].hasNext() && topDocs[i] === undefined) {
                    return false;
                }
            }
            return true;
        };
        var recurseWithNonExhaustedCursors = function recurse(topDocs) {
            // Take out any cursors with no results left
            // Note some cursors may be exhausted, but still have an unmerged doc, which will be
            // present in topDocs.
            topDocs = topDocs || [];
            var newCursors = [];
            var newJoinKeys = [];
            var newTopDocs = [];
            for (var i in cursors) {
                if (cursors[i].hasNext() || topDocs[i] !== undefined) {
                    newCursors.push(cursors[i]);
                    newJoinKeys.push(joinKeys[i]);
                    newTopDocs.push(topDocs[i]);
                }
            }
            if (newCursors.length > 0 && newTopDocs[0] !== undefined) {
                // recurse with only those with results left
                mergeIntoCollection(coll, totalJoins, newCursors, newJoinKeys, collNames, newTopDocs);
            }
        };
        // End helpers

        // Really could only happen the first time, if they join on an empty view/collection
        if (topDocs === undefined && !haveMoreData(cursors, topDocs)) {
            recurseWithNonExhaustedCursors();
        }

        // This represents the most recent doc to come out of each cursor.
        // When recursing, we need to conserve this information
        if (topDocs === undefined) {
            topDocs = map(function(i, cur) { return cur.next(); }, cursors);
        }

        var extractMergeKeyMapper = function(i, doc) { return doc[joinKeys[i]]; };

        while (haveMoreData(cursors, topDocs)) {
            // Get the next smallest value, so we can look for docs with that value
            var minSortVal = min(map(extractMergeKeyMapper, topDocs));
            var toMerge = [];
            // Extract all docs which have the minimum value, advancing the corresponding cursors.
            for (var j in topDocs) {
                var topDoc = topDocs[j];
                if (topDoc[joinKeys[j]] == minSortVal) {
                    topDocs[j] = undefined;
                    // We haven't required the merge keys to be unique, so it's possible one
                    // view/collection will have multiple docs with that value. If so, we'll need
                    // to merge them all.
                    var matchingFromThisCursor = {key: joinKeys[j],
                                                  collName: collNames[j],
                                                  docs: [topDoc]};
                    while (cursors[j].hasNext()) {
                        var nextDoc = cursors[j].next();
                        topDocs[j] = nextDoc;
                        if (nextDoc[joinKeys[j]] == minSortVal) {
                            matchingFromThisCursor.docs.push(nextDoc);
                            topDocs[j] = undefined;
                        } else {
                            break; // Stop iterating this cursor once we run out of matching docs.
                        }
                    }
                    toMerge.push(matchingFromThisCursor);
                }
            }
            // There are at least two docs with the same merge key, merge them.
            while (toMerge.length === totalJoins) {
                var mergedResults = {key: toMerge[0].key, docs: []};
                // Add all docs in the cross product.
                for (var k in toMerge[0].docs) {
                    var outerDoc = toMerge[0].docs[k];
                    for (var ii in toMerge[1].docs) {
                        var newDoc = {};
                        for (var okey in outerDoc) {
                            if (okey === '_id' && mergedResults.key != '_id' &&
                                toMerge[0].hasOwnProperty('collName') &&
                                !toMerge[0].collName.startsWith('__tmp')) {
                                newDoc._id = {};
                                newDoc._id[toMerge[0].collName] = outerDoc._id;
                            } else {
                                newDoc[okey] = outerDoc[okey];
                            }
                        }
                        var innerDoc = toMerge[1].docs[ii];
                        for (var ikey in innerDoc) {
                            if (ikey === '_id' && mergedResults.key != '_id') {
                                newDoc._id[toMerge[1].collName] = innerDoc._id;
                            }
                            else if (ikey != toMerge[1].key) {
                                newDoc[ikey] = innerDoc[ikey];
                            }
                        }
                        mergedResults.docs.push(newDoc);
                    }
                }
                // Replace the first two with the merged results
                toMerge = [mergedResults].concat(toMerge.slice(2, toMerge.length));
                // If we've merged all of them, insert the results.
                if (toMerge.length === 1) {
                    for (var jj in mergedResults.docs) {
                        // TODO: bulk insert
                        coll.insert(mergedResults.docs[jj]);
                    }
                }
            }
        }
        // At least one cursor has been exhausted
        recurseWithNonExhaustedCursors(topDocs);
    }

    // Helper to make a temporary collection to support querying joins.
    function makeTempJoinCollection(name, params) {

        var joinParams = params.join;
        var srcColl = joinParams.srcCollName ? db().getCollection(joinParams.srcCollName) : this;

        validateJoinArgs(name, joinParams);

        // Build array of cursors that we will iterate over to join, and one of the join key names.
        var cursors = [];
        var joinKeys = [];
        var collNames = [];
        var keySort = {};
        keySort[joinParams.foreignKey] = 1;
        cursors.push(srcColl.find().sort(keySort));
        joinKeys.push(joinParams.foreignKey);
        collNames.push(srcColl.getName());
        for (var i in joinParams.targets) {
            var target = joinParams.targets[i];
            var targetName = Object.keys(target)[0];
            keySort = {};
            keySort[targetName] = 1;
            if (db()['_' + targetName]) {
                cursors.push(db()['_' + targetName].find().sort(keySort));
            } else {
                cursors.push(db()[targetName].find().sort(keySort));
            }
            joinKeys.push(target[targetName]);
            collNames.push(targetName);
        }

        var coll = db().getCollection(name);
        mergeIntoCollection(coll, cursors.length, cursors, joinKeys, collNames);
        if (joinParams.srcCollName) {  // This was a temp collection
            srcColl.drop();
        }
    }

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
