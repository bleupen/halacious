'use strict';

var hapi = require('hapi');
var halacious = require('../');

var server = new hapi.Server();
server.connection({ port: 8080 });

server.register(halacious, function(err){
    if (err) console.log(err);
});

server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
        handler: function (req, reply) {
            reply({
                id: req.params.userId,
                name: 'User ' + req.params.userId,
                boss: {
                    id: 1234,
                    name: 'Boss Man'
                }
            });
        },
        plugins: {
            hal: {
                embedded: {
                    'boss': {
                        path: 'boss', // the property name of the object to embed
                        href: '../{item.id}'  
                    }
                }
            }
        }
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});