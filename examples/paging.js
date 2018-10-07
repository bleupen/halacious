let hapi = require('hapi');
let URI = require('urijs');
let hoek = require('hoek');
let halacious = require('../');

let users = [];

for (let i = 0; i < 100; i++) {
  users.push({ id: 1000 + i, firstName: 'Test', lastName: `User ${i}` });
}

let server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), err => {
  if (err) return console.log(err);
});

server.register(
  {
    register: halacious,
    options: { mediaTypes: ['application/json', 'application/hal+json'] },
  },
  err => {
    server.plugins.halacious.namespaces
      .add({ name: 'mycompay', prefix: 'mco' })
      .rel('user');

    if (err) console.log(err);
  }
);

function Collection(items, start, total) {
  this.items = items || [];
  this.start = start || 0;
  this.count = this.items.length;
  this.total = total || this.items.count;
}

Collection.prototype.toHal = function(rep, done) {
  let limit = Number(rep.request.query.limit) || 10;
  let uri = new URI(rep.self);
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

server.route({
  method: 'get',
  path: '/users',
  config: {
    handler(req, reply) {
      let start = Number(req.query.start) || 0;
      let limit = Number(req.query.limit) || 10;
      let items = users.slice(start, start + limit);
      reply(new Collection(items, start, users.length));
    },
    plugins: {
      hal: {
        query: '{?start,limit,q}',
        embedded: {
          'mco:item': {
            path: 'items',
            href: './{item.id}',
          },
        },
      },
    },
  },
});

server.start(err => {
  if (err) return console.log(err);
  console.log('Server started at %s', server.info.uri);
});
