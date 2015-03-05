# mongo-views

[![Build Status](https://travis-ci.org/justinjmoses/mongo-views.svg?branch=master)](https://travis-ci.org/justinjmoses/mongo-views)

Supports MongoDB 2.2 <= 3.0

This is a MongoDB skunkworks project to enable queryable views within the shell. Views are like **virtual collections**, that can be queried as regular collections. They are comprised of queries themselves, and support db joins.

Why might you want this? Well lets say you want to save a query for regular reuse. Say you want all managers from an `employee` collection. Then you could create a view via:

```javascript
db.employees.createView("managers", { manager: true });
```

and query/sort/limit it as though it was a collection via

```
db._managers.find({ name: "Jane" }).sort({ name: 1 }).pretty();
```

you can then create nested views via

```javascript
db._managers.createView("female_managers", { gender: "F" });
```

Whenever you open the shell and go into that database, your views will be there for that database. They are virtual, and only save the state of the query used to create them. This means that each time a query is performed on a view, the latest collection data is fetched.

> underscore is required in order to allow immediate View lookup. Workaround involves modifying shell code to be view aware.

Installation
====

* In POSIX environments, run `make`

* In WinX environments, please add `mongorc.js` to your MongoDB installation folder (if it doesn't exist) and copy the contents of `index.js` into it, amending setting the `__CURDIR` global to the full path of this mongo-views folder.

Basic Usage
=======

__Create__
```javascript
db.[collection].createView(view:String, criteria:Object, projection:Object, join:Array)

//or

db._[view].createView(view:String, query:Object)
```

__See all views in DB__
```javascript
show views
```

__Query__
```javascript
db._[view].find(criteria:Object):DBQuery
```

__Drop__
```javascript
db._[view].drop()
```

Criteria
========

* Under the hood, views composed criteria using `$and` operators. So all `criteria` parameters in the view, along with any find criteria in the `find` call, will be condensed into a single `criteria` object.

ie. in the above example,

```javascript
db.employees.createView("managers", { manager: true });
db._managers.find({ name: /Jane/ });
```

Will yield

```javascript
db.employees.find({ $and: [{ manager: true }, { name: /Jane/ }] });
```

Projection
==========

* MongoDB allows for projections in the `find` function. Fields can be enabled or disabled, either as whitelists or blacklists [see MongoDB docs](http://docs.mongodb.org/manual/tutorial/project-fields-from-query-results/#projection).

* In order to properly combine projections, we must combine the two sets in certain ways:
    1. For matched fields in both the view and the find projection, we bitwise AND them (meaning that unless they are both true, the field is off)
    2. For fields enabled in the base projection, only those enabled in the find projection will remain.
    3. For fields disabled in the base projection, all of those disabled in the find projection will be added.

Egs.

Case 1:

```javascript
db.employees.createView("managers", { manager: true }, { name: 1, id: 1 });
db._managers.find({ }, { id: 0 });
```

yields

```javascript
db.employees.find({ ... }, { name: 1, id: 0 }); // id set to 0 from 1~0
```

Case 2:

```javascript
db.employees.createView("managers", { manager: true }, { name: 1, id: 1 });
db._managers.find({ }, { name: 1 });
```

yields

```javascript
db.employees.find({ ... }, { name: 1 }); // id removed as not in find() projection
```

Case 3:

```javascript
db.employees.createView("managers", { manager: true }, { id: 0 });
db._managers.find({ }, { email: 0 });
```

yields

```javascript
db.employees.find({ ... }, { id: 0, email: 0 }); // id removed as not in find() projection
```


Join
=====

WIP.

```javascript
db.[collection].createView("name", {}, {}, [{ foreignKey: "userId", targets: [ "users": "id" ] }])
```

Proposed change
```javascript
db.[collection].createView("name", { query: {}, projection: {}, { join: [zz{ foreignKey: "userId", targets: [ target: db.users, key: "id" ] }] }})
```


Guidelines
========

* View names are unique

* Views based on dropped collections or views will be removed automatically


Supports
=======

Saved queries (selects)
-------------

* Querying of View

* Nested views (create a view from view)

* Persistence across Sessions


Todo
----

1. Persistence
    * support for switching dbs

1. Inner Joins


Run Tests
----

First time grab deps: `npm install`

Then run `npm test`

