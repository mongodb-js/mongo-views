# mongo-views
MongoDB skunkworks project to enable queryable Views within the shell

Installation
====

Symlink `index.js` to `~/.mongorc.js` or `load()` it within `.mongorc.js`

Supports
=======

Selections (saved queries)
-------------

* Creation of View
```javascript
db.[collection].createView(view:String, query:Object):DBView
```

* Querying of View (Query parameter only)
```javascript
db._[viewName].find(query:Object):DBQuery
```

> underscore is required in order to allow immediate View lookup. Workaround involves modifying shell code to be View aware.

Example
----
```javascript
db.employees.createView('managers', { manager: true });
db._managers.find({ joined: { $gt: ISODate("2012-12-19T06:01:17.171Z") } }).sort({ name: 1 }).pretty();
```

Todo
----
* Select
   * support fields in base `View`

* Persistence

* Join
    *

* Syntactic Sugar
   * `show views` (via `utils.js`)
