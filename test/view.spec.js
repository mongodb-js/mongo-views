'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

// subject
var DBView = require('../lib/views');

describe('DBView', function () {
    var view;
    beforeEach(function () {
        view = new DBView() ;
    });
    describe('todo', function () {
        it('this is my assertion', function () {
            // expect(...)
        });
    });
});
