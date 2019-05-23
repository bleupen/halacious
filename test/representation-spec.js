'use strict';

require('module-alias/register');

const chai = require('chai');

const should = chai.should();
const hapi = require('@hapi/hapi');
const halacious = require('halacious');

const { RepresentationFactory } = require('halacious/lib/representation');

const { name: PLUGIN } = require('halacious/package.json');

describe('Representation Factory', () => {
  let server;
  let plugin;
  let representationFactory;

  beforeEach(done => {
    server = hapi.server({ port: 9090 });

    server
      .register(halacious)
      .then(() => {
        plugin = server.plugins[PLUGIN];
        representationFactory = new RepresentationFactory(plugin);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  afterEach(done => {
    server
      .stop()
      .then(done)
      .catch(done);
  });

  it('should create a new representation', () => {
    should.exist(representationFactory);
    const entity = { firstName: 'Bob', lastName: 'Smith' };
    const rep = representationFactory.create(entity, '/people');
    rep._links.should.have.property('self');
    rep._links.self.should.have.property('href', '/people');
    rep.should.have.property('entity', entity);
  });

  it('should serialize a simple entity into property JSON', () => {
    const entity = { firstName: 'Bob', lastName: 'Smith' };
    const rep = representationFactory.create(entity, '/people');
    const json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"}},"firstName":"Bob","lastName":"Smith"}'
    );
  });

  it('should create an array of like-named links', () => {
    const entity = {};
    const rep = representationFactory.create(entity, '/people');
    rep.link('mco:boss', '/people/100');
    rep.link('mco:boss', '/people/101');
    rep.link('mco:boss', '/people/102');
    rep._links['mco:boss'].should.have.length(3);
    rep._links['mco:boss'][0].should.have.property('href', '/people/100');
    rep._links['mco:boss'][1].should.have.property('href', '/people/101');
    rep._links['mco:boss'][2].should.have.property('href', '/people/102');
  });

  it('should create a single-element array of links', () => {
    const entity = {};
    const rep = representationFactory.create(entity, '/people');
    rep.link('mco:boss', ['/people/100']);
    rep._links['mco:boss'].should.have.length(1);
    rep._links['mco:boss'][0].should.have.property('href', '/people/100');
  });

  it('should create an array of like-named embeds', () => {
    const entity = {};
    const rep = representationFactory.create(entity, '/people');
    rep.embed('mco:boss', '/people/100', {});
    rep.embed('mco:boss', '/people/101', {});
    rep.embed('mco:boss', '/people/102', {});
    rep._embedded['mco:boss'].should.have.length(3);
    rep._embedded['mco:boss'][0]._links.self.should.have.property(
      'href',
      '/people/100'
    );
    rep._embedded['mco:boss'][1]._links.self.should.have.property(
      'href',
      '/people/101'
    );
    rep._embedded['mco:boss'][2]._links.self.should.have.property(
      'href',
      '/people/102'
    );
  });

  it('should ignore properties', () => {
    const obj = { id: 100, first: 'John', last: 'Smith' };
    const rep = representationFactory.create(obj, '/people');
    rep.ignore('id', 'first');
    const json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"}},"last":"Smith"}'
    );
  });

  it('should support extra properties', () => {
    const obj = { id: 100, first: 'John', last: 'Smith' };
    const rep = representationFactory.create(obj, '/people');
    rep.ignore('id');
    rep.prop('company', 'ACME');
    const json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"}},"first":"John","last":"Smith","company":"ACME"}'
    );
  });

  it('should support objects with custom json serialization', () => {
    const entity = {
      _id: 100,
      _hidden: 'hidden',
      name: 'John Smith',
      company: 'Acme',
      toJSON() {
        return {
          id: this._id,
          name: this.name,
          company: this.company,
          boss: this.boss
        };
      },
      boss: {
        _id: 100,
        _hidden: 'hidden',
        name: 'Boss Man',
        company: 'Acme',
        toJSON() {
          return {
            id: this._id,
            name: this.name,
            company: this.company
          };
        }
      }
    };

    const rep = representationFactory.create(entity, '/me');
    const json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/me"}},"id":100,"name":"John Smith","company":"Acme","boss":{"id":100,"name":"Boss Man","company":"Acme"}}'
    );
  });

  it('should handle direct call toJSON correctly', () => {
    const entity = {
      _id: 100,
      _hidden: 'hidden',
      name: 'John Smith',
      company: 'Acme',
      toJSON() {
        return {
          id: this._id,
          name: this.name,
          company: this.company
        };
      }
    };

    const boss = {
      _id: 100,
      _hidden: 'hidden',
      name: 'Boss Man',
      company: 'Acme',
      toJSON() {
        return {
          id: this._id,
          name: this.name,
          company: this.company
        };
      }
    };

    const rep = representationFactory.create(entity, '/me');

    // Should embed array of objects correctly
    rep.embed('mco:boss', './boss', [boss]);

    // Should embed single object correctly
    rep.embed('mco:boss2', './boss2', boss);

    const json = rep.toJSON();
    json.should.deep.equal({
      _links: { self: { href: '/me' } },
      id: 100,
      name: 'John Smith',
      company: 'Acme',
      _embedded: {
        'mco:boss': [
          {
            _links: { self: { href: '/me/boss' } },
            id: 100,
            name: 'Boss Man',
            company: 'Acme'
          }
        ],
        'mco:boss2': {
          _links: { self: { href: '/me/boss2' } },
          id: 100,
          name: 'Boss Man',
          company: 'Acme'
        }
      }
    });
  });

  it('should link to a registered rel', () => {
    plugin.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    const entity = { firstName: 'Bob', lastName: 'Smith' };
    const rep = representationFactory.create(entity, '/people');
    rep.link('mco:boss', '/people/1234');
    rep._links.should.have.property('mco:boss');
    rep._links['mco:boss'].should.have.property('href', '/people/1234');
  });

  it('should not break when linking an empty array', () => {
    const rep = representationFactory.create({ firstName: 'Bob' }, '/people');
    rep.link('employees', []);
    rep._links.should.have.property('employees').that.has.length(0);
  });

  it('should resolve relative paths', () => {
    const entity = { firstName: 'Bob', lastName: 'Smith' };
    const rep = representationFactory.create(entity, '/people');
    rep.resolve('./1234').should.equal('/people/1234');
    rep.resolve('../1234').should.equal('/1234');
    rep.resolve('/companies/100').should.equal('/companies/100');
  });

  it('should include a curie link', () => {
    plugin.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    const rep = representationFactory.create({}, '/people');
    rep.link('mco:boss', '/people/1234');
    const json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"},"curies":[{"name":"mco","href":"/rels/mycompany/{rel}","templated":true}],"mco:boss":{"href":"/people/1234"}}}'
    );
  });

  it('should embed an entity', () => {
    plugin.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    const rep = representationFactory.create(
      { firstName: 'Bob', lastName: 'Smith' },
      '/people/me'
    );
    rep.embed('mco:boss', './boss', {
      firstName: 'Boss',
      lastName: 'Man'
    });

    const json = JSON.stringify(rep);
    const obj = JSON.parse(json);
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
          _links: { self: { href: '/people/me/boss' } },
          firstName: 'Boss',
          lastName: 'Man'
        }
      }
    });
  });

  it('should embed an empty array', () => {
    plugin.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    const rep = representationFactory.create(
      { firstName: 'Bob', lastName: 'Smith' },
      '/people/me'
    );
    rep.embed('mco:boss', './boss', []);

    const json = JSON.stringify(rep);
    const obj = JSON.parse(json);
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
        'mco:boss': []
      }
    });
  });

  it('should use top level curie link', () => {
    plugin.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    plugin.namespaces
      .add({ name: 'google', prefix: 'goog' })
      .rel({ name: 'profile' });

    const rep = representationFactory.create(
      { firstName: 'Bob', lastName: 'Smith' },
      '/people/me'
    );
    const boss = rep.embed('mco:boss', './boss', {
      firstName: 'Boss',
      lastName: 'Man'
    });
    boss.link('goog:profile', 'http://users.google.com/BossMan');
    const json = JSON.stringify(rep);
    const obj = JSON.parse(json);
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
