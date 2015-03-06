'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var deserializer = require('../lib/deserializer');

describe('deserializer', function () {
    describe('deserializeStringWithDates', function () {
        var result;

        describe('when i execute with', function () {
            beforeEach(function () {
                result = deserializer('{}');
            });
            it('then i get an empty object back', function () {
                expect(result).to.eql({});
            });
        });

        describe('when i execute with a deep object with dates', function () {
            beforeEach(function () {
                result = deserializer(
                    '[{"first":1,"other":[{"x":2}],"dob":{"$gt":"2000-02-02T05:00:00.000Z","$exists":true,"$lt":"2011-04-03T04:00:00.000Z"}}, {}]'
                );
            });
            it('then i get a good parse', function () {
                expect(result).to.eql([{ first: 1, other: [{x: 2}], dob: {$gt: new Date(2000, 1, 2), $exists: true, $lt: new Date(2011, 3,3)}}, {}]);
            });
        });
    });
});
