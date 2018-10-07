let hapi = require('hapi');
let halacious = require('../');

let server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), err => {
  if (err) return console.log(err);
});

server.register({ register: halacious, options: { absolute: true } }, err => {
  if (err) return console.log(err);
  let ns = server.plugins.halacious.namespaces.add({
    name: 'mycompany',
    description: 'My Companys namespace',
    prefix: 'mco',
  });
  ns.rel({ name: 'users', description: 'a collection of users' });
  ns.rel({ name: 'user', description: 'a single user' });
  ns.rel({ name: 'widgets', description: 'a collection of widgets' });
  ns.rel({ name: 'widget', description: 'a single widget' });
});

server.route({
  method: 'get',
  path: '/users',
  config: {
    handler(req, reply) {
      reply({});
    },
    plugins: {
      hal: {
        api: 'mco:users',
      },
    },
  },
});

server.route({
  method: 'get',
  path: '/users/{userId}',
  config: {
    handler(req, reply) {
      reply({});
    },
    plugins: {
      hal: {
        api: 'mco:user',
      },
    },
  },
});

server.route({
  method: 'get',
  path: '/widgets',
  config: {
    handler(req, reply) {
      reply({});
    },
    plugins: {
      hal: {
        api: 'mco:widgets',
      },
    },
  },
});

server.route({
  method: 'get',
  path: '/widgets/{widgetId}',
  config: {
    handler(req, reply) {
      reply({});
    },
    plugins: {
      hal: {
        api: 'mco:widget',
      },
    },
  },
});

server.start(err => {
  if (err) return console.log(err);
  console.log('Server started at %s', server.info.uri);
});
