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
    path: '/users',
    handler() {
      return {
        start: 0,
        count: 2,
        limit: 2,
        items: [
          {
            id: 100,
            firstName: 'Brad',
            lastName: 'Leupen',
            googlePlusId: '107835557095464780852'
          },
          { id: 101, firstName: 'Mark', lastName: 'Zuckerberg' }
        ]
      };
    },
    config: {
      plugins: {
        hal: {
          // you can also assign this function directly to the hal property above as a shortcut
          prepare(rep, next) {
            rep.entity.items.forEach(item => {
              let embed = rep.embed('item', `./${item.id}`, item);
              if (item.googlePlusId) {
                embed.link(
                  'home',
                  `http://plus.google.com/${item.googlePlusId}`
                );
                embed.ignore('googlePlusId');
              }
            });
            rep.ignore('items');
            // dont forget to call next!
            next();
          }
        }
      }
    }
  });

  await server.start();

  console.log('Server started at %s', server.info.uri);
}

init();
