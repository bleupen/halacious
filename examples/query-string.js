let hapi = require('hapi');
let halacious = require('../');

let halaciousOpts = {
  mediaTypes: ['application/json', 'application/hal+json'],
};

let server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), err => {
  if (err) return console.log(err);
});

server.register({ register: halacious, options: halaciousOpts }, err => {
  server.plugins.halacious.namespaces.add({
    dir: `${__dirname}/rels/mycompany`,
    prefix: 'mco',
  });
  if (err) console.log(err);
});

server.route({
  method: 'get',
  path: '/users',
  config: {
    handler(req, reply) {
      reply({ items: [{ id: 100, firstName: 'Louis', lastName: 'CK' }] });
    },
    plugins: {
      hal: {
        api: 'mco:users',
        embedded: {
          'mco:user': {
            path: 'items',
            href: './{item.id}',
          },
        },
        query: '{?q*,start,limit}',
      },
    },
  },
});

server.start(err => {
  if (err) return console.log(err);
  console.log('Server started at %s', server.info.uri);
});
