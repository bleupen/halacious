'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const halacious = require('halacious');

const { name: PLUGIN } = require('halacious/package.json');

async function init() {
  const server = hapi.server({ port: 8080 });

  await server.register(vision);

  await server.register({
    plugin: halacious,
    options: {
      mediaTypes: ['application/json', 'application/hal+json']
    }
  });

  server.plugins[PLUGIN].namespaces.add({
    dir: `${__dirname}/rels/mycompany`,
    prefix: 'mco'
  });

  server.route({
    method: 'get',
    path: '/users',
    handler() {
      return { items: [{ id: 100, firstName: 'Louis', lastName: 'CK' }] };
    },
    config: {
      plugins: {
        hal: {
          api: 'mco:users',
          embedded: {
            'mco:user': {
              path: 'items',
              href: './{item.id}'
            }
          },
          query: '{?q*,start,limit}'
        }
      }
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
