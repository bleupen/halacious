'use strict';

var chai = require('chai');
var should = chai.should();
var plugin = require('../lib/plugin');
var hapi = require('hapi');
var sinonChai = require('sinon-chai');
var chaiString = require('chai-string');
var halacious = require('../');
var vision = require('vision');
var _ = require('lodash');
var url = require('url');

chai.use(sinonChai);
chai.use(chaiString);

describe('Halacious Plugin', function () {

    it('should have a registration function', function () {
        plugin.should.have.property('register');
        plugin.register.should.be.a('Function');
    });

    it('should expose a namespace function', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            server.plugins.halacious.should.have.property('namespaces');
            server.plugins.halacious.namespace.should.be.a('Function');
            done();
        });
    });

    it('should create a namespace', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var ns = server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            should.exist(ns);
            ns.should.have.property('name', 'mycompany');
            ns.should.have.property('prefix', 'mco');
            ns.should.have.property('rel');
            ns.rel.should.be.a('Function');
            done();
        });
    });

    it('should look up a namespace', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            var ns = server.plugins.halacious.namespace('mycompany');
            ns.rel({ name: 'boss', description: 'An employees boss' });
            ns.rels.should.have.property('boss');
            ns.rels.boss.should.have.property('name', 'boss');
            ns.rels.boss.should.have.property('description', 'An employees boss');
            done();
        });
    });

    it('should return a sorted array of namespaces', function () {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var namespaces;
            server.plugins.halacious.namespaces.add({ name: 'yourcompany', prefix: 'yco' });
            server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            server.plugins.halacious.namespaces.add({ name: 'ourcompany', prefix: 'oco' });

            namespaces = server.plugins.halacious.namespaces();
            namespaces.should.have.length(3);
            namespaces[0].should.have.property('name', 'mycompany');
            namespaces[1].should.have.property('name', 'ourcompany');
            namespaces[2].should.have.property('name', 'yourcompany');
        });
    });

    it('should fail when registering an invalid namespace', function () {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var plugin = server.plugins.halacious;
            plugin.namespaces.add.bind(plugin.namespaces, { name: 'mycompany', prefirx: 'mco'}).should.throw('prefirx is not allowed');
        });
    });
    
    it('should add a rel to a namespace', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var ns = server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            ns.rel({ name: 'boss', description: 'An employees boss' });
            ns.rels.should.have.property('boss');
            ns.rels.boss.should.have.property('name', 'boss');
            ns.rels.boss.should.have.property('description', 'An employees boss');
            done();
        });
    });

    it('should look up a rel by prefix:name', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var ns = server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            ns.rel({ name: 'datasources', description: 'A list of datasources' });
            var rel = server.plugins.halacious.rel('mco:datasources');
            should.exist(rel);
            rel.should.have.property('name', 'datasources');
            rel.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should remove a namespace', function() {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            server.plugins.halacious.namespaces.add({ name: 'yourcompany', prefix: 'yco' });
            server.plugins.halacious.namespaces().should.have.length(2);
            server.plugins.halacious.namespaces.remove('yourcompany');
            server.plugins.halacious.namespaces().should.have.length(1);
            server.plugins.halacious.namespaces()[0].should.have.property('name', 'mycompany');
        });
    });

    it('should look up a rel by ns / name', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var ns = server.plugins.halacious.namespaces.add({ name: 'mycompany', prefix: 'mco' });
            ns.rel({ name: 'datasources', description: 'A list of datasources' });
            var rel = server.plugins.halacious.rel('mycompany', 'datasources');
            should.exist(rel);
            rel.should.have.property('name', 'datasources');
            rel.should.have.property('description', 'A list of datasources');
            done();
        });
    });

    it('should add a rel to a specified namespace', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var rels, plugin = server.plugins.halacious;
            plugin.namespaces.add({ name: 'thiscompany', prefix: 'tco' });
            plugin.rels.add('thiscompany', 'a_rel');
            plugin.rels.add('thiscompany', { name: 'b_rel' });
            rels = _.values(plugin.namespace('thiscompany').rels);
            rels.should.have.length(2);
            _.pluck(rels, 'name').should.deep.equal(['a_rel', 'b_rel']);
            done();
        });
    });

    it('should return a sorted list of rels', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var rels, plugin = server.plugins.halacious;
            plugin.namespaces.add({ name: 'mycompany', prefix: 'mco' }).rel('a_rel').rel('c_rel');
            plugin.namespaces.add({ name: 'yourcompany', prefix: 'yco'}).rel('b_rel').rel('d_rel');
            rels = plugin.rels();
            rels.should.have.length(4);
            _.pluck(rels, 'name').should.deep.equal(['a_rel', 'b_rel', 'c_rel', 'd_rel']);
            done();
        });
    });

    it('should bomb on a bad rel in strict mode', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });

        server.route({
            method: 'get',
            path: '/foo',
            config: {
                handler: function (req, reply) {
                    reply({ name: 'Billy Bob' });
                },
                plugins: {
                    hal: {
                        links: {
                            'mco:badRel': './badRel'
                        }
                    }
                }
            }
        });

        server.register({ register: halacious, options: { strict: true }}, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco' });
            server.inject({
                method: 'get',
                url: '/foo',
                headers: { Accept: 'application/hal+json' }
            }, function (res) {
                res.statusCode.should.equal(500);
                done();
            });
        });
    });

    it('should install a directory-style namespace', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        server.register(halacious, function () {
            var ns = server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco' });
            var rel1 = server.plugins.halacious.rel('mco:datasources');
            var rel2 = server.plugins.halacious.rel('mco:datasource');
            should.exist(ns);
            should.exist(rel1);
            should.exist(rel2);
            rel1.should.have.property('name', 'datasources');
            rel2.should.have.property('name', 'datasource');
            done();
        });
    });

    it('should route rel documentation', function (done) {
        var server = new hapi.Server({ debug: { log: ['error']}});
        server.connection();
        server.register(vision, function (err) {
            if (err) done(err);
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces.add({dir: __dirname + '/rels/mycompany', prefix: 'mco'});
        });

        server.start(function(err) {
            if (err) return done(err);

            server.inject({
                method: 'get',
                url: '/rels/mycompany/boss'
            }, function (res) {
                res.statusCode.should.equal(200);
                res.payload.should.not.be.empty;
                done();
            });
        })
    });

    it('should resolve a named route path', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });

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

        server.register(halacious, function (err) {
            if (err) return done(err);
            var path = server.plugins.halacious.route('test-route', {a: 'i', b: 'aint', c: 'fack'});
            path.should.equal('/i/aint/fack');
            done();
        });
    });

    it('should convert a json entity into a HAL representation with self and a simple link', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith' });
                },
                plugins: {
                    hal: {
                        links: {
                            'mco:boss': './boss'
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: '/people/100/boss' }
                },
                firstName: 'Bob',
                lastName: 'Smith'
            });
            done();
        });
    });

    it('should convert a json entity into a HAL representation with self and a templated link', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', bossId: '1234' });
                },
                plugins: {
                    hal: {
                        links: {
                            'mco:boss': { href: '../{bossId}', title: 'Boss' }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: '/people/1234', title: 'Boss' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234'
            });
            done();
        });
    });

    it('should allow for programmatic population of a hal entity', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', bossId: '1234' });
                },
                plugins: {
                    hal: {
                        prepare: function(rep, done) {
                            rep.link('mco:boss', 'http://www.whitehouse.gov');
                            done();
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: 'http://www.whitehouse.gov' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234'
            });
            done();
        });
    });

    it('should support a hal configuration function', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', bossId: '1234' });
                },
                plugins: {
                    hal: function(rep, done) {
                        rep.link('mco:boss', 'http://www.whitehouse.gov');
                        done();
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: 'http://www.whitehouse.gov' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234'
            });
            done();
        });
    });

    it('should embed an object property', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', boss: { firstName: 'Boss', lastName: 'Man'} });
                },
                plugins: {
                    hal: {
                        embedded: {
                            'mco:boss': {
                                path: 'boss',
                                href: './boss'
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }]
                },
                firstName: 'Bob',
                lastName: 'Smith',
                _embedded: {
                    'mco:boss': {
                        _links: { self: { href: '/people/100/boss'} },
                        firstName: 'Boss',
                        lastName: 'Man'
                    }
                }
            });
            done();
        });
    });

    it('should support embedded url templates', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ id: 100, firstName: 'Bob', lastName: 'Smith', boss: { id: 200, firstName: 'Boss', lastName: 'Man'} });
                },
                plugins: {
                    hal: {
                        embedded: {
                            'mco:boss': {
                                path: 'boss',
                                href: '/people/{self.id}/{item.id}'
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }]
                },
                id: 100,
                firstName: 'Bob',
                lastName: 'Smith',
                _embedded: {
                    'mco:boss': {
                        _links: { self: { href: '/people/100/200'} },
                        id: 200,
                        firstName: 'Boss',
                        lastName: 'Man'
                    }
                }
            });
            done();
        });
    });

    it('should provide embedded collection support', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                handler: function (req, reply) {
                    reply({
                        start: 0,
                        count: 2,
                        total: 2,
                        items: [
                            { id: 100, firstName: 'Bob', lastName: 'Smith' },
                            { id: 200, firstName: 'Boss', lastName: 'Man'}
                        ]
                    });
                },
                plugins: {
                    hal: {
                        embedded: {
                            'mco:person': {
                                path: 'items',
                                href: './{item.id}',
                                links: {
                                    'mco:boss': './boss'
                                }
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }]
                },
                start: 0,
                count: 2,
                total: 2,
                _embedded: {
                    'mco:person': [
                        {
                            _links: { self: { href: '/people/100' }, 'mco:boss': { href: '/people/100/boss'}},
                            id: 100,
                            firstName: 'Bob',
                            lastName: 'Smith'
                        },
                        {
                            _links: { self: { href: '/people/200' }, 'mco:boss': { href: '/people/200/boss'}},
                            id: 200,
                            firstName: 'Boss',
                            lastName: 'Man'
                        }
                    ]
                }
            });
            done();
        });
    });

    it('should invoke an optional toHal() method on the source entity', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;
        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({
                        firstName: 'Bob',
                        lastName: 'Smith',
                        bossId: '1234',
                        toHal: function(rep, done) {
                            rep.link('mco:boss', './boss');
                            done();
                        }
                    });
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: '/people/100/boss' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234'
            });
            done();
        });
    });
    
    it('should allow for programmatic population of a hal entity and it\'s configured embedded entities', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', bossId: '1234', foo: {id: '5678'}});
                },
                plugins: {
                    hal: {
                        prepare: function(rep, done) {
                            rep.link('mco:boss', 'http://www.whitehouse.gov');
                            done();
                        },
                        embedded: {
                            'foo' : {
                                path: 'foo',
                                href: '/foo/{item.id}',
                                prepare: function(rep, next) {
                                    setTimeout(function() {
                                        rep.link('foo:bar', 'http://www.foo.com');
                                        next();
                                    }, 500);
                                }
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: 'http://www.whitehouse.gov' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234',
                _embedded: {
                    foo: {
                        _links: {
                            self: { href: '/foo/5678' },
                            'foo:bar': { href: 'http://www.foo.com' }
                        },
                        id: '5678'
                    }
                }
            });
            done();
        });
    });
    
    it('should omit missing configured embedded entities', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', bossId: '1234', foo: {id: '5678'}});
                },
                plugins: {
                    hal: {
                        prepare: function(rep, done) {
                            rep.link('mco:boss', 'http://www.whitehouse.gov');
                            done();
                        },
                        embedded: {
                            'foo' : {
                                path: 'foo',
                                href: '/foo/{item.id}',
                                prepare: function(rep, next) {
                                    rep.link('foo:bar', 'http://www.foo.com');
                                    next();
                                }
                            },
                            'bar' : {
                                path: 'notthere',
                                href: '/bar/{item.id}'
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: 'http://www.whitehouse.gov' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234',
                _embedded: {
                    foo: {
                        _links: {
                            self: { href: '/foo/5678' },
                            'foo:bar': { href: 'http://www.foo.com' }
                        },
                        id: '5678'
                    }
                }
            });
            done();
        });
    });

    it('should allow an embedded entity to be forced to be a single element array', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith', bossId: '1234', foo: [{id: '5678'}]});
                },
                plugins: {
                    hal: {
                        prepare: function(rep, done) {
                            rep.link('mco:boss', 'http://www.whitehouse.gov');
                            done();
                        },
                        embedded: {
                            'foo' : {
                                path: 'foo',
                                href: '/foo/{item.id}',
                                prepare: function(rep, next) {
                                    rep.link('foo:bar', 'http://www.foo.com');
                                    next();
                                }
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'boss' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    'mco:boss': { href: 'http://www.whitehouse.gov' }
                },
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234',
                _embedded: {
                    foo: [{
                        _links: {
                            self: { href: '/foo/5678' },
                            'foo:bar': { href: 'http://www.foo.com' }
                        },
                        id: '5678'
                    }]
                }
            });
            done();
        });
    });

    it('should preserve 201 status code and use the location header when an entity has been POSTed', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'post',
            path: '/people',
            config: {
                handler: function (req, reply) {
                    reply({ id: 100, firstName: 'Bob', lastName: 'Smith' }).created('/people/100');
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);

        });

        server.inject({
            method: 'post',
            url: '/people',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            try {
                res.statusCode.should.equal(201);
                result = JSON.parse(res.payload);
                result.should.deep.equal({
                    _links: {
                        self: { href: '/people/100' }
                    },
                    id: 100,
                    firstName: 'Bob',
                    lastName: 'Smith'
                });
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('use of location header for absolute link generation should not break url search', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'post',
            path: '/people',
            config: {
                handler: function (req, reply) {
                    reply({ id: 100, firstName: 'Bob', lastName: 'Smith' }).created('/people/100?donotbreakthis=true');
                }
            }
        });

        server.register({
            register:halacious,
            options: {
                absolute: true
            }
        }, function (err) {
            if (err) return done(err);
        });

        server.inject({
            method: 'post',
            url: '/people',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            try {
                res.statusCode.should.equal(201);
                result = JSON.parse(res.payload);
                result.should.have.a.property('_links').that.has.a.property('self').that.has.a.property('href').that.endsWith('/people/100?donotbreakthis=true');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should support an array of acceptable media types', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                handler: function (req, reply) {
                    reply({ firstName: 'Bob', lastName: 'Smith' });
                }
            }
        });

        server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
            if (err) return done(err);
        });

        // test application/json
        server.inject({
            method: 'get',
            url: '/people/100'
        }, function (res) {
            res.statusCode.should.equal(200);
            res.headers['content-type'].should.contain('application/json');
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people/100' }
                },
                firstName: 'Bob',
                lastName: 'Smith'
            });

            // test application/hal+json
            server.inject({
                method: 'get',
                url: '/people/100',
                headers: { 'Accept': 'application/hal+json' }
            }, function (res) {
                res.statusCode.should.equal(200);
                res.headers['content-type'].should.contain('application/hal+json');
                result = JSON.parse(res.payload);
                result.should.deep.equal({
                    _links: {
                        self: { href: '/people/100' }
                    },
                    firstName: 'Bob',
                    lastName: 'Smith'
                });
                done();
            });
        });
    });

    it('should regurgitate known query parameters in the self link', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                handler: function (req, reply) {
                    reply({ items: [{ id: 100, firstName: 'Louis', lastName: 'CK' }]});
                },
                plugins: {
                    hal: {
                        embedded: {
                            items: {
                                path: 'items',
                                href: './{item.id}'
                            }
                        },
                        query: '{?q*,start,limit}'
                    }
                }
            }
        });

        server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
            if (err) return done(err);
        });

        // test application/json
        server.inject({
            method: 'get',
            url: '/people?q=funny&start=1&token=12345',
            headers: { Accept: 'application/hal+json'}
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                        self: { href: '/people?q=funny&start=1' }
                },
                _embedded: {
                    items: [
                        {
                            _links: { self: { href: '/people/100' }},
                            id: 100,
                            firstName: 'Louis',
                            lastName: 'CK'
                        }
                    ]
                }
            });
            done();
        });
    });

    it('should resolve relative locations', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'post',
            path: '/api/people',
            config: {
                handler: function (req, reply) {
                    reply({ id: 100, firstName: 'Louis', lastName: 'CK' }).created('api/people/100');
                }
            }
        });

        server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
            if (err) return done(err);
        });

        // test application/json
        server.inject({
            method: 'post',
            url: '/api/people',
            headers: { Accept: 'application/hal+json'}
        }, function (res) {
            try {
                res.statusCode.should.equal(201);
                result = JSON.parse(res.payload);
                result.should.deep.equal({
                    _links: {
                        self: { href: '/api/people/100' }
                    },
                    id: 100,
                    firstName: 'Louis',
                    lastName: 'CK'
                });
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });

    it('should preserve response headers', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });

        server.route({
            method: 'get',
            path: '/api/people/100',
            config: {
                handler: function (req, reply) {
                    reply({ id: 100, firstName: 'Louis', lastName: 'CK' }).header('Last-Modified', new Date());
                }
            }
        });

        server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
            if (err) return done(err);
        });

        // test application/json
        server.inject({
            method: 'get',
            url: '/api/people/100',
            headers: { Accept: 'application/hal+json'}
        }, function (res) {
            try {
                res.statusCode.should.equal(200);
                res.headers['content-type'].should.equal('application/hal+json');
                should.exist(res.headers['last-modified']);
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });

    describe('when the absolute flag is turned on', function () {
        it('should create an absolute self link', function (done) {
            var server = new hapi.Server();
            server.connection({ port: 9090 });

            server.route({
                method: 'get',
                path: '/api/people/100',
                config: {
                    handler: function (req, reply) {
                        reply({ id: 100, firstName: 'Louis', lastName: 'CK' });
                    },
                    plugins: {
                        hal: {
                            absolute: true
                        }
                    }
                }
            });

            server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
                if (err) return done(err);
            });

            server.inject({
                method: 'get',
                url: 'http://localhost:9090/api/people/100',
                headers: { Accept: 'application/hal+json'}
            }, function (res) {
                var result = JSON.parse(res.payload);
                result._links.self.should.have.property('href', 'http://localhost:9090/api/people/100');
                done();
            });
        });

        it('should create an absolute non-self link', function (done) {
            var server = new hapi.Server();
            server.connection({ port: 9090 });

            server.route({
                method: 'get',
                path: '/api/people/100',
                config: {
                    handler: function (req, reply) {
                        reply({ id: 100, firstName: 'Louis', lastName: 'CK' });
                    },
                    plugins: {
                        hal: {
                            absolute: true,
                            links: {
                                schedule: './schedule'
                            }
                        }
                    }
                }
            });

            server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
                if (err) return done(err);
            });

            server.inject({
                method: 'get',
                url: 'http://localhost:9090/api/people/100',
                headers: { Accept: 'application/hal+json'}
            }, function (res) {
                var result = JSON.parse(res.payload);
                result._links.schedule.should.have.property('href', 'http://localhost:9090/api/people/100/schedule');
                done();
            });
        });

        it('should embed an object with an absolute link', function (done) {
            var server = new hapi.Server();
            server.connection({ port: 9090 });

            server.route({
                method: 'get',
                path: '/api/people/100',
                config: {
                    handler: function (req, reply) {
                        reply({ firstName: 'Bob', lastName: 'Smith', boss: { firstName: 'Boss', lastName: 'Man'} });
                    },
                    plugins: {
                        hal: {
                            absolute: true,
                            embedded: {
                                'mco:boss': {
                                    path: 'boss',
                                    href: './boss'
                                }
                            }
                        }
                    }
                }
            });

            server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
                if (err) return done(err);
            });

            server.inject({
                method: 'get',
                url: 'http://localhost:9090/api/people/100',
                headers: { Accept: 'application/hal+json'}
            }, function (res) {
                var result = JSON.parse(res.payload);
                result._embedded['mco:boss']._links.self.should.have.property('href', 'http://localhost:9090/api/people/100/boss');
                done();
            });
        });

        it('should handle created entities', function (done) {
            var server = new hapi.Server();
            server.connection({ port: 9090 });

            server.route({
                method: 'post',
                path: '/api/people',
                config: {
                    handler: function (req, reply) {
                        reply({ firstName: 'Bob', lastName: 'Smith' }).created('/api/people/100');
                    },
                    plugins: {
                        hal: {
                            absolute: true
                        }
                    }
                }
            });

            server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function (err) {
                if (err) return done(err);
            });

            server.inject({
                method: 'post',
                url: 'http://localhost:9090/api/people',
                headers: { Accept: 'application/hal+json'}
            }, function (res) {
                var result = JSON.parse(res.payload);
                result._links.self.should.have.property('href', 'http://localhost:9090/api/people/100');
                done();
            });
        });
    });

    it('should support resolving embedded hrefs by ids', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply({ id: req.params.id, firstName: 'Bob', lastName: 'Smith', bossId: '1234' });
                },
                plugins: {
                    hal: {
                        query: '{?full}'
                    }
                }
            }
        });

        server.route({
            method: 'get',
            path: '/people',
            handler: function(req, reply) {
                reply({
                    items: [{ id: 100 }, { id: 200 }]
                });
            },
            config: {
                plugins: {
                    hal: {
                        embedded: {
                            'mco:person': {
                                path: 'items',
                                href: function(rep, ctx) {
                                    return rep.route('person', { id: ctx.item.id });
                                }
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'person' });
        });

        server.inject({
            method: 'get',
            url: '/people',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    self: { href: '/people' },
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }]
                },
                _embedded: {
                    'mco:person': [
                        {
                            _links: {
                                self: { href: '/people/100{?full}' }
                            },
                            id: 100
                        },
                        {
                            _links: {
                                self: { href: '/people/200{?full}' }
                            },
                            id: 200
                        }
                    ]
                }
            });
            done();
        });
    });

    it('should support resolving link hrefs by ids', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people/{id}',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply({ id: req.params.id, firstName: 'Bob', lastName: 'Smith', bossId: '1234' });
                },
                plugins: {
                    hal: {
                        query: '{?full}',
                        links: {
                            'mco:boss': function(rep, entity) {
                                return rep.route('person', { id: entity.bossId });
                            }
                        }
                    }
                }
            }
        });

        server.register(halacious, function (err) {
            if (err) return done(err);
            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'person' });
        });

        server.inject({
            method: 'get',
            url: '/people/100',
            headers: { Accept: 'application/hal+json' }
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    self: { href: '/people/100' },
                    'mco:boss': { href: '/people/1234{?full}', templated: true }
                },
                id: '100',
                firstName: 'Bob',
                lastName: 'Smith',
                bossId: '1234'
            });
            done();
        });
    });

    it('should support absolute api root hrefs', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply([]);
                },
                plugins: {
                    hal: {
                        api: 'mco:people',
                        query: '{?full}'
                    }
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true }}, function (err) {
            if (err) return done(err);

            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'person' });
        });

        server.inject({
            method: 'get',
            url: '/api/'
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    self: { href: server.info.uri + '/api/'},
                    'mco:people': { href: server.info.uri + '/people{?full}', templated: true }
                }
            });
            done();
        });
    });

    it('should embed an empty representation', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply({ employees: [] });
                },
                plugins: {
                    hal: {
                        api: 'mco:person',
                        embedded: {
                            'mco:person': {
                                path: 'employees',
                                href: '../{item.id}'
                            }
                        }
                    }
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true }}, function (err) {
            if (err) return done(err);

            server.plugins.halacious.namespaces
                .add({ name: 'mycompany', prefix: 'mco' }).rel({ name: 'person' });
        });

        server.inject({
            method: 'get',
            url: '/people'
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.deep.equal({
                _links: {
                    curies: [{ name: 'mco', href: '/rels/mycompany/{rel}', templated: true }],
                    self: { href: server.info.uri + '/people'}
                },
                _embedded: {
                    'mco:person': []
                }
            });
            done();
        });
    });

    it('should not mess with array responses', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply([{ name: 'Dick' }, { name: 'Jane' }, { name: 'Spot' }]);
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true }}, function (err) {
            if (err) return done(err);
        });

        server.inject({
            method: 'get',
            url: '/people'
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result.should.be.an.instanceOf(Array);
            result.should.have.deep.members([{ name: 'Dick' }, { name: 'Jane' }, { name: 'Spot' }]);
            done();
        });
    });

    it('should not process internal routes', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var employee = { first: 'John', last: 'Doe' };


        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply(employee);
                },
                isInternal: true
            }
        });

        server.register({ register: halacious, options: { absolute: true }}, function (err) {
            if (err) return done(err);
        });

        server.inject({
            method: 'get',
            url: '/people',
            allowInternals: true
        }, function (res) {
            res.statusCode.should.equal(200);
            res.result.should.equal(employee);
            done();
        });
    });

    it('should support external filtering of requests', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var employee = { first: 'John', last: 'Doe' };

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply(employee);
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true }}, function (err) {
            if (err) return done(err);
        });

        server.plugins.halacious.should.respondTo('filter');

        server.plugins.halacious.filter(function (request) {
            should.exist(request);
            return false;
        });

        server.inject({
            method: 'get',
            url: '/people'
        }, function (res) {
            res.statusCode.should.equal(200);
            res.result.should.equal(employee);
            done();
        });
    });

    it('should support overriding the url protocol', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var employee = { first: 'John', last: 'Doe' };

        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply(employee);
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true, protocol: 'https' }}, function (err) {
            if (err) return done(err);
        });

        server.inject({
            method: 'get',
            url: '/people'
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result._links.self.href.should.match(/https/);
            done();
        });
    });

    it('should support overriding the hostname', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var employee = { first: 'John', last: 'Doe' };

        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply(employee);
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true, host: 'www.cloud.com' }}, function (err) {
            if (err) return done(err);
        });

        server.inject({
            method: 'get',
            headers: { host: null },
            url: '/people'
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result._links.self.href.should.match(/http:\/\/www.cloud.com/);
            done();
        });
    });

    it('should support overriding the url builder', function (done) {
        var server = new hapi.Server();
        server.connection({ port: 9090 });
        var employee = { first: 'John', last: 'Doe' };

        var result;

        server.route({
            method: 'get',
            path: '/people',
            config: {
                id: 'person',
                handler: function (req, reply) {
                    reply(employee);
                }
            }
        });

        server.register({ register: halacious, options: { absolute: true }}, function (err) {
            if (err) return done(err);
        });

        server.plugins.halacious.should.respondTo('urlBuilder');

        server.plugins.halacious.urlBuilder(function (request, path, search) {
            return url.format({
                hostname: 'www.myapp.com',
                port: 12345,
                pathname: path,
                protocol: 'https',
                search: search
            });
        });

        server.inject({
            method: 'get',
            url: '/people'
        }, function (res) {
            res.statusCode.should.equal(200);
            result = JSON.parse(res.payload);
            result._links.self.href.should.match(/https:\/\/www.myapp.com:12345/);
            done();
        });
    });
});
