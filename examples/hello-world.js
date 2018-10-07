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
  path: '/hello/{name}',
  handler(req, reply) {
    reply({ message: `Hello, ${req.params.name}` });
  },
});

server.start(err => {
  if (err) return console.log(err);
  console.log('Server started at %s', server.info.uri);
});
