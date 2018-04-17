/* eslint-disable no-underscore-dangle */
/* eslint-env node, mocha */
let chai = require('chai');

let should = chai.should();
let hapi = require('hapi');
let { RepresentationFactory } = require('../lib/representation');

let halacious;
let rf;

describe('Representation Factory', () => {
  beforeEach(done => {
    const server = new hapi.Server({ port: 9090 });
    server
      .register(require('..'))
      .then(() => {
        // eslint-disable-next-line prefer-destructuring
        halacious = server.plugins.halacious;
        rf = new RepresentationFactory(halacious);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should create a new representation', () => {
    should.exist(rf);
    let entity = { firstName: 'Bob', lastName: 'Smith' };
    let rep = rf.create(entity, '/people');
    rep._links.should.have.property('self');
    rep._links.self.should.have.property('href', '/people');
    rep.should.have.property('entity', entity);
  });

  it('should serialize a simple entity into property JSON', () => {
    let entity = { firstName: 'Bob', lastName: 'Smith' };
    let rep = rf.create(entity, '/people');
    let json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"}},"firstName":"Bob","lastName":"Smith"}'
    );
  });

  it('should create an array of like-named links', () => {
    let entity = {};
    let rep = rf.create(entity, '/people');
    rep.link('mco:boss', '/people/100');
    rep.link('mco:boss', '/people/101');
    rep.link('mco:boss', '/people/102');
    rep._links['mco:boss'].should.have.length(3);
    rep._links['mco:boss'][0].should.have.property('href', '/people/100');
    rep._links['mco:boss'][1].should.have.property('href', '/people/101');
    rep._links['mco:boss'][2].should.have.property('href', '/people/102');
  });

  it('should create a single-element array of links', () => {
    let entity = {};
    let rep = rf.create(entity, '/people');
    rep.link('mco:boss', ['/people/100']);
    rep._links['mco:boss'].should.have.length(1);
    rep._links['mco:boss'][0].should.have.property('href', '/people/100');
  });

  it('should create an array of like-named embeds', () => {
    let entity = {};
    let rep = rf.create(entity, '/people');
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
    let obj = { id: 100, first: 'John', last: 'Smith' };
    let rep = rf.create(obj, '/people');
    rep.ignore('id', 'first');
    let json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"}},"last":"Smith"}'
    );
  });

  it('should support extra properties', () => {
    let obj = { id: 100, first: 'John', last: 'Smith' };
    let rep = rf.create(obj, '/people');
    rep.ignore('id');
    rep.prop('company', 'ACME');
    let json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"}},"first":"John","last":"Smith","company":"ACME"}'
    );
  });

  it('should support objects with custom json serialization', () => {
    let entity = {
      _id: 100,
      _hidden: 'hidden',
      name: 'John Smith',
      company: 'Acme',
      toJSON() {
        return {
          id: this._id,
          name: this.name,
          company: this.company,
          boss: this.boss,
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
            company: this.company,
          };
        },
      },
    };

    let rep = rf.create(entity, '/me');
    let json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/me"}},"id":100,"name":"John Smith","company":"Acme","boss":{"id":100,"name":"Boss Man","company":"Acme"}}'
    );
  });

  it('should handle direct call toJSON correctly', () => {
    let entity = {
      _id: 100,
      _hidden: 'hidden',
      name: 'John Smith',
      company: 'Acme',
      toJSON() {
        return {
          id: this._id,
          name: this.name,
          company: this.company,
        };
      },
    };

    let boss = {
      _id: 100,
      _hidden: 'hidden',
      name: 'Boss Man',
      company: 'Acme',
      toJSON() {
        return {
          id: this._id,
          name: this.name,
          company: this.company,
        };
      },
    };

    let rep = rf.create(entity, '/me');

    // Should embed array of objects correctly
    rep.embed('mco:boss', './boss', [boss]);

    // Should embed single object correctly
    rep.embed('mco:boss2', './boss2', boss);

    let json = rep.toJSON();
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
            company: 'Acme',
          },
        ],
        'mco:boss2': {
          _links: { self: { href: '/me/boss2' } },
          id: 100,
          name: 'Boss Man',
          company: 'Acme',
        },
      },
    });
  });

  it('should link to a registered rel', () => {
    halacious.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    let entity = { firstName: 'Bob', lastName: 'Smith' };
    let rep = rf.create(entity, '/people');
    rep.link('mco:boss', '/people/1234');
    rep._links.should.have.property('mco:boss');
    rep._links['mco:boss'].should.have.property('href', '/people/1234');
  });

  it('should not break when linking an empty array', () => {
    let rep = rf.create({ firstName: 'Bob' }, '/people');
    rep.link('employees', []);
    rep._links.should.have.property('employees').that.has.length(0);
  });

  it('should resolve relative paths', () => {
    let entity = { firstName: 'Bob', lastName: 'Smith' };
    let rep = rf.create(entity, '/people');
    rep.resolve('./1234').should.equal('/people/1234');
    rep.resolve('../1234').should.equal('/1234');
    rep.resolve('/companies/100').should.equal('/companies/100');
  });

  it('should include a curie link', () => {
    halacious.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    let rep = rf.create({}, '/people');
    rep.link('mco:boss', '/people/1234');
    let json = JSON.stringify(rep);
    json.should.deep.equal(
      '{"_links":{"self":{"href":"/people"},"curies":[{"name":"mco","href":"/rels/mycompany/{rel}","templated":true}],"mco:boss":{"href":"/people/1234"}}}'
    );
  });

  it('should embed an entity', () => {
    halacious.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    let rep = rf.create({ firstName: 'Bob', lastName: 'Smith' }, '/people/me');
    rep.embed('mco:boss', './boss', {
      firstName: 'Boss',
      lastName: 'Man',
    });

    let json = JSON.stringify(rep);
    let obj = JSON.parse(json);
    obj.should.deep.equal({
      _links: {
        self: { href: '/people/me' },
        curies: [
          { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
        ],
      },
      firstName: 'Bob',
      lastName: 'Smith',
      _embedded: {
        'mco:boss': {
          _links: { self: { href: '/people/me/boss' } },
          firstName: 'Boss',
          lastName: 'Man',
        },
      },
    });
  });

  it('should embed an empty array', () => {
    halacious.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    let rep = rf.create({ firstName: 'Bob', lastName: 'Smith' }, '/people/me');
    rep.embed('mco:boss', './boss', []);

    let json = JSON.stringify(rep);
    let obj = JSON.parse(json);
    obj.should.deep.equal({
      _links: {
        self: { href: '/people/me' },
        curies: [
          { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
        ],
      },
      firstName: 'Bob',
      lastName: 'Smith',
      _embedded: {
        'mco:boss': [],
      },
    });
  });

  it('should use top level curie link', () => {
    halacious.namespaces
      .add({ name: 'mycompany', prefix: 'mco' })
      .rel({ name: 'boss' });

    halacious.namespaces
      .add({ name: 'google', prefix: 'goog' })
      .rel({ name: 'profile' });

    let rep = rf.create({ firstName: 'Bob', lastName: 'Smith' }, '/people/me');
    let boss = rep.embed('mco:boss', './boss', {
      firstName: 'Boss',
      lastName: 'Man',
    });
    boss.link('goog:profile', 'http://users.google.com/BossMan');
    let json = JSON.stringify(rep);
    let obj = JSON.parse(json);
    obj.should.deep.equal({
      _links: {
        self: { href: '/people/me' },
        curies: [
          { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
          { name: 'goog', href: '/rels/google/{rel}', templated: true },
        ],
      },
      firstName: 'Bob',
      lastName: 'Smith',
      _embedded: {
        'mco:boss': {
          _links: {
            self: { href: '/people/me/boss' },
            'goog:profile': { href: 'http://users.google.com/BossMan' },
          },
          firstName: 'Boss',
          lastName: 'Man',
        },
      },
    });
  });
});
