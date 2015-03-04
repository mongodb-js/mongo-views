# mongo-views
MongoDB skunkworks project to enable queryable Views within the shell

Todo
----
* Select
    * `db.[collection].createView(name, query):View(DBQuery)`
        * ensure calls to cursor (sort, min, max, limit) use the `query`
        * Usage: 
            ```javascript
            var view = db.employees.createView('management', { manager: true });
            view.find({}).sort({ name: 1 }).pretty();
            ```

     * support fields in base `View`  

* Persistence

* Join
    *

* Syntactic Sugar
