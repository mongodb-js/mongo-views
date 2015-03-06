# mongo-views

[![Build Status](https://travis-ci.org/justinjmoses/mongo-views.svg?branch=master)](https://travis-ci.org/justinjmoses/mongo-views)

Supports MongoDB 2.2 <= 3.0

This is a MongoDB skunkworks project to enable queryable views within the shell. Views are like **virtual collections**, that can be queried as regular collections.

They support:

* **Criteria**
* **Projections**
* **Joins**
* **Nesting**
* 
Why might you want this? Well lets say you want to save a query for regular reuse. Say you have an `employees` collection:

```javascript
db.employees.insert(
    [
        {name: "John", dob: new Date(1980, 1, 2)}, 
        {name: "Paul", manager: true, dob: new Date(1983, 7, 10), uid: 3},
        {name: "Mary", dob: new Date(1985, 5, 12), uid: 20},
        {name: "Aimee", manager: true, dob: new Date(1945, 2, 20), uid: 50}
    ]
)
```

and we want all managers from an `employee` collection. Then you could create a **view** via:

```javascript
db.employees.createView("managers", { manager: true })
```

and query/sort/limit it as though it was a collection via

```javascript
db._managers.find().sort({ name: -1 }).pretty()
/* yields =>
{
  "_id": ObjectId("54f9e58e1d8a2ac246213516"),
  "name": "Paul",
  "manager": true,
  "dob": ISODate("1983-08-10T04:00:00Z"),
  "uid": 3
}
{
  "_id": ObjectId("54f9e58e1d8a2ac246213518"),
  "name": "Aimee",
  "manager": true,
  "dob": ISODate("1945-03-20T04:00:00Z"),
  "uid": 50
}
*/
```

it's virtual, so if you add to the underlying collection(s)

```javascript
db.employees.insert( {name: "Ian", manager: true, dob: new Date(1995, 1, 20), uid: 99 })
```

then the same view query yields:

```javascript
db._managers.find().sort({ name: -1 }).pretty();
/* yields =>
{
  "_id": ObjectId("54f9e58e1d8a2ac246213516"),
  "name": "Paul",
  "manager": true,
  "dob": ISODate("1983-08-10T04:00:00Z"),
  "uid": 3
}
{
  "_id": ObjectId("54f9e5b41d8a2ac24621351a"),
  "name": "Ian",
  "manager": true,
  "dob": ISODate("1995-02-20T05:00:00Z"),
  "uid": 99
}
{
  "_id": ObjectId("54f9e58e1d8a2ac246213518"),
  "name": "Aimee",
  "manager": true,
  "dob": ISODate("1945-03-20T04:00:00Z"),
  "uid": 50
}
*/
```

you can of course add **criteria** to the `find()`

```javascript
db._managers.find({ name: /Paul/ }).sort({ name: -1 }).pretty();
/* yields =>
{
  "_id": ObjectId("54f9e58e1d8a2ac246213516"),
  "name": "Paul",
  "manager": true,
  "dob": ISODate("1983-08-10T04:00:00Z"),
  "uid": 3
}
*/
```

you can then create **nested views** just as easily

```javascript
db._managers.createView("senior_managers", { dob: {$lt: new Date(1990, 0 , 1) } })

db._senior_managers.find()
/* yields =>
{
  "_id": ObjectId("54f9d8b3f088c1c44badce68"),
  "name": "Paul",
  "manager": true,
  "dob": ISODate("1983-08-10T04:00:00Z")
}
{
  "_id": ObjectId("54f9d8b3f088c1c44badce6a"),
  "name": "Aimee",
  "manager": true,
  "dob": ISODate("1945-03-20T04:00:00Z")
}
*/
```

Maybe we don't want senior managers to show the `_id` field, then we use a **projection**

```javascript
db._senior_managers.drop();

db._managers.createView("senior_managers", { dob: {$lt: new Date(1990, 0 , 1)} }, { _id: 0 })

db._senior_managers.find()
/* yields =>
{
  "name": "Paul",
  "manager": true,
  "dob": ISODate("1983-08-10T04:00:00Z"),
  "uid": 3
}
{
  "name": "Aimee",
  "manager": true,
  "dob": ISODate("1945-03-20T04:00:00Z"),
  "uid": 50
}
*/
```

we can even combine **projections** as in

```javascript
db._senior_managers.find({}, {uid: 0, manager: 0})
/* yields =>
{
  "name": "Paul",
  "dob": ISODate("1983-08-10T04:00:00Z")
}
{
  "name": "Aimee",
  "dob": ISODate("1945-03-20T04:00:00Z")
}
*/
```

it's just a cursor, so we can sort and limit as expected:

```javascript
db._senior_managers.find().sort({ dob: 1 }).limit(1)
/* yields =>
{
  "name": "Aimee",
  "manager": true,
  "dob": ISODate("1945-03-20T04:00:00Z")
}
*/
```

Moreover, these views persist. Both when you switch DBs via `use [db]` or by restarting the shell.

> **Views** are virtual, and only save the state of the query used to create them. This means that each time a query is performed on a view, the latest collection data is fetched.


Installation
====

* In POSIX environments, run `make`

* In WinX environments, please add `mongorc.js` to your MongoDB installation folder (if it doesn't exist) and copy the contents of `index.js` into it, amending setting the `__CURDIR` global to the full path of this mongo-views folder.

Basic Usage
=======

__Create__
```javascript
db.[collection].createView(view:String, criteria:Object, projection:Object, join:Object)

//or

db._[view].createView(view:String, query:Object)
```

__See all views in DB__
```javascript
show views
```

__Inspect a view__
```javascript
db._[view].inspect()
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
db.employees.createView("managers", { manager: true }, { name: 1, _id: 1 });
db._managers.find({ }, { _id: 0 });

// yields =>
db.employees.find({ ... }, { name: 1, _id: 0 }); // id set to 0 from 1~0
```

Case 2:

```javascript
db.employees.createView("managers", { manager: true }, { name: 1, id: 1 });
db._managers.find({ }, { name: 1 });

// yields =>
db.employees.find({ ... }, { name: 1 }); // id removed as not in find() projection
```

Case 3:

```javascript
db.employees.createView("managers", { manager: true }, { id: 0 });
db._managers.find({ }, { email: 0 });

// yields =>
db.employees.find({ ... }, { id: 0, email: 0 }); // id removed as not in find() projection
```

Join
=====

Currently supports a single join to another collection or view.

Naming conflicts are solved by prefixing the fields with collection or view name and an underscore.

`_id` field is a compound key of `from` and `to` `_ids`

API:

```javascript
join: {
    target: [collection|view],
    from: String, // foreign key in this collection or view
    to: String    // unique key in target collection or view
}
```

Usage example

```javascript
// given employees with
db.employees.insert([{
    id: 1000,
    userId: 1,
    manager: true
},
{
    id: 2000,
    userId: 2
}]);

// and given users with
db.users.insert([{
    id: 1,
    name: 'Mary'
},
{
    id: 2,
    name: 'Steve'
}]);

db.employees.createView("employeeWithName", {}, {}, { target: db.users, from: "userId", to: "id" })

db._employeeWithName.find()

// yields (with correct ObjectIDs)

{
  "_id": {
    "from": ObjectId("54f8fe02dda3a15de727fed0"),
    "to": ObjectId("54f8c9fd11728912a3d3d4ba")
  },
  "userId": 1,
  "manager": true,
  "employees_id": 1000,
  "users_id": 1,
  "name": "Mary"
}
{
  "_id": {
    "from": ObjectId("54f76a9627b88418f7ace405"),
    "to": ObjectId("54f769f52a8ba2061cd100df")
  },
  "userId": 2,
  "employees_id": 2000,
  "users_id": 2,
  "name": "Steve"
}
```

Guidelines
========

* Views are scoped to the DB level

* View names must be unique, and cannot match any given collection name in that DB

* Views based on dropped collections or views will be removed automatically

* Joins are performed in-memory, and may take a long time for large collections


Run Tests
----

First time grab deps: `npm install`

Then run `npm test`

