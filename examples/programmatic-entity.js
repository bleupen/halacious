'use strict';

require('module-alias/register');

const hapi = require('@hapi/hapi');
const vision = require('@hapi/vision');
const halacious = require('halacious');

function User(id, firstName, lastName, googlePlusId) {
  this.id = id;
  this.firstName = firstName;
  this.lastName = lastName;
  this.googlePlusId = googlePlusId;
}

User.prototype.toHal = function(rep, next) {
  if (this.googlePlusId) {
    rep.link('home', `http://plus.google.com/${this.googlePlusId}`);
    rep.ignore('googlePlusId');
  }
  next();
};

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
          new User(100, 'Brad', 'Leupen', '107835557095464780852'),
          new User(101, 'Mark', 'Zuckerberg')
        ]
      };
    },
    config: {
      plugins: {
        hal: {
          embedded: {
            item: {
              path: 'items',
              href: './{item.id}'
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
