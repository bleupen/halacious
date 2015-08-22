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
    path: '/users/{id}',
    config: {
        id: 'user',
        handler: function (req, reply) {
            reply({ id: req.params.id, bossId: 101 });
        },
        plugins: {
            hal: {
                links: {
                    boss: function(rep, entity) {
                        return rep.route('user', { id: entity.bossId });
                    }
                }
            }
        }
    }
});

server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            reply({
                start: 0,
                count: 2,
                limit: 2,
                items: [
                    { id: 100, firstName: 'Brad', lastName: 'Leupen'},
                    { id: 101, firstName: 'Barack', lastName: 'Obama'}
                ]
            });
        },
        plugins: {
            hal: {
                embedded: {
                    item: {
                        path: 'items',
                        href: function(rep, ctx) {
                            return rep.route('user', { id: ctx.item.id });
                        }
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