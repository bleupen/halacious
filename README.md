#halacious

a better HAL processor for Hapi

##Overview
*Halacious* is a plugin for the HapiJS web application server that makes **HATEOASIFYING** your app ridiculously
easy. When paired with a well-aged HAL client-side library, you will feel the warmth of loose API coupling and the feeling
of moral superiorty as you rid your SPA of hard-coded api links. 

Halacious removes the boilerplate standing between between you and a Restful application, allowing you to focus on your app's
secret sauce. Halacious embraces Hapi's configuration-centric approach to application scaffolding. Most common tasks can 
be accomplished without writing any code at all.
 
##Features
- Dead-simple namespace/rel registration system that encourages you to document your API as you go
- Automatic api root REST endpoint generation that instantly gives you links to all top-level API endpoints
- Automatic rel documentation site generator so that your fully resolved rel names actually, you know, point somewhere.
- Automatic creation of curie links
- Support for relative and templated link hrefs. 
- Auto wrapping of http response entities into HAL representations
- Support for custom object json serialization
- Support for programmatic configuration of HAL entities at the route or entity level
- Bunches of unit tests

##Getting Started
Start by npm installing the halacious library into your hapi project folder:
```
npm install halacious --save
```

Register the plugin with the app server
```javascript
var hapi = require('hapi');

var halaciousOpts = { 
    
};

var server = new hapi.Server(8080);
server.pack.require('halacious', halaciousOpts, function(err){
    if (err) console.log(err);
});

server.route({
    method: 'get',
    path: '/hello/{name}',
    handler: function(req, reply) {
        reply({ message: 'Hello, '+req.params.name });
    }
});

server.start(function(err){
    if (err) return console.log(err);
    console.log('Server started at %s', server.info.uri);
});
```
Launch the server:
```
node ./examples/hello-world
```

Make a request
```
curl -H 'Accept: application/hal+json' http://localhost:8080/hello/world
```

See the response
```
{
    "_links": {
        "self": {
            "href": "/hello/world"
        }
    },
    "message": "Hello, world"
}
```
##Linking
Links may be declared directly within the route config. 
```javascript
server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
        handler: function (req, reply) {
            // look up user
            reply({ id: req.params.userId, name: 'User ' + req.params.userId, googlePlusId: '107835557095464780852' });
        },
        plugins: {
            hal: {
                links: {
                    'home': 'http://plus.google.com/{googlePlusId}'
                },
                ignore: 'googlePlusId' // remove the id property from the response
            }
        }
    }
});
```
```
curl -H 'Accept: application/hal+json' http://localhost:8080/users/100
```
will produce:
```
{
    "_links": {
        "self": {
            "href": "/users/1234"
        },
        "home": {
            "href": "http://plus.google.com/107835557095464780852"
        }
    },
    "id": "100",
    "name": "User 1234"
}
```

##Embedding
HAL allows you to conserve bandwidth by optionally embedding link payloads in the original request. Halacious will
automatically convert nested objects into embedded HAL representations (if you ask nicely).

```javascript
server.route({
    method: 'get',
    path: '/users/{userId}',
    config: {
        handler: function (req, reply) {
            // look up user
            reply({
                id: req.params.userId,
                name: 'User ' + req.params.userId,
                boss: {
                    id: 1234,
                    name: 'Boss Man'
                }
            });
        },
        plugins: {
            hal: {
                embedded: {
                    'boss': {
                        path: 'boss', // the property name of the object to embed
                        href: '../{item.id}'
                    }
                }
            }
        }
    }
});
```
```
curl -H 'Accept: application/hal+json' http://localhost:8080/users/100

{
    "_links": {
        "self": {
            "href": "/users/100"
        }
    },
    "id": "100",
    "name": "User 100",
    "_embedded": {
        "boss": {
            "_links": {
                "self": {
                    "href": "/users/1234"
                }
            },
            "id": 1234,
            "name": "Boss Man"
        }
    }
}
```

## Programmatic configuration of HAL representations
You may find the need to take the wheel on occasion and directly configure outbound representions. For example,
some links may be conditional on potentially asynchronous criteria. Fortunately, Halacious provides two ways to do this:

1. By providing a `prepare()` function on the route's hal descriptor (or by assigning the function directly to the hal property)
2. By implementing a `toHal()` method directly on a wrapped entity. 

