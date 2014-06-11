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
    ns.rel({ name: 'widgets', description: 'a collection of widgets' });
    ns.rel({ name: 'widget', description: 'a single widget' });
});

server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            reply({});
        },
        plugins: {
            hal: {
                api: 'mco:users'
            }
        }
    }
});

server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
        handler: function (req, reply) {
            reply({});
        },
        plugins: {
            hal: {
                api: 'mco:user'
            }
        }
    }
});

server.route({
    method: 'get',
    path: '/widgets',
    config: {
        handler: function (req, reply) {
            reply({});
        },
        plugins: {
            hal: {
                api: 'mco:widgets'
            }
        }
    }
});

server.route({
    method: 'get',
    path: '/widgets/{widgetId}',
    config: {
        handler: function (req, reply) {
            reply({});
        },
        plugins: {
            hal: {
                api: 'mco:widget'
            }
        }
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});