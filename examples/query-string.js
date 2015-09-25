'use strict';

var hapi = require('hapi');
var halacious = require('../');

var halaciousOpts = {
    mediaTypes: ['application/json', 'application/hal+json']
};

var server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), function (err) {
    if (err) return console.log(err);
});

server.register({ register: halacious, options: halaciousOpts }, function(err){
    server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco'});
    if (err) console.log(err);
});

server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            reply({ items: [{ id: 100, firstName: 'Louis', lastName: 'CK' }]});
        },
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

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});