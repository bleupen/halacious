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
    path: '/employees/{id}',
    config: {
      id: 'employee.lookup',
      handler(req, next) {
        next(req.params);
      }
    }
  });

  server.route({
    method: 'get',
    path: '/departments/{id}',
    config: {
      handler(req) {
        return {
          id: req.params.id,
          employees: [
            { id: 100, name: 'Tom' },
            { id: 101, name: 'Dick' },
            { id: 102, name: 'Harry' }
          ]
        };
      },
      plugins: {
        hal: {
          prepare(rep, next) {
            const employees = rep.entity.employees;

            // adding multiple links with the same rel will create an array of links in the payload

            // link by route id
            rep.link(
              'mco:employee',
              rep.route('employee.lookup', employees[0])
            );

            // or by relative path
            rep.link('mco:employee', `../../employees/${employees[1].id}`);

            // or by absolute path
            rep.link('mco:employee', `/employees/${employees[2].id}`);

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
