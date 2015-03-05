# mongo-views

[![Build Status](https://travis-ci.org/justinjmoses/mongo-views.svg?branch=master)](https://travis-ci.org/justinjmoses/mongo-views)

This is a MongoDB skunkworks project to enable queryable views within the shell. Views are like **virtual collections**, that can be queried as regular collections. They are comprised of queries themselves, and support db joins.

Why might you want this? Well lets say you want to save a query for regular reuse. Say you want all managers from an `employee` collection. Then you could create a view via:

```javascript
db.employees.createView('managers', { manager: true });
```

and query/sort/limit it as though it was a collection via

```
db._managers.find({ name: 'Jane' }).sort({ name: 1 }).pretty();
```

you can then create nested views via

```javascript
db._managers.createView('female_managers', { gender: 'F' });
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
db.[collection].createView(view:String, criteria:Object, projection:Object)

//or

db._[view].createView(view:String, query:Object)
```

__See all views in DB__
```javascript
show views
```

__Query__
```javascript
db._[view].find(query:Object):DBQuery
```

__Drop__
```javascript
db._[view].drop()
```

Querying
========

* Queries are composed using `$and` operators. So all query parameters in the view, along with any find criteria in the

ie. in the above example,

```javascript
db.employees.createView('managers', { manager: true });
db._managers.find({ name: /Jane/ });
```

Will result in

```javascript
db.employees.find({ manager: true, name: /Jane/ });
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

