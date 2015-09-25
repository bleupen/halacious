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
    path: '/hello/{name}',
    handler: function(req, reply) {
        reply({ message: 'Hello, '+req.params.name });
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});