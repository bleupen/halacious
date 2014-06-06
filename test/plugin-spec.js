'use strict';

var mocha = require('mocha');
var chai = require('chai');
var should = chai.should();
var plugin = require('../lib/plugin');
var hapi = require('hapi');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var fs = require('fs');
chai.use(sinonChai);

var hapiPlugin = {
    expose: sinon.spy()
};

describe('Halacious Plugin', function () {
    it('should have a registration function', function () {
        plugin.should.have.property('register');
        plugin.register.should.be.a('Function');
    });

    it('should expose a namespace function', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            server.plugins.halacious.should.have.property('namespaces');
            server.plugins.halacious.namespace.should.be.a('Function');
            done();
        });
    });

    it('should create a namespace', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
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
        server.pack.require('..', {}, function (err) {
            server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            var ns = server.plugins.halacious.namespace('informer');
            ns.rel({ name: 'datasources', description: 'A list of datasources' });
            ns.rels.should.have.property('datasources');
            ns.rels.datasources.should.have.property('name', 'datasources');
            ns.rels.datasources.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should add a rel to a namespace', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            ns.rel({ name: 'datasources', description: 'A list of datasources' });
            ns.rels.should.have.property('datasources');
            ns.rels.datasources.should.have.property('name', 'datasources');
            ns.rels.datasources.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should look up a rel by prefix:name', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            ns.rel({ name: 'datasources', description: 'A list of datasources' });
            var rel = server.plugins.halacious.rel('inf:datasources');
            should.exist(rel);
            rel.should.have.property('name', 'datasources');
            rel.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should look up a rel by ns / name', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            var ns = server.plugins.halacious.namespaces.add({ name: 'informer', prefix: 'inf' });
            ns.rel({ name: 'datasources', description: 'A list of datasources' });
            var rel = server.plugins.halacious.rel('informer', 'datasources');
            should.exist(rel);
            rel.should.have.property('name', 'datasources');
            rel.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should install a directory-style namespace', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            var ns = server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/informer', prefix: 'inf' });
            var rel1 = server.plugins.halacious.rel('inf:datasources');
            var rel2 = server.plugins.halacious.rel('inf:datasource');
            should.exist(ns);
            should.exist(rel1);
            should.exist(rel2);
            rel1.should.have.property('name', 'datasources');
            rel2.should.have.property('name', 'datasource');
            done();
        });
    });

    it('should route rel documentation', function (done) {
        var server = new hapi.Server(9090);
        server.pack.require('..', {}, function (err) {
            if (err) return done(err);
            var ns = server.plugins.halacious.namespaces.add({dir: __dirname + '/rels/informer', prefix: 'inf'});
            server.inject({
                method: 'get',
                url: '/rels/informer/datasources'
            }, function (res) {
                res.statusCode.should.equal(200);
                res.payload.should.not.be.empty;
                done();
            });
        });
    });

    it('should resolve a named route path', function (done) {
        var server = new hapi.Server(9090);

        server.route({
            method: 'get',
            path: '/{a}/{b}/{c}',
            config: {
                handler: function (req, reply) {
                    reply({ a: req.params.a, b: req.params.b, c: req.params.c });
                },
                plugins: {
                    hal: {
                        name: 'test-route'
                    }
                }
            }
        });

        server.pack.require('..', {}, function (err) {
            if (err) return done(err);
            var path = server.plugins.halacious.route('test-route', {a: 'i', b: 'aint', c: 'fack'});
            path.should.equal('/i/aint/fack');
            done();
        });
    });
});