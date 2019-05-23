'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const halacious = require('halacious');

async function init() {
  const server = hapi.server({ port: 8080 });

  await server.register(vision);

  await server.register(halacious);

  server.route({
    method: 'get',
    path: '/users/{userId}',
    handler(req) {
      return {
        id: req.params.userId,
        name: `User ${req.params.userId}`,
        googlePlusId: '107835557095464780852'
      };
    },
    config: {
      plugins: {
        hal: {
          links: {
            home: 'http://plus.google.com/{googlePlusId}'
          },
          ignore: 'googlePlusId' // remove the id property from the response
        }
      }
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
