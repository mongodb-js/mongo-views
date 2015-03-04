# mongo-views
MongoDB skunkworks project to enable queryable Views within the shell

Supports
=======

Selections (saved queries)
-------------

* Creation of View
```javascript
var view = db.[collection].createView(name, query)
```

* Querying of View (Query parameter only)
```javascript
view.find(query)
```

Example
----
```javascript
db.employees.createView('managers', { manager: true });
dbv.managers.find({ joined: { $gt: ISODate("2012-12-19T06:01:17.171Z") } }).sort({ name: 1 }).pretty();
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
