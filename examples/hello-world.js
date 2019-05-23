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
    path: '/hello/{name}',
    handler(req) {
      return { message: `Hello, ${req.params.name}` };
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
