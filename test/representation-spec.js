'use strict';

var chai = require('chai');
var should = chai.should();
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
        var rep = rf.create(entity, '/people');
        rep._links.should.have.property('self');
        rep._links.self.should.have.property('href', '/people');
        rep.should.have.property('entity', entity);
    });

    it('should serialize a simple entity into property JSON', function () {
        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create(entity, '/people');
        var json = JSON.stringify(rep);
        json.should.deep.equal('{"_links":{"self":{"href":"/people"}},"firstName":"Bob","lastName":"Smith"}');
    });

    it('should create an array of like-named links', function () {
        var entity = {};
        var rep = rf.create(entity, '/people');
        rep.link('mco:boss', '/people/100');
        rep.link('mco:boss', '/people/101');
        rep.link('mco:boss', '/people/102');
        rep._links['mco:boss'].should.have.length(3);
        rep._links['mco:boss'][0].should.have.property('href', '/people/100');
        rep._links['mco:boss'][1].should.have.property('href', '/people/101');
        rep._links['mco:boss'][2].should.have.property('href', '/people/102');
    });
    
    it('should create a single-element array of links', function () {
        var entity = {};
        var rep = rf.create(entity, '/people');
        rep.link('mco:boss', ['/people/100']);
        rep._links['mco:boss'].should.have.length(1);
        rep._links['mco:boss'][0].should.have.property('href', '/people/100');
    });

    it('should create an array of like-named embeds', function () {
        var entity = {};
        var rep = rf.create(entity, '/people');
        rep.embed('mco:boss', '/people/100', {});
        rep.embed('mco:boss', '/people/101', {});
        rep.embed('mco:boss', '/people/102', {});
        rep._embedded['mco:boss'].should.have.length(3);
        rep._embedded['mco:boss'][0]._links.self.should.have.property('href', '/people/100');
        rep._embedded['mco:boss'][1]._links.self.should.have.property('href', '/people/101');
        rep._embedded['mco:boss'][2]._links.self.should.have.property('href', '/people/102');
    });

    it('should ignore properties', function () {
        var obj = { id: 100, first: 'John', last: 'Smith'};
        var rep = rf.create(obj, '/people');
        rep.ignore('id', 'first');
        var json = JSON.stringify(rep);
        json.should.deep.equal('{"_links":{"self":{"href":"/people"}},"last":"Smith"}');
    });

    it('should support extra properties', function () {
        var obj = { id: 100, first: 'John', last: 'Smith'};
        var rep = rf.create(obj, '/people');
        rep.ignore('id');
        rep.prop('company', 'ACME');
        var json = JSON.stringify(rep);
        json.should.deep.equal('{"_links":{"self":{"href":"/people"}},"first":"John","last":"Smith","company":"ACME"}');
    });

    it('should support objects with custom json serialization', function () {
        var entity = {
            _id: 100,
            _hidden: 'hidden',
            name: 'John Smith',
            company: 'Acme',
            toJSON: function () {
                return {
                    id: this._id,
                    name: this.name,
                    company: this.company,
                    boss: this.boss
                }
            },
            boss: {
                _id: 100,
                _hidden: 'hidden',
                name: 'Boss Man',
                company: 'Acme',
                toJSON: function () {
                    return {
                        id: this._id,
                        name: this.name,
                        company: this.company
                    }
                }
            }
        };

        var rep = rf.create(entity, '/me');
        var json = JSON.stringify(rep);
        json.should.deep.equal('{"_links":{"self":{"href":"/me"}},"id":100,"name":"John Smith","company":"Acme","boss":{"id":100,"name":"Boss Man","company":"Acme"}}');
    });

    it('should link to a registered rel', function () {
        var ns = halacious.namespaces
            .add({ name: 'mycompany', prefix: 'mco' })
            .rel({ name: 'boss' });

        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create(entity, '/people');
        rep.link('mco:boss', '/people/1234');
        rep._links.should.have.property('mco:boss');
        rep._links['mco:boss'].should.have.property('href', '/people/1234');
    });

    it('should resolve relative paths', function () {
        var entity = { firstName: 'Bob', lastName: 'Smith' };
        var rep = rf.create(entity, '/people');
        var href = rep.resolve('./1234');
        href.should.equal('/people/1234');
    });

    it('should include a curie link', function () {
        halacious.namespaces
            .add({ name: 'mycompany', prefix: 'mco' })
            .rel({ name: 'boss' });

        var rep = rf.create({}, '/people');
        rep.link('mco:boss', '/people/1234');
        var json = JSON.stringify(rep);
        json.should.deep.equal('{"_links":{"self":{"href":"/people"},"curies":[{"name":"mco","href":"/rels/mycompany/{rel}","templated":true}],"mco:boss":{"href":"/people/1234"}}}');
    });

    it('should embed an entity', function () {
        halacious.namespaces
            .add({ name: 'mycompany', prefix: 'mco' })
            .rel({ name: 'boss' });

        var rep = rf.create({ firstName: 'Bob', lastName: 'Smith' }, '/people/me');
        var boss = rep.embed('mco:boss', './boss', { firstName: 'Boss', lastName: 'Man'});

        var json = JSON.stringify(rep);
        var obj = JSON.parse(json);
        obj.should.deep.equal({
            _links: {
                self: { href: '/people/me' },
                curies: [
                    { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
                ]
            },
            firstName: 'Bob',
            lastName: 'Smith',
            _embedded: {
                'mco:boss': {
                    _links: { self: { href: '/people/me/boss' }},
                    firstName: 'Boss',
                    lastName: 'Man'
                }
            }
        });
    });

    it('should use top level curie link', function () {
        halacious.namespaces
            .add({ name: 'mycompany', prefix: 'mco' })
            .rel({ name: 'boss' });

        halacious.namespaces
            .add({ name: 'google', prefix: 'goog' })
            .rel({ name: 'profile' });

        var rep = rf.create({ firstName: 'Bob', lastName: 'Smith' }, '/people/me');
        var boss = rep.embed('mco:boss', './boss', { firstName: 'Boss', lastName: 'Man'});
        boss.link('goog:profile', 'http://users.google.com/BossMan');
        var json = JSON.stringify(rep);
        var obj = JSON.parse(json);
        obj.should.deep.equal({
            _links: {
                self: { href: '/people/me' },
                curies: [
                    { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
                    { name: 'goog', href: '/rels/google/{rel}', templated: true }
                ]
            },
            firstName: 'Bob',
            lastName: 'Smith',
            _embedded: {
                'mco:boss': {
                    _links: {
                        self: { href: '/people/me/boss' },
                        'goog:profile': { href: 'http://users.google.com/BossMan' }
                    },
                    firstName: 'Boss',
                    lastName: 'Man'
                }
            }
        });
    });
});