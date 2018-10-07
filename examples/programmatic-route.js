let hapi = require('hapi');
let halacious = require('../');

let server = new hapi.Server();
server.connection({ port: 8080 });

server.register(require('vision'), err => {
  if (err) return console.log(err);
});

server.register(halacious, err => {
  if (err) console.log(err);
});

server.route({
  method: 'get',
  path: '/users',
  config: {
    handler(req, reply) {
      reply({
        start: 0,
        count: 2,
        limit: 2,
        items: [
          {
            id: 100,
            firstName: 'Brad',
            lastName: 'Leupen',
            googlePlusId: '107835557095464780852',
          },
          { id: 101, firstName: 'Mark', lastName: 'Zuckerberg' },
        ],
      });
    },
    plugins: {
      hal: {
        // you can also assign this function directly to the hal property above as a shortcut
        prepare(rep, next) {
          rep.entity.items.forEach(item => {
            let embed = rep.embed('item', `./${item.id}`, item);
            if (item.googlePlusId) {
              embed.link('home', `http://plus.google.com/${item.googlePlusId}`);
              embed.ignore('googlePlusId');
            }
          });
          rep.ignore('items');
          // dont forget to call next!
          next();
        },
      },
    },
  },
});

server.start(err => {
  if (err) return console.log(err);
  console.log('Server started at %s', server.info.uri);
});
