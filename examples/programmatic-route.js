'use strict';

var hapi = require('hapi');

var halaciousOpts = {

};

var server = new hapi.Server(8080);
server.pack.require('../', halaciousOpts, function(err){
    if (err) console.log(err);
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
                    { id: 100, firstName: 'Brad', lastName: 'Leupen', googlePlusId: '107835557095464780852'},
                    { id: 101, firstName: 'Mark', lastName: 'Zuckerberg'}
                ]
            });
        },
        plugins: {
            hal: {
                // you can also assign this function directly to the hal property above as a shortcut
                prepare: function (rep, next) {
                    rep.entity.items.forEach(function (item) {
                        var embed = rep.embed('item', './' + item.id, item);
                        if (item.googlePlusId) {
                            embed.link('home', 'http://plus.google.com/' + item.googlePlusId);
                            embed.ignore('googlePlusId');
                        }
                    });
                    rep.ignore('items');
                    // dont forget to call next!
                    next();
                }
            }
        }
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});