'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

// subject
var DBView = require('../lib/views');
var config = require('../lib/config');

// polyfill Object.extend... (taken from Mongo source (types.js))
/* global tojson: false */
/* jshint evil: true */
Object.extend = function(dst, src, deep){
    for (var k in src){
        var v = src[k];
        if (deep && typeof(v) == 'object'){
            if ('floatApprox' in v) { // convert NumberLong properly
                eval('v = ' + tojson(v));
            } else {
                v = Object.extend(typeof (v.length) == 'number' ? [] : {}, v, true);
            }
        }
        dst[k] = v;
    }
    return dst;
};


describe('joins', function () {

    function stubCollection(name, docs) {
        var i = 0;
        return {
            insert: function (docOrDocs) {
                if (docOrDocs instanceof Array) {
                    docs = docs.concat(docOrDocs);
                } else {
                    docs.push(docOrDocs);
                }
            },
            find: sinon.stub().returns({
                hasNext: function () {
                    return !!docs[i];
                },
                next: function () {
                    return docs[i++];
                },
                toArray: function () {
                    return docs;
                }
            }),
            getName: function () { return name; },
	    count : sinon.stub(),
	    findOne : sinon.stub()
        };
    }

    var db, getCollectionStub, getCurrentDbStub;

    beforeEach(function () {

        getCollectionStub = stubCollection('__temp', []);

        getCurrentDbStub = {
            getCollection : sinon.stub().returns(getCollectionStub)
        };
        db = sinon.stub(config, 'getCurrentDb').returns(getCurrentDbStub);
    });

    afterEach(function () {
        db.restore();
    });

    describe('given i have an employees collection with two employees', function () {
        var source;

        beforeEach(function () {
            source = stubCollection('employees',
                [{
                    _id: 1000,
                    userId: 1,
                    manager: true
                },
                {
                    _id: 2000,
                    userId: 2
                }]
            );
        });

        describe('and i have a users collection with two matching users', function () {
            var dest;

            beforeEach(function () {
                dest = stubCollection('users', [{
                    _id: 1,
                    name: 'Mary'
                },
                {
                    _id: 2,
                    name: 'Steve'
                }]);
            });

            describe('when i create a view to join employees to users', function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result;
                    beforeEach(function () {
                        result = view.find();
                    });
                    it('then i expect result to have two documents', function () {
                        expect(result.toArray().length).to.equal(2);
                        expect(result.toArray()).to.eql([
                            {_id: {to: 1, from: 1000}, userId: 1, manager: true, name: 'Mary'},
                            {_id: {to: 2, from: 2000}, userId: 2, name: 'Steve'}
                        ]);
                    });
                });
            });

            describe('when i create a view to join employees to users, excluding the userId field',
                     function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {userId: 0},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var mergedQuery;
                    beforeEach(function () {
                        mergedQuery = { $and: [{ }, { }] };
                    });
                    describe('without any projections in that query', function() {
                        var result;
                        beforeEach(function () {
                            result = view.find();
                        });
                        it('then i expect result to have two documents', function () {
                            expect(result.toArray().length).to.equal(2);
                        });
                        it('then i expect the find query to be called with the projection',
                           function () {
                            expect(getCollectionStub.find).to.have.been.calledWith(mergedQuery,
                                                                                   {userId: 0});
                        });
                    });
                    describe('projecting out _id', function() {
                        var result;
                        beforeEach(function () {
                            result = view.find({}, {_id: 0});
                        });
                        it('then i expect result to have two documents', function () {
                            expect(result.toArray().length).to.equal(2);
                        });
                        it('then i expect the find query to project out userId and _id',
                           function () {
                            expect(getCollectionStub.find).to.have.been.calledWith(
                                mergedQuery, {_id: 0, userId: 0});
                        });
                    });
                    describe('projecting in name', function() {
                        var result;
                        beforeEach(function () {
                            result = view.find({}, {name: 1});
                        });
                        it('then i expect result to have two documents', function () {
                            expect(result.toArray().length).to.equal(2);
                        });
                        it('then i expect the find query to include only name',
                           function () {
                            expect(getCollectionStub.find).to.have.been.calledWith(
                                mergedQuery, {name: 1});
                        });
                    });
                });
            });
            describe('when i create a view to join employees to users, excluding _id and userId',
                     function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {_id: 0, userId: 0},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result, mergedQuery;
                    beforeEach(function () {
                        result = view.find();
                        mergedQuery = { $and: [{ }, { }] };
                    });
                    it('then i expect result to have two documents', function () {
                        expect(result.toArray().length).to.equal(2);
                    });
                    it('then i expect the find query to be called with the projection',
                       function () {
                        expect(getCollectionStub.find).to.have.been.calledWith(mergedQuery,
                                                                               {_id: 0, userId: 0});
                    });
                });
            });
        });
        describe('and i have a users collection with one matching user', function () {
            var dest;

            beforeEach(function () {
                dest = stubCollection('users', [{
                    _id: 1,
                    name: 'Mary'
                },
                {
                    _id: 4,
                    name: 'NotSteve'
                }]);
            });
            describe('when i create a view to join employees to users', function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result;
                    beforeEach(function () {
                        result = view.find();
                    });
                    it('then i expect result to have one document', function () {
                        expect(result.toArray().length).to.equal(1);
                        expect(result.toArray()).to.eql([
                            {_id: {to: 1, from: 1000}, userId: 1, manager: true, name: 'Mary'},
                        ]);
                    });
                });
            });
        });
        describe('and i have a users collection with no matching users', function () {
            var dest;

            beforeEach(function () {
                dest = stubCollection('users', [{
                    _id: 3,
                    name: 'NotMary'
                },
                {
                    _id: 4,
                    name: 'NotSteve'
                }]);
            });
            describe('when i create a view to join employees to users', function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result;
                    beforeEach(function () {
                        result = view.find();
                    });
                    it('then i expect result to have no documents', function () {
                        expect(result.toArray().length).to.equal(0);
                        expect(result.toArray()).to.eql([]);
                    });
                });
            });
        });
        describe('and i have a users collection with no users', function () {
            var dest;

            beforeEach(function () {
                dest = stubCollection('users', []);
            });
            describe('when i create a view to join employees to users', function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result;
                    beforeEach(function () {
                        result = view.find();
                    });
                    it('then i expect result to have no documents', function () {
                        expect(result.toArray().length).to.equal(0);
                        expect(result.toArray()).to.eql([]);
                    });
                });
            });
        });
    });
    describe('given i have an employees collection with no employees', function () {
        var source;

        beforeEach(function () {
            source = stubCollection('employees',[]);
        });

        describe('and i have a users collection with two users', function () {
            var dest;

            beforeEach(function () {
                dest = stubCollection('users', [{
                    _id: 1,
                    name: 'Mary'
                },
                {
                    _id: 2,
                    name: 'Steve'
                }]);
            });

            describe('when i create a view to join employees to users', function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result;
                    beforeEach(function () {
                        result = view.find();
                    });
                    it('then i expect result to have no documents', function () {
                        expect(result.toArray().length).to.equal(0);
                        expect(result.toArray()).to.eql([]);
                    });
                });
            });
        });
        describe('and i have a users collection with no users', function () {
            var dest;

            beforeEach(function () {
                dest = stubCollection('users', []);
            });

            describe('when i create a view to join employees to users', function () {
                var view;
                beforeEach(function () {
                    view = DBView.instantiate(source, 'name', {}, {},
                                              { target: dest, from: 'userId', to: '_id' });
                });

                describe('and i find all documents on the view', function () {
                    var result;
                    beforeEach(function () {
                        result = view.find();
                    });
                    it('then i expect result to have no documents', function () {
                        expect(result.toArray().length).to.equal(0);
                        expect(result.toArray()).to.eql([]);
                    });
                });
            });
        });
    });
});
