'use strict';

require('module-alias/register');

const chai = require('chai');

const should = chai.should();
const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiString = require('chai-string');
const halacious = require('halacious');
const { plugin } = require('halacious/lib/plugin');
const _ = require('lodash');
const url = require('url');

chai.use(sinonChai);
chai.use(chaiString);

const { name: PLUGIN } = require('halacious/package.json');

describe('Halacious Plugin', () => {
  let server;

  beforeEach(done => {
    server = hapi.server({ port: 9090 });

    done();
  });

  afterEach(done => {
    server
      .stop()
      .then(done)
      .catch(done);
  });

  it('should have a registration function', () => {
    plugin.should.have.property('register');
    plugin.register.should.be.a('Function');
  });

  it('should expose a namespace function', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.should.have.property('namespaces');
        plugin.namespace.should.be.a('Function');
      })
      .then(done)
      .catch(done);
  });

  it('should create a namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const namespace = plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        should.exist(namespace);
        namespace.should.have.property('name', 'mycompany');
        namespace.should.have.property('prefix', 'mco');
        namespace.should.have.property('rel');
        namespace.rel.should.be.a('Function');
      })
      .then(done)
      .catch(done);
  });

  it('should look up a namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        const namespace = plugin.namespace('mycompany');
        namespace.rel({ name: 'boss', description: 'An employees boss' });
        namespace.rels.should.have.property('boss');
        namespace.rels.boss.should.have.property('name', 'boss');
        namespace.rels.boss.should.have.property(
          'description',
          'An employees boss'
        );
      })
      .then(done)
      .catch(done);
  });

  it('should return a sorted array of namespaces', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces.add({
          name: 'yourcompany',
          prefix: 'yco'
        });

        plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        plugin.namespaces.add({
          name: 'ourcompany',
          prefix: 'oco'
        });

        const namespaces = plugin.namespaces();
        namespaces.should.have.length(3);
        namespaces[0].should.have.property('name', 'mycompany');
        namespaces[1].should.have.property('name', 'ourcompany');
        namespaces[2].should.have.property('name', 'yourcompany');
      })
      .then(done)
      .catch(done);
  });

  it('should fail when registering an invalid namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces.add
          .bind(plugin.namespaces, {
            name: 'mycompany',
            prefirx: 'mco'
          })
          .should.throw('"prefirx" is not allowed');
      })
      .then(done)
      .catch(done); // shouldn't be called
  });

  it('should add a rel to a namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const namespace = plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        namespace.rel({ name: 'boss', description: 'An employees boss' });
        namespace.rels.should.have.property('boss');
        namespace.rels.boss.should.have.property('name', 'boss');
        namespace.rels.boss.should.have.property(
          'description',
          'An employees boss'
        );
      })
      .then(done)
      .catch(done);
  });

  it('should look up a rel by prefix:name', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const namespace = plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        namespace.rel({
          name: 'datasources',
          description: 'A list of datasources'
        });

        const rel = plugin.rel('mco:datasources');

        should.exist(rel);
        rel.should.have.property('name', 'datasources');
        rel.should.have.property('description', 'A list of datasources');
      })
      .then(done)
      .catch(done);
  });

  it('should remove a namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        plugin.namespaces.add({
          name: 'yourcompany',
          prefix: 'yco'
        });

        plugin.namespaces().should.have.length(2);

        plugin.namespaces.remove('yourcompany');

        plugin.namespaces().should.have.length(1);

        plugin.namespaces()[0].should.have.property('name', 'mycompany');
      })
      .then(done)
      .catch(done);
  });

  it('should look up a rel by namespace / name', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const namespace = plugin.namespaces.add({
          name: 'mycompany',
          prefix: 'mco'
        });

        namespace.rel({
          name: 'datasources',
          description: 'A list of datasources'
        });

        const rel = plugin.rel('mycompany', 'datasources');

        should.exist(rel);
        rel.should.have.property('name', 'datasources');
        rel.should.have.property('description', 'A list of datasources');
      })
      .then(done)
      .catch(done);
  });

  it('should add a rel to a specified namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces.add({ name: 'thiscompany', prefix: 'tco' });

        plugin.rels.add('thiscompany', 'a_rel');

        plugin.rels.add('thiscompany', { name: 'b_rel' });

        const rels = _.values(plugin.namespace('thiscompany').rels);

        rels.should.have.length(2);
        _.map(rels, 'name').should.deep.equal(['a_rel', 'b_rel']);
      })
      .then(done)
      .catch(done);
  });

  it('should return a sorted list of rels', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel('a_rel')
          .rel('c_rel');

        plugin.namespaces
          .add({ name: 'yourcompany', prefix: 'yco' })
          .rel('b_rel')
          .rel('d_rel');

        const rels = plugin.rels();

        rels.should.have.length(4);
        _.map(rels, 'name').should.deep.equal([
          'a_rel',
          'b_rel',
          'c_rel',
          'd_rel'
        ]);
      })
      .then(done)
      .catch(done);
  });

  it('should bomb on a bad rel in strict mode', done => {
    server.route({
      method: 'get',
      path: '/foo',
      config: {
        handler() {
          return { name: 'Billy Bob' };
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

    server
      .register({ plugin: halacious, options: { strict: true } })
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces.add({
          dir: `${__dirname}/rels/mycompany`,
          prefix: 'mco'
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/foo',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(500);
      })
      .then(done)
      .catch(done);
  });

  it('should install a directory-style namespace', done => {
    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const namespace = plugin.namespaces.add({
          dir: `${__dirname}/rels/mycompany`,
          prefix: 'mco'
        });

        const rel1 = plugin.rel('mco:datasources');

        const rel2 = plugin.rel('mco:datasource');

        should.exist(namespace);
        should.exist(rel1);
        should.exist(rel2);

        rel1.should.have.property('name', 'datasources');
        rel2.should.have.property('name', 'datasource');
      })
      .then(done)
      .catch(done);
  });

  it('should route rel documentation', done => {
    server
      .register(vision)
      .then(() => server.register(halacious))
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.namespaces.add({
          dir: `${__dirname}/rels/mycompany`,
          prefix: 'mco'
        });
      })
      .then(() => server.start())
      .then(() =>
        server.inject({
          method: 'get',
          url: '/rels/mycompany/boss'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.payload.should.not.be.empty;
      })
      .then(done)
      .catch(done);
  });

  it('should resolve a named route path', done => {
    server.route({
      method: 'get',
      path: '/{a}/{b}/{c}',
      config: {
        handler(req) {
          return { a: req.params.a, b: req.params.b, c: req.params.c };
        },
        plugins: {
          hal: {
            name: 'test-route'
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const path = plugin.route('test-route', {
          a: 'i',
          b: 'aint',
          c: 'fack'
        });

        path.should.equal('/i/aint/fack');
      })
      .then(done)
      .catch(done);
  });

  it('should encode parameter values when resolving a named route', done => {
    server.route({
      method: 'get',
      path: '/deez/treez/{foo}/{bar}',
      config: {
        handler(req) {
          return { foo: req.params.foo, bar: req.params.bar };
        },
        plugins: {
          hal: {
            name: 'deez-treez'
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        const path = plugin.route('deez-treez', {
          foo: 'are/fire',
          bar: 'proof'
        });

        path.should.not.equal('/deez/treez/are/fire/proof');
        path.should.equal('/deez/treez/are%2Ffire/proof');
      })
      .then(done)
      .catch(done);
  });

  it('should passively ignore child objects in parameter hash when resolving a named route', done => {
    server.route({
      method: 'get',
      path: '/deez/treez/{foo}/{bar}',
      config: {
        handler(req) {
          return { foo: req.params.foo, bar: req.params.bar };
        },
        plugins: {
          hal: {
            name: 'deez-treez'
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.route.bind(halacious, 'deez-treez', {
          foo: 'are',
          bar: 'fire/proof',
          things: { should: 'not break' }
        }).should.not.throw;

        const path = plugin.route('deez-treez', {
          foo: 'are',
          bar: 'fire/proof',
          things: { should: 'not break' }
        });

        path.should.not.equal('/deez/treez/are/fire/proof');
        path.should.equal('/deez/treez/are/fire%2Fproof');
      })
      .then(done)
      .catch(done);
  });

  it('should handle presence of optional Hapi route parameters in a named route', done => {
    server.route({
      method: 'get',
      path: '/deez/treez/{are?}',
      config: {
        handler(req) {
          return { foo: req.params.foo };
        },
        plugins: {
          hal: {
            name: 'deez-treez'
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        let path = null;
        const fn = function() {
          const {
            plugins: { [PLUGIN]: plugin }
          } = server;

          path = plugin.route('deez-treez', {
            are: 'fireproof'
          });
        };

        fn.should.not.throw(Error);

        should.exist(path);
        path.should.equal('/deez/treez/fireproof');
      })
      .then(done)
      .catch(done);
  });

  it('should convert a json entity into a HAL representation with self and a simple link', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            'mco:boss': { href: '/people/100/boss' }
          },
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should convert a json entity into a HAL representation with self and a templated link', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith', bossId: '1234' };
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            'mco:boss': { href: '/people/1234', title: 'Boss' }
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should allow for programmatic population of a hal entity', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith', bossId: '1234' };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            }
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' }
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should support a hal configuration function', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith', bossId: '1234' };
        },
        plugins: {
          hal(rep, done) {
            rep.link('mco:boss', 'http://www.whitehouse.gov');
            done();
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' }
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should embed an object property', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            boss: { firstName: 'Boss', lastName: 'Man' }
          };
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ]
          },
          firstName: 'Bob',
          lastName: 'Smith',
          _embedded: {
            'mco:boss': {
              _links: { self: { href: '/people/100/boss' } },
              firstName: 'Boss',
              lastName: 'Man'
            }
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should support embedded url templates', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            id: 100,
            firstName: 'Bob',
            lastName: 'Smith',
            boss: { id: 200, firstName: 'Boss', lastName: 'Man' }
          };
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ]
          },
          id: 100,
          firstName: 'Bob',
          lastName: 'Smith',
          _embedded: {
            'mco:boss': {
              _links: { self: { href: '/people/100/200' } },
              id: 200,
              firstName: 'Boss',
              lastName: 'Man'
            }
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should provide embedded collection support', done => {
    server.route({
      method: 'get',
      path: '/people',
      config: {
        handler() {
          return {
            start: 0,
            count: 2,
            total: 2,
            items: [
              { id: 100, firstName: 'Bob', lastName: 'Smith' },
              { id: 200, firstName: 'Boss', lastName: 'Man' }
            ]
          };
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ]
          },
          start: 0,
          count: 2,
          total: 2,
          _embedded: {
            'mco:person': [
              {
                _links: {
                  self: { href: '/people/100' },
                  'mco:boss': { href: '/people/100/boss' }
                },
                id: 100,
                firstName: 'Bob',
                lastName: 'Smith'
              },
              {
                _links: {
                  self: { href: '/people/200' },
                  'mco:boss': { href: '/people/200/boss' }
                },
                id: 200,
                firstName: 'Boss',
                lastName: 'Man'
              }
            ]
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should invoke an optional toHal() method on the source entity', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            toHal(rep, done) {
              rep.link('mco:boss', './boss');
              done();
            }
          };
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            'mco:boss': { href: '/people/100/boss' }
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234'
        });
      })
      .then(done)
      .catch(done);
  });

  it("should allow for programmatic population of a hal entity and it's configured embedded entities", done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            foo: { id: '5678' }
          };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
            embedded: {
              foo: {
                path: 'foo',
                href: '/foo/{item.id}',
                prepare(rep, next) {
                  setTimeout(() => {
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
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
      })
      .then(done)
      .catch(done);
  });

  it('should omit missing configured embedded entities', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            foo: { id: '5678' }
          };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
            embedded: {
              foo: {
                path: 'foo',
                href: '/foo/{item.id}',
                prepare(rep, next) {
                  rep.link('foo:bar', 'http://www.foo.com');
                  next();
                }
              },
              bar: {
                path: 'notthere',
                href: '/bar/{item.id}'
              }
            }
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
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
      })
      .then(done)
      .catch(done);
  });

  it('should allow an embedded entity to be forced to be a single element array', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            foo: [{ id: '5678' }]
          };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
            embedded: {
              foo: {
                path: 'foo',
                href: '/foo/{item.id}',
                prepare(rep, next) {
                  rep.link('foo:bar', 'http://www.foo.com');
                  next();
                }
              }
            }
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' }
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
          _embedded: {
            foo: [
              {
                _links: {
                  self: { href: '/foo/5678' },
                  'foo:bar': { href: 'http://www.foo.com' }
                },
                id: '5678'
              }
            ]
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should preserve 201 status code and use the location header when an entity has been POSTed', done => {
    server.route({
      method: 'post',
      path: '/people',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Bob', lastName: 'Smith' })
            .created('/people/100');
        }
      }
    });

    server
      .register(halacious)
      .then(() =>
        server.inject({
          method: 'post',
          url: '/people',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(201);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' }
          },
          id: 100,
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(done)
      .catch(done);
  });

  it('use of location header for absolute link generation should not break url search', done => {
    server.route({
      method: 'post',
      path: '/people',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Bob', lastName: 'Smith' })
            .created('/people/100?donotbreakthis=true');
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: {
          absolute: true
        }
      })
      .then(() =>
        server.inject({
          method: 'post',
          url: '/people',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(201);

        const result = JSON.parse(res.payload);

        result.should.have.a
          .property('_links')
          .that.has.a.property('self')
          .that.has.a.property('href')
          .that.endsWith('/people/100?donotbreakthis=true');
      })
      .then(done)
      .catch(done);
  });

  it('should support an array of acceptable media types', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] }
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/json');

        const result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' }
          },
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/hal+json');

        const result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' }
          },
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should regurgitate known query parameters in the self link', done => {
    server.route({
      method: 'get',
      path: '/people',
      config: {
        handler() {
          return { items: [{ id: 100, firstName: 'Louis', lastName: 'CK' }] };
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

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] }
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people?q=funny&start=1&token=12345',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people?q=funny&start=1' }
          },
          _embedded: {
            items: [
              {
                _links: { self: { href: '/people/100' } },
                id: 100,
                firstName: 'Louis',
                lastName: 'CK'
              }
            ]
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should resolve relative locations', done => {
    server.route({
      method: 'post',
      path: '/api/people',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Louis', lastName: 'CK' })
            .created('api/people/100');
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] }
      })
      .then(() =>
        server.inject({
          method: 'post',
          url: '/api/people',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(201);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/api/people/100' }
          },
          id: 100,
          firstName: 'Louis',
          lastName: 'CK'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should preserve response headers', done => {
    server.route({
      method: 'get',
      path: '/api/people/100',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Louis', lastName: 'CK' })
            .header('Last-Modified', new Date());
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] }
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/api/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.equal('application/hal+json');

        should.exist(res.headers['last-modified']);
      })
      .then(done)
      .catch(done);
  });

  describe('when the absolute flag is turned on', () => {
    it('should create an absolute self link', done => {
      server.route({
        method: 'get',
        path: '/api/people/100',
        config: {
          handler() {
            return { id: 100, firstName: 'Louis', lastName: 'CK' };
          },
          plugins: {
            hal: {
              absolute: true
            }
          }
        }
      });

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] }
        })
        .then(() =>
          server.inject({
            method: 'get',
            url: 'http://localhost:9090/api/people/100',
            headers: { Accept: 'application/hal+json' }
          })
        )
        .then(res => {
          const result = JSON.parse(res.payload);
          result._links.self.should.have.property(
            'href',
            'http://localhost:9090/api/people/100'
          );
        })
        .then(done)
        .catch(done);
    });

    it('should create an absolute non-self link', done => {
      server.route({
        method: 'get',
        path: '/api/people/100',
        config: {
          handler() {
            return { id: 100, firstName: 'Louis', lastName: 'CK' };
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

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] }
        })
        .then(() =>
          server.inject({
            method: 'get',
            url: 'http://localhost:9090/api/people/100',
            headers: { Accept: 'application/hal+json' }
          })
        )
        .then(res => {
          const result = JSON.parse(res.payload);
          result._links.schedule.should.have.property(
            'href',
            'http://localhost:9090/api/people/100/schedule'
          );
        })
        .then(done)
        .catch(done);
    });

    it('should embed an object with an absolute link', done => {
      server.route({
        method: 'get',
        path: '/api/people/100',
        config: {
          handler() {
            return {
              firstName: 'Bob',
              lastName: 'Smith',
              boss: { firstName: 'Boss', lastName: 'Man' }
            };
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

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] }
        })
        .then(() =>
          server.inject({
            method: 'get',
            url: 'http://localhost:9090/api/people/100',
            headers: { Accept: 'application/hal+json' }
          })
        )
        .then(res => {
          const result = JSON.parse(res.payload);
          result._embedded['mco:boss']._links.self.should.have.property(
            'href',
            'http://localhost:9090/api/people/100/boss'
          );
        })
        .then(done)
        .catch(done);
    });

    it('should handle created entities', done => {
      server.route({
        method: 'post',
        path: '/api/people',
        config: {
          handler(req, h) {
            return h
              .response({ firstName: 'Bob', lastName: 'Smith' })
              .created('/api/people/100');
          },
          plugins: {
            hal: {
              absolute: true
            }
          }
        }
      });

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] }
        })
        .then(() =>
          server.inject({
            method: 'post',
            url: 'http://localhost:9090/api/people',
            headers: { Accept: 'application/hal+json' }
          })
        )
        .then(res => {
          const result = JSON.parse(res.payload);
          result._links.self.should.have.property(
            'href',
            'http://localhost:9090/api/people/100'
          );
        })
        .then(done)
        .catch(done);
    });

    it('should make configured links absolute', done => {
      server.route({
        method: 'post',
        path: '/api/people',
        config: {
          handler() {
            return { firstName: 'Bob', lastName: 'Smith' };
          },
          plugins: {
            hal: {
              absolute: true,
              prepare(rep, done) {
                rep.link('mco:boss', '/api/people/101');
                done();
              }
            }
          }
        }
      });

      server
        .register({
          plugin: halacious,
          options: {
            mediaTypes: ['application/json', 'application/hal+json'],
            absolute: true
          }
        })
        .then(() =>
          server.inject({
            method: 'post',
            url: 'http://localhost:9090/api/people',
            headers: { Accept: 'application/hal+json' }
          })
        )
        .then(res => {
          const result = JSON.parse(res.payload);
          result.should.have
            .property('_links')
            .that.has.property('mco:boss')
            .that.has.property('href', 'http://localhost:9090/api/people/101');
        })
        .then(done)
        .catch(done);
    });
  });

  it('should support resolving embedded hrefs by ids', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        id: 'person',
        handler(req) {
          return {
            id: req.params.id,
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234'
          };
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
      handler() {
        return {
          items: [{ id: 100 }, { id: 200 }]
        };
      },
      config: {
        plugins: {
          hal: {
            embedded: {
              'mco:person': {
                path: 'items',
                href(rep, ctx) {
                  return rep.route('person', { id: ctx.item.id });
                }
              }
            }
          }
        }
      }
    });

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            self: { href: '/people' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ]
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
      })
      .then(done)
      .catch(done);
  });

  it('should support resolving link hrefs by ids', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        id: 'person',
        handler(req) {
          return {
            id: req.params.id,
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234'
          };
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

    server
      .register(halacious)
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true }
            ],
            self: { href: '/people/100' },
            'mco:boss': { href: '/people/1234{?full}', templated: true }
          },
          id: '100',
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should support absolute api root hrefs', done => {
    server = new hapi.Server({
      debug: { request: ['*'], log: ['*'] },
      port: 9090
    });

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return [];
        },
        plugins: {
          hal: {
            api: 'mco:people',
            query: '{?full}'
          }
        }
      }
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/api/'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            curies: [
              {
                name: 'mco',
                href: `${server.info.uri}/rels/mycompany/{rel}`,
                templated: true
              }
            ],
            self: { href: `${server.info.uri}/api/` },
            'mco:people': {
              href: `${server.info.uri}/people{?full}`,
              templated: true
            }
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should embed an empty representation', done => {
    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return { employees: [] };
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

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() => {
        const {
          plugins: {
            [PLUGIN]: { namespaces }
          }
        } = server;

        namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.deep.equal({
          _links: {
            curies: [
              {
                name: 'mco',
                href: `${server.info.uri}/rels/mycompany/{rel}`,
                templated: true
              }
            ],
            self: { href: `${server.info.uri}/people` }
          },
          _embedded: {
            'mco:person': []
          }
        });
      })
      .then(done)
      .catch(done);
  });

  it('should not mess with array responses', done => {
    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return [{ name: 'Dick' }, { name: 'Jane' }, { name: 'Spot' }];
        }
      }
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result.should.be.an.instanceOf(Array);
        result.should.have.deep.members([
          { name: 'Dick' },
          { name: 'Jane' },
          { name: 'Spot' }
        ]);
      })
      .then(done)
      .catch(done);
  });

  it('should not process internal routes', done => {
    const employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        },
        isInternal: true
      }
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
          allowInternals: true
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.result.should.equal(employee);
      })
      .then(done)
      .catch(done);
  });

  it('should support external filtering of requests', done => {
    const employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        }
      }
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.should.respondTo('filter');

        plugin.filter(request => {
          should.exist(request);
          return false;
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.result.should.equal(employee);
      })
      .then(done)
      .catch(done);
  });

  it('should support overriding the url protocol', done => {
    const employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { absolute: true, protocol: 'https' }
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result._links.self.href.should.match(/https/);
      })
      .then(done)
      .catch(done);
  });

  it('should support overriding the hostname', done => {
    const employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { absolute: true, host: 'www.cloud.com' }
      })
      .then(() =>
        server.inject({
          method: 'get',
          headers: { host: null },
          url: '/people'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result._links.self.href.should.match(/http:\/\/www.cloud.com/);
      })
      .then(done)
      .catch(done);
  });

  it('should support overriding the url builder', done => {
    const employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        }
      }
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() => {
        const {
          plugins: { [PLUGIN]: plugin }
        } = server;

        plugin.should.respondTo('urlBuilder');

        plugin.urlBuilder((request, path, search) =>
          url.format({
            hostname: 'www.myapp.com',
            port: 12345,
            pathname: path,
            protocol: 'https',
            search
          })
        );
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        const result = JSON.parse(res.payload);

        result._links.self.href.should.match(/https:\/\/www.myapp.com:12345/);
      })
      .then(done)
      .catch(done);
  });

  it('should not HALify when another media type is preferred by default', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { requireHalJsonAcceptHeader: true }
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100'
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/json');

        const result = JSON.parse(res.payload);
        result.should.deep.equal({
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/json');

        const result = JSON.parse(res.payload);
        result.should.deep.equal({
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/hal+json');

        const result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' }
          },
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should HALify when application/hal+json is explicitly asked for', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        }
      }
    });

    server
      .register({
        plugin: halacious,
        options: { requireHalJsonAcceptHeader: true }
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/hal+json');

        const result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: { self: { href: '/people/100' } },
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(done)
      .catch(done);
  });

  it('should not replace the original successful response to allow to modify it by other plugins', done => {
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        }
      }
    });

    const callback = sinon.spy();

    const anotherPlugin = {
      name: 'anotherPlugin',
      version: '1.0.0',

      async register(server) {
        server.ext({
          type: 'onPostHandler',
          method(request, h) {
            callback();
            return h.continue;
          }
        });
      }
    };

    const plugins = [
      {
        plugin: halacious,
        options: {
          requireHalJsonAcceptHeader: true
        }
      },
      {
        plugin: anotherPlugin
      }
    ];

    server
      .register(plugins)
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { accept: 'application/hal+json' }
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);

        res.headers['content-type'].should.contain('application/hal+json');

        const result = JSON.parse(res.payload);

        callback.should.be.called;

        result.should.deep.equal({
          _links: { self: { href: '/people/100' } },
          firstName: 'Bob',
          lastName: 'Smith'
        });
      })
      .then(done)
      .catch(done);
  });
});
