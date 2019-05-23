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
    path: '/users/{id}',
    handler(req) {
      return { id: req.params.id, bossId: 101 };
    },
    config: {
      id: 'user',
      plugins: {
        hal: {
          links: {
            boss(rep, entity) {
              return rep.route('user', { id: entity.bossId });
            }
          }
        }
      }
    }
  });

  server.route({
    method: 'get',
    path: '/users',
    handler() {
      return {
        start: 0,
        count: 2,
        limit: 2,
        items: [
          { id: 100, firstName: 'Brad', lastName: 'Leupen' },
          { id: 101, firstName: 'Barack', lastName: 'Obama' }
        ]
      };
    },
    config: {
      plugins: {
        hal: {
          embedded: {
            item: {
              path: 'items',
              href(rep, ctx) {
                return rep.route('user', { id: ctx.item.id });
              }
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
