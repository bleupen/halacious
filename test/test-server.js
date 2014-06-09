'use strict';

var hapi = require('hapi');

var server = new hapi.Server(9090);

server.route({
    method: 'get',
    path: '/people',
    config: {
        handler: function (req, reply) {
            reply ({
                count: 2,
                start: 0,
                total: 2,
                items: [
                    { id: 100, firstName: 'Bob', lastName: 'Smith' },
                    { id: 200, firstName: 'Boss', lastName: 'Man'}
                ]
            });
            reply({ _id: req.params.id, firstName: 'Brad', lastName: 'Leupen'});
        },
        plugins: {
            hal: {
                api: 'mco:people',
                embedded: {
                    'mco:person': {
                        path: 'items',
                        href: './{item.id}',
                        links: {
                            'mco:boss': './boss'
                        }
                    }
                }
            }
        }
    }
});

server.route({
    method: 'get',
    path: '/people/{id}',
    config: {
        handler: function (req, reply) {
            reply({ _id: req.params.id, firstName: 'Brad', lastName: 'Leupen'});
        },
        plugins: {
            hal: {
                api: 'mco:person',
                links: {
                    'mco:boss': './boss'
                },
                ignore: ['_id'],
                prepare: function(rep, next) {
                    rep.embed('mco:company', '/company', { name: 'Acme Inc' });
                    next();
                }
            }
        }
    }
});
server.pack.require('../', {}, function (err) {
    if (err) throw err;
    server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco', description: 'My companys rels'});
    server.start(function (err) {
        if (err) throw err;
        console.log('server started at ' + server.info.uri);
    });
});