'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const halacious = require('halacious');

const { name: PLUGIN } = require('halacious/package.json');

async function init() {
  const server = hapi.server({ port: 8080 });

  await server.register(vision);

  await server.register({ plugin: halacious, options: { absolute: true } });

  const namespace = server.plugins[PLUGIN].namespaces.add({
    name: 'mycompany',
    description: 'My Companys namespace',
    prefix: 'mco'
  });
  namespace.rel({ name: 'users', description: 'a collection of users' });
  namespace.rel({ name: 'user', description: 'a single user' });
  namespace.rel({ name: 'widgets', description: 'a collection of widgets' });
  namespace.rel({ name: 'widget', description: 'a single widget' });

  server.route({
    method: 'get',
    path: '/users',
    config: {
      handler() {
        return {};
      },
      plugins: {
        hal: {
          api: 'mco:users'
        }
      }
    }
  });

  server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
      handler() {
        return {};
      },
      plugins: {
        hal: {
          api: 'mco:user'
        }
      }
    }
  });

  server.route({
    method: 'get',
    path: '/widgets',
    config: {
      handler() {
        return {};
      },
      plugins: {
        hal: {
          api: 'mco:widgets'
        }
      }
    }
  });

  server.route({
    method: 'get',
    path: '/widgets/{widgetId}',
    config: {
      handler() {
        return {};
      },
      plugins: {
        hal: {
          api: 'mco:widget'
        }
      }
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
