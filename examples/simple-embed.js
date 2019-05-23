'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const halacious = require('halacious');

async function init() {
  const server = hapi.server({ port: 8080 });

  await server.register(vision);

  await server.register({ plugin: halacious, options: { absolute: true } });

  server.route({
    method: 'get',
    path: '/users/{userId}',
    handler(req) {
      return {
        id: req.params.userId,
        name: `User ${req.params.userId}`,
        boss: {
          id: 1234,
          name: 'Boss Man'
        }
      };
    },
    config: {
      plugins: {
        hal: {
          embedded: {
            boss: {
              path: 'boss', // the property name of the object to embed
              href: '../{item.id}'
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
