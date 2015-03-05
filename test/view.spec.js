'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

// subject
var DBView = require('../lib/views');
var config = require('../lib/config');

describe('DBView', function () {
    var collectionStub, db, getCurrentDbStub, getCollectionStub;

    beforeEach(function () {
        collectionStub = {
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
    describe('projections', function () {
        var view, mergedQuery;
        describe('views with inclusion projection', function() {
            beforeEach(function () {
                view = DBView.instantiate(collectionStub, { }, { x : 1});
		mergedQuery = { $and: [{ x : 1 }, { }] };
            });
            it('find with exclusion projection', function () {
                view.find({}, { x : 0 });
                expect(collectionStub.find).to.have.been.calledWith(mergedQuery, { x : 0});
            });
        });
    });
});
