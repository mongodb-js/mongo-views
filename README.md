# mongo-views

This is a MongoDB skunkworks project to enable queryable views within the shell. Views are like **virtual collections**, that can be queried as regular collections. They are comprised of queries themselves, and support db joins.

Why might you want this? Well lets say you want to save a query for regular reuse. Say you want all managers from an `employee` collection. Then you could create a view via:

```javascript
db.employees.createView('managers', { manager: true });
```

and query/sort/limit it as though it was a collection via

```
db._managers.find({ dateJoined: { $gt: ISODate("2012-12-19T06:01:17.171Z") } }).sort({ name: 1 }).pretty();
```

Whenever you open the shell and go into that database, your views will be there for that database. They are virtual, and only save the state of the query used to create them. This means that each time a query is performed on a view, the latest collection data is fetched.

> underscore is required in order to allow immediate View lookup. Workaround involves modifying shell code to be view aware.

Installation
====

Symlink `index.js` to `~/.mongorc.js` or `load()` it within `.mongorc.js`

Supports
=======

Saved queries (selects)
-------------

* Creation of View
```javascript
db.[collection].createView(view:String, query:Object):DBView
```

* Querying of View (Query parameter only)
```javascript
db._[viewName].find(query:Object):DBQuery
```

* Persistence across Sessions
Views are loaded when shell is starte


Todo
----
1. Select
   * support fields in base `View`

1. Persistence
    * support for switching dbs

1. Inner Joins

1. Nice to Have
    * Create views from views

