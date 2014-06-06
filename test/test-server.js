'use strict';

var hapi = require('hapi');

var server = new hapi.Server(9090);

server.pack.require('../', {}, function (err) {
    if (err) throw err;
    server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/informer', prefix: 'inf', description: 'Informer-specific rels'});
    server.start(function (err) {
        if (err) throw err;
        console.log('server started at ' + server.info.uri);
    });
});