'use strict';

var mocha = require('mocha');
var chai = require('chai');
var should = chai.should();
var plugin = require('../lib/plugin');
var hapi = require('hapi');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
chai.use(sinonChai);

var hapiPlugin = {
    expose: sinon.spy()
};

describe('plugin', function () {
    it('should have a registration function', function () {
        plugin.should.have.property('register');
        plugin.register.should.be.a('Function');
    });

    it('should expose a namespace function', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function(err) {
            server.plugins.halacious.should.have.property('namespaces');
            server.plugins.halacious.namespace.should.be.a('Function');
            done();
        });
    });

    it('should create a namespace', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function(err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            should.exist(ns);
            ns.should.have.property('name', 'informer');
            ns.should.have.property('prefix', 'inf');
            ns.should.have.property('rel');
            ns.rel.should.be.a('Function');
            done();
        });
    });

    it('should look up a namespace', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function(err) {
            server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            var ns = server.plugins.halacious.namespace('informer');
            ns.rel('datasources', 'A list of datasources');
            ns.rels.should.have.property('datasources');
            ns.rels.datasources.should.have.property('name', 'datasources');
            ns.rels.datasources.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should add a rel to a namespace', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function(err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            ns.rel('datasources', 'A list of datasources');
            ns.rels.should.have.property('datasources');
            ns.rels.datasources.should.have.property('name', 'datasources');
            ns.rels.datasources.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should look up a rel by prefix:name', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function(err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            ns.rel('datasources', 'A list of datasources');
            var rel = server.plugins.halacious.rel('inf:datasources');
            should.exist(rel);
            rel.should.have.property('name', 'datasources');
            rel.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should look up a rel by ns / name', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function(err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            ns.rel('datasources', 'A list of datasources');
            var rel = server.plugins.halacious.rel('informer', 'datasources');
            should.exist(rel);
            rel.should.have.property('name', 'datasources');
            rel.should.have.property('description', 'A list of datasources');
            done();
        });
    });
});