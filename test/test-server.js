'use strict';

var hapi = require('hapi');

var server = new hapi.Server(9090);

server.route({
    method: 'get',
    path: '/people/{id}',
    config: {
        handler: function (req, reply) {
            reply({ _id: req.params.id, firstName: 'Brad', lastName: 'Leupen'});
        },
        plugins: {
            hal: {
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