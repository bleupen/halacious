'use strict';

var hapi = require('hapi');
var URI = require('URIjs');
var hoek = require('hoek');
var halacious = require('../');
var users = [];

for (var i = 0; i < 100; i++) {
    users.push({ id: 1000 + i, firstName: 'Test', lastName: 'User ' + i });
}

var server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), function (err) {
    if (err) return console.log(err);
});

server.register({ register: halacious, options: { mediaTypes: ['application/json', 'application/hal+json']}}, function(err){
    server.plugins.halacious.namespaces.add({name: 'mycompay', prefix: 'mco'})
        .rel('user');

    if (err) console.log(err);
});

function Collection(items, start, total) {
    this.items = items || [];
    this.start = start || 0;
    this.count = this.items.length;
    this.total = total || this.items.count;
}

Collection.prototype.toHal = function(rep, done) {
    var limit = Number(rep.request.query.limit) || 10;
    var uri = new URI(rep.self);
    var prev = Math.max(0, this.start - limit);
    var next = Math.min(this.total, this.start + limit);

    var query = uri.search(true);

    if (this.start > 0) {
        rep.link('prev', uri.search(hoek.applyToDefaults(query, { start: prev, limit: limit })).toString());
    }
    if (this.start + this.count < this.total) {
        rep.link('next', uri.search(hoek.applyToDefaults(query, { start: next, limit: limit })).toString());
    }
    done();
};

server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            var start = Number(req.query.start) || 0;
            var limit = Number(req.query.limit) || 10;
            var items = users.slice(start, start+limit);
            reply(new Collection(items, start, users.length));
        },
        plugins: {
            hal: {
                query: '{?start,limit,q}',
                embedded: {
                    'mco:item': {
                        path: 'items',
                        href: './{item.id}'
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