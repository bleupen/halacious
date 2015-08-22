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
    if (err) console.log(err);
});

server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
        handler: function (req, reply) {
            reply({ id: req.params.userId, name: 'User ' + req.params.userId, googlePlusId: '107835557095464780852' });
        },
        plugins: {
            hal: {
                links: {
                    'home': 'http://plus.google.com/{googlePlusId}'
                },
                ignore: 'googlePlusId' // remove the id property from the response
            }
        }
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});