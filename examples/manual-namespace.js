'use strict';

var hapi = require('hapi');

var halaciousOpts = {

};

var server = new hapi.Server(8080);
server.pack.require('../', halaciousOpts, function(err){
    if (err) return console.log(err);
    var ns = server.plugins.halacious.namespaces.add({ name: 'mycompany', description: 'My Companys namespace', prefix: 'mco'});
    ns.rel({ name: 'users', description: 'a collection of users' });
    ns.rel({ name: 'user', description: 'a single user' });
    ns.rel({ name: 'boss', description: 'a users boss' });
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