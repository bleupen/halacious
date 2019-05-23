'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const hoek = require('@hapi/hoek');
const Uri = require('urijs');
const halacious = require('halacious');

const { name: PLUGIN } = require('halacious/package.json');

const users = [];

for (let i = 0; i < 100; i++) {
  users.push({ id: 1000 + i, firstName: 'Test', lastName: `User ${i}` });
}

function Collection(items, start, total) {
  this.items = items || [];
  this.start = start || 0;
  this.count = this.items.length;
  this.total = total || this.items.count;
}

Collection.prototype.toHal = function(rep, done) {
  let limit = Number(rep.request.query.limit) || 10;
  let uri = new Uri(rep.self);
  let prev = Math.max(0, this.start - limit);
  let next = Math.min(this.total, this.start + limit);

  let query = uri.search(true);

  if (this.start > 0) {
    rep.link(
      'prev',
      uri.search(hoek.applyToDefaults(query, { start: prev, limit })).toString()
    );
  }
  if (this.start + this.count < this.total) {
    rep.link(
      'next',
      uri.search(hoek.applyToDefaults(query, { start: next, limit })).toString()
    );
  }
  done();
};

async function init() {
  const server = hapi.server({ port: 8080 });

  await server.register(vision);

  await server.register({
    plugin: halacious,
    options: { mediaTypes: ['application/json', 'application/hal+json'] }
  });

  server.plugins[PLUGIN].namespaces
    .add({ name: 'mycompay', prefix: 'mco' })
    .rel('user');

  server.route({
    method: 'get',
    path: '/users',
    handler(req) {
      const start = Number(req.query.start) || 0;
      const limit = Number(req.query.limit) || 10;
      const items = users.slice(start, start + limit);
      return new Collection(items, start, users.length);
    },
    config: {
      plugins: {
        hal: {
          query: '{?start,limit,q}',
          embedded: {
            'mco:item': {
              path: 'items',
              href: './{item.id}'
            }
          }
        }
      }
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
