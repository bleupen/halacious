'use strict';

var hapi = require('hapi');
var halacious = require('../');

var server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), function (err) {
    if (err) return console.log(err);
});

server.register(halacious, function(err){
    if (err) console.log(err);
});

server.route({
    method: 'get',
    path: '/employees/{id}',
    config: {
        id: 'employee.lookup',
        handler: function (req, next) {
            next(req.params);
        }
    }
});

server.route({
    method: 'get',
    path: '/departments/{id}',
    config: {
        handler: function (req, reply) {
            reply({
                id: req.params.id,
                employees: [{ id: 100, name: 'Tom' }, { id: 101, name: 'Dick' }, { id: 102, name: 'Harry' }]
            });
        },
    plugins: {
        hal: {
            prepare: function (rep, next) {
                var employees = rep.entity.employees;

                // adding multiple links with the same rel will create an array of links in the payload

                // link by route id
                rep.link('mco:employee', rep.route('employee.lookup', employees[0]));

                // or by relative path
                rep.link('mco:employee', '../../employees/'+ employees[1].id);

                // or by absolute path
                rep.link('mco:employee', '/employees/'+ employees[2].id);

                next();
            }
        }
    }
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});