'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

// subject
var DBView = require('../lib/views');
var config = require('../lib/config');

describe('projections', function () {
    function stubCollection(name) {
        return {
            find: sinon.spy(),
            getName: function () { return name; }
        };
    }

    var db, coll, getCollectionStub, getCurrentDbStub, mergedQuery;

    beforeEach(function () {
        coll = stubCollection('coll');

        getCollectionStub = {
            insert:  sinon.stub(),
            remove:  sinon.stub(),
            find:    sinon.spy(),
            findOne: sinon.stub(),
            count:   sinon.stub()


        };

        getCurrentDbStub = {
            getCollection : sinon.stub().returns(getCollectionStub)
        };
        db = sinon.stub(config, 'getCurrentDb').returns(getCurrentDbStub);
        mergedQuery = { $and: [{ }, { }] };
    });

    afterEach(function () {
        db.restore();
    });

    describe('given a view of a collection with inclusion projection for two fields', function() {
        var view;
        beforeEach(function () {
            view = DBView.instantiate(coll, 'view', { }, { x : 1, y : 1});
        });

        describe('and a find on that view with exclusion projection for one field', function () {
            var result;
            beforeEach(function () {
                result = view.find({}, { x : 0 });
            });

            it('then expect this to result in a projection with only the other field present',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery, { y : 1 });
            });
        });

        describe('and a find on that view excluding both fields', function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { x : 0, y : 0 });
            });
            it('then expect this to result in a projection with only the non-existant $ field',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery, { $ : 1 });
            });
        });

        describe('and a find on that view with inclusion projection for one field',
        function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { x : 1 });
            });
            it('then expect this to result in a projection with only that field',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery, { x : 1 });
            });
        });

        describe('and a find on that view with inclusion projection for two other fields',
        function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { a : 1, b : 1 });
            });
            it('then expect this to result in a projection with only the non-existant $ field',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery, { $ : 1 });
            });
        });

	describe('and a find on that view with inclusion for that one and some other field',
        function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { x : 1 });
            });
            it('then expect this to result in a projection with only that one field',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery, { x : 1 });
            });
        });
    });
    describe('given a view of a collection with exclusion projection for two fields', function() {
        var view;
        beforeEach(function () {
            view = DBView.instantiate(coll, 'view', { }, { one : 0, other : 0});
            mergedQuery = { $and: [{ }, { }] };
        });

        describe('and a find on that view with an inclusion projection for one of those fields',
        function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { one : 1 });
            });
            it('then expect this to result in a projection with only the non-existant $ field',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery, { $ : 1 });
            });
        });

        describe('and a find on that view with an exclusion projection for a third field',
        function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { third : 0 });
            });
            it('then expect this to result in a projection with an exclusion for all three',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery,
                                                          { one : 0, other : 0 , third : 0 });
            });
        });

        describe('and a find on that view with an inclusion projection for a third field',
        function() {
            var result;
            beforeEach(function () {
                result = view.find({}, { third : 1 });
            });
            it('then expect this to result in a projection with only that third field included',
            function () {
                expect(coll.find).to.have.been.calledWith(mergedQuery,
                                                          { third : 1 });
            });
        });
    });
});
