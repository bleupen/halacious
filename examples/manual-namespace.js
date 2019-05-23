'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const halacious = require('halacious');

const { name: PLUGIN } = require('halacious/package.json');

async function init() {
  const server = hapi.server({ port: 8080 });

  await server.register(vision);

  await server.register(halacious);

  const namespace = server.plugins[PLUGIN].namespaces.add({
    name: 'mycompany',
    description: 'My Companys namespace',
    prefix: 'mco'
  });
  namespace.rel({ name: 'users', description: 'a collection of users' });
  namespace.rel({ name: 'user', description: 'a single user' });
  namespace.rel({ name: 'boss', description: 'a users boss' });

  server.route({
    method: 'get',
    path: '/users/{userId}',

    handler(req) {
      return {
        id: req.params.userId,
        name: `User ${req.params.userId}`,
        bossId: 200
      };
    },

    config: {
      plugins: {
        hal: {
          links: {
            'mco:boss': '../{bossId}'
          },
          ignore: 'bossId'
        }
      }
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
