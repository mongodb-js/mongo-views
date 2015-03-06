'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

// subject
var DBView = require('../lib/views');
var config = require('../lib/config');

describe('joins', function () {
    var baseCollectionStub, db, getCurrentDbStub, getCollectionStub;

    beforeEach(function () {
        baseCollectionStub = {
            find : sinon.spy()
        };

        getCollectionStub = {
            insert : sinon.stub(),
            remove : sinon.stub()
        };

        getCurrentDbStub = {
            getCollection : sinon.stub().returns(getCollectionStub)
        };
        db = sinon.stub(config, 'getCurrentDb').returns(getCurrentDbStub);
    });

    afterEach(function () {
        db.restore();
    });

    // describe('on creation', function () {
    //     function create(join) {
    //         return DBView.instantiate(baseCollectionStub, 'name', {}, {}, join);
    //     }

    //     var view;
    //     beforeEach(function () {
    //         view = create([{ foreignKey: 'fid', targets: [ { foo: 'id' } ] }]);
    //     });


    // });

});
