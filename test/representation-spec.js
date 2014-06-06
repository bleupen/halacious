'use strict';

var chai = require('chai');
var should = chai.should();
var plugin = require('../lib/plugin');
var hapi = require('hapi');
var RepresentationFactory = require('../lib/representation').RepresentationFactory;

var halacious, rf;

describe('Representation Factory', function() {

    beforeEach(function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            if (err) return done(err);
            halacious = server.plugins.halacious;
            rf = new RepresentationFactory(halacious);
            done();
        });
    });

    it('should create a new representation', function () {
        should.exist(rf);
        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create('/people', entity);
        rep._links.should.have.property('self');
        rep._links.self.should.have.property('href', '/people');
        rep.should.have.property('entity', entity);
    });

    it('should serialize a simple entity into property JSON', function () {
        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create('/people', entity);
        var json = JSON.stringify(rep);
        json.should.deep.equal('{"_links":{"self":{"href":"/people"}},"firstName":"Bob","lastName":"Smith"}');
    });

    it('should link to a registered rel', function () {
        var ns = halacious.namespaces
            .add({ name: 'mycompany', prefix: 'mco' })
            .rel({ name: 'boss' });

        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create('/people', entity);
        rep.link('mco:boss', '/people/1234');
        rep._links.should.have.property('mco:boss');
        rep._links['mco:boss'].should.have.property('href', '/people/1234');
    });

    it('should resolve relative paths', function () {
        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create('/people', entity);
        var href = rep.resolve('./1234');
        href.should.equal('/people/1234');
    });
});