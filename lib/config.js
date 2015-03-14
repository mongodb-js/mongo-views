'use strict';

/* global db: false */
module.exports = {
    VIEWS_COLLECTION_NAME: '__views',
    getCurrentDb: function () {

        // `db` is the global instance that the MongoDB shell uses to track the current database
        // This function is here to assist with stubbing out db in tests

        return db;
    }
};