In either case, the method signature is the same: `fn(rep, callback)` where
- `rep` - a representation object with the following properties and functions:
    - `factory` - a factory reference for creating new representations. The factory object implements one method:
        - `create(entity, selfHref)` - wraps entity with a new Hal representation, whose self link will point to selfHref
    - `request` - the originating hapi request
    - `self` - a shortcut to the representation's self link
    - `entity` - the original wrapped entity
    - `prop(name, value)` - manually adds a name/value pair to the representation
    - `merge(object)` - merges the properties of another object into the representation
    - `ignore(...propertyNames)` - prevents fields from being included in the response
    - `link(relName, href)` - adds a new link to the `_links` collection, returning the new link. Link objects support
    the following properties (See see http://tools.ietf.org/html/draft-kelly-json-hal-06#section-8.2 for more information):
        - `href`
        - `templated`
        - `title`
        - `type`
        - `deprecation`
        - `name`
        - `profile`
        - `hreflang`
    - `embed(rel, self, entity)` - adds an entity to the representation's `_embedded` collection with the supplied rel link relation and self href, returning a new representation
    object for further configuration.
- `callback([err], [representation])` - an asynchronous callback function to be called when configuration of the hal entity
is complete. Most of the time this function should be called with no arguments. Only pass arguments if there has been
an error or if a completely new representation has been created with `rep.factory.create()`.

#### Example 1: A `prepare()` function declared in the route descriptor. 
```javascript
server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            // look up user
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
```
```
curl -H 'Accept: application/hal+json' http://localhost:8080/users

{
    "_links": {
        "self": {
            "href": "/users"
        }
    },
    "start": 0,
    "count": 2,
    "limit": 2,
    "_embedded": {
        "item": [
            {
                "_links": {
                    "self": {
                        "href": "/users/100"
                    },
                    "home": {
                        "href": "http://plus.google.com/107835557095464780852"
                    }
                },
                "id": 100,
                "firstName": "Brad",
                "lastName": "Leupen"
            },
            {
                "_links": {
                    "self": {
                        "href": "/users/101"
                    }
                },
                "id": 101,
                "firstName": "Mark",
                "lastName": "Zuckerberg"
            }
        ]
    }
}
```
#### Example 2: Implementing `toHal()` on a domain entity:
```javascript
function User(id, firstName, lastName, googlePlusId) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.googlePlusId = googlePlusId;
}

User.prototype.toHal = function(rep, next) {
    if (this.googlePlusId) {
        rep.link('home', 'http://plus.google.com/' + this.googlePlusId);
        rep.ignore('googlePlusId');
    }
    next();
};

server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            // look up user
            reply({
                start: 0,
                count: 2,
                limit: 2,
                items: [
                    new User(100, 'Brad', 'Leupen', '107835557095464780852'),
                    new User(101, 'Mark', 'Zuckerberg')
                ]
            });
        },
        plugins: {
            hal: {
                embedded: {
                    item: {
                        path: 'items',
                        href: './{item.id}'
                    }
                }
            }
        }
    }
});
```

## The HAL route configuration object
The `config.plugins.hal` route configuration object takes the following format:
- A function `fn(rep, next)` - for purely programmatic control over the representation
or
- An object with the following properties:
    - `api` - an optional top level api rel name to assign to this route. Setting a value will cause this route to be included
    in the root api resource's _links collection. 
    - `prepare(rep, next)` - an optional prepare function
    - `ignore` - A String or array of strings containing the names of properties to remove from the output. Can be used
    to remove reduntant information from the response
    - `query` - An RFC 6570 compatible query string that should be communicated to your clients. See: http://tools.ietf.org/html/rfc6570.
    Example: `{?q*,start,limit}`. These parameters will be included in top level api links. They will also be included in self links if supplied in the request.
    Query parameters that are not included in the template, such as runtime tokens, will be excluded from the self href.
    - `links` - An object whose keys are rel names and whose values are href strings or link objects that contain
     at least an `href` property. Hrefs may be absolute or relative to the representation's self link. Hrefs may also contain
     `{expression}` template expressions, which are resolved against the wrapped entity. 
    - `embedded` An object whose keys are rel names and whose values are configuration objects with:
        - `path` - a path expression to evaluate against the wrapped entity to derive the object to embed. 
        - `href` - a String href or link object that will be used to define the entity's self relation. Like links,
        embedded href's may also be templated. Unlike links, embedded href templates have access to two state variables:
            - `self` - the parent entity 
            - `item` - the child entity
        - `links`   
        - `embedded` (recursively evaluated)
        - `prepare(rep, next)`

## Namespaces and Rels
So far, we have not done a real good job in our examples defining our link relations. Unless registered with the IANA, 
link relations should really be unique URLs that resolve to documentation regarding their semantics. Halacious will 
happily let you be lazy but its much better if we do things the Right Way. 

### Manually creating a namespace
Halacious exposes its api to your Hapi server so that you may configure it at runtime like so:
 ```javascript
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
             // look up user
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
 ```
 Now, when we access the server we see a new type of link in the `_links` collection, `curies`. The curies link provides a mechanism
 to use shorthand rel names while preserving their uniqueness. Without the curie, the 'mco:boss' rel key would be expanded
 to read `/rels/mycompany/boss`
 
 ```
 curl -H 'Accept: application/hal+json' http://localhost:8080/users/100
 
 {
     "_links": {
         "self": {
             "href": "/users/100"
         },
         "curies": [
             {
                 "name": "mco",
                 "href": "/rels/mycompany/{rel}",
                 "templated": true
             }
         ],
         "mco:boss": {
             "href": "/users/200"
         }
     },
     "id": "100",
     "name": "User 100"
 }
 ```
 
### Creating a namespace from a folder of documentated rels
In our examples folder, we have created a folder `rels/mycompany` containing markdown documents for all of the rels in our
company's namespace. We can suck all these into the system in one fell swoop:

```javascript
var server = new hapi.Server(8080);
server.pack.require('../', halaciousOpts, function(err){
    if (err) return console.log(err);
    server.plugins.halacious.namespaces.add({ dir: __dirname + '/rels/mycompany', prefix: 'mco' });
});
```
Ideally these documents should provide your api consumer enough semantic information to navigate your api. 

## Rels documentation 
Halacious includes an (extremely) barebones namespace / rel navigator for users to browse your documentation. 
The server binds to the `/rels` path on your server by default. 

## Automatic /api root
Discoverability is a key tenant of any hypermedia system. HAL requires that only the root API url be known to clients of your
application, from which all other urls may be derived via rel names. If you want, Halacious will create this root api
route for you automatically. All you need to do is to identify which resources to include by using the `api` route
configuration option. For example:

```javascript
server.pack.require('../', halaciousOpts, function(err){
    if (err) return console.log(err);
    var ns = server.plugins.halacious.namespaces.add({ name: 'mycompany', description: 'My Companys namespace', prefix: 'mco'});
    ns.rel({ name: 'users', description: 'a collection of users' });
    ns.rel({ name: 'user', description: 'a single user' });
});

server.route({
    method: 'get',
    path: '/users',
    config: {
        handler: function (req, reply) {
            // look up user
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
            // look up user
            reply({});
        },
        plugins: {
            hal: {
                api: 'mco:user'
            }
        }
    }
});
```

will auto-create the following api root:

```
curl -H 'Accept: application/hal+json' http://localhost:8080/api/

{
    "_links": {
        "self": {
            "href": "/api/"
        },
        "curies": [
            {
                "name": "mco",
                "href": "/rels/mycompany/{rel}",
                "templated": true
            }
        ],
        "mco:users": {
            "href": "/users"
        },
        "mco:user": {
            "href": "/users/{userId}",
            "templated": true
        }
    }
}
```

## Plugin Options
- `strict` - setting this to `true` will cause an exception to be thrown when referencing unregistered local rel. Setting this
to true will help catch typos during development. Default: `false`
- `relsPath` - the route path to the rels documentation root. Default: `/rels`
- `relsAuth` - the hapi authentication setting to use for the documentation routes. Default: `false`
- `autoApi` - setting this to `true` will automatically create a root api handler to seed your client application. Default: `true`
- `apiPath` - the route path to the api root. Default: `/api`
- `apiAuth` - the hapi authentication setting to use for the api route. Default: `false`
- `apiServerLabel` - when set, Halacious will select for a specific server to route the api root. 
- `mediaTypes` - an array of media types that will trigger the hal processor to modify the response (e.g. `['application/json', 
'application/hal+json']`). the media types are checked in order. if any match the accept header parameters, then the 
response will be halified and the media type of the response will be set to the first winner. Default: `['application/hal+json']`