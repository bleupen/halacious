'use strict';

var hapi = require('hapi');
var halacious = require('../');
var server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), function (err) {
    if (err) return console.log(err);
});

server.register(halacious, function(err){
    if (err) return console.log(err);
    server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco' });
});

server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
        handler: function (req, reply) {
            reply({ id: req.params.userId, name: 'User ' + req.params.userId, bossId: 200 });
        },
        plugins: {
            hal: {
                links: {
                    'mco:boss': '../{bossId}'
                },
                ignore: 'bossId'
            }
        }
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});