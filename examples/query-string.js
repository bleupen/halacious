'use strict';

var hapi = require('hapi');

var halaciousOpts = {
    mediaTypes: ['application/json', 'application/hal+json']
};

var server = new hapi.Server(8080);
server.pack.require('../', halaciousOpts, function(err){
    server.pack.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco'});
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