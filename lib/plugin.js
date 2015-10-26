'use strict';

var joi = require('joi');
var hapi = require('hapi');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var hoek = require('hoek');
var swig = require('swig');
var extras = require('swig-extras');
var util = require('util');
var async = require('async');
var RepresentationFactory = require('./representation').RepresentationFactory;
var urlTemplate = require('url-template');
var Negotiator = require('negotiator');
var URITemplate = require('URIjs/src/URITemplate');
var url = require('url');
var URI = require('URIjs');

extras.useFilter(swig, 'markdown');

var re = /\{([^\{\}]+)\}|([^\{\}]+)/g;

function reach(object, path) {
    var parts = path ? path.split('.') : [];

    for (var i = 0; i < parts.length && !_.isUndefined(object); i++) {
        object = object[parts[i]];
    }

    return object;
}

/**
 * evaluates and flattens deep expressions (e.g. '/{foo.a.b}') into a single level context object: {'foo.a.b': value}
 * so that it may be used by url-template library
 * @param template
 * @param ctx
 * @return {{}}
 */
function flattenContext(template, ctx) {
    var arr, result = {};

    while ((arr = re.exec(template)) !== null) {
        if (arr[1]) {
            var value = reach(ctx, arr[1]);
            result[arr[1]] = value && value.toString();
        }
    }

    return result;
}

var optionsSchema = {
    absolute: joi.boolean().default(false),
    host: joi.string(),
    hostname: joi.string(),
    port: joi.number().integer(),
    protocol: joi.string(),
    strict: joi.boolean().default(false),
    relsPath: joi.string().default('/rels'),
    relsAuth: joi.alternatives().try(joi.boolean().allow(false),joi.object()).default(false),
    autoApi: joi.boolean().default(true),
    apiPath: joi.string().allow('').default('/api'),
    apiAuth: joi.alternatives().try(joi.boolean().allow(false),joi.object()).default(false),
    apiServerLabel: joi.string(),
    mediaTypes: joi.array().includes(joi.string()).single().default(['application/hal+json'])
};

/**
 * Registers plugin routes and an "api" object with the hapi server.
 * @param server
 * @param opts
 * @param next
 */
exports.register = function (server, opts, next) {
    var settings = opts;

    joi.validate(opts, optionsSchema, function (err, validated) {
        if (err) throw err;

        settings = validated;
    });

    var selection = settings.apiServerLabel ? server.select(settings.apiServerLabel) : server;

    var internals = {};

// for tracking down namespaces
    internals.byName = {};
    internals.byPrefix = {};

// valid rel options
    internals.relSchema = {
        // the rel name, will default to file's basename if available
        name: joi.string()
            .required(),

        // a path to the rel's documentation in html or markdown
        file: joi.string()
            .optional(),

        // a short textual description
        description: joi.string()
            .optional(),

        // returns the qualified name of the rel (including the namespace)
        qname: joi.func()
            .optional()
            .default(function () {
                return this.namespace ? util.format('%s:%s', this.namespace.prefix, this.name) : this.name;
            })
    };

// valid namespace options
    internals.nsSchema = {
        // the namespace name, will default to dir basename if available
        name: joi.string()
            .required(),

        // a path to a directory containing rel descriptors. all rels will automatically be added
        dir: joi.string()
            .optional(),

        // the namespace prefix for shorthand rel addressing (e.g. 'prefix:relname')
        prefix: joi.string()
            .optional()
            .default(joi.ref('name')),

        // a short description
        description: joi.string()
            .optional(),

        // a map of rel objects, keyed by name
        rels: joi.object()
            .optional(),

        // validates and adds a rel to the namespace
        rel: joi.func()
            .optional()
            .default(function (rel) {
                this.rels = this.rels || {};

                if (_.isString(rel)) rel = { name: rel };

                rel.name = rel.name || rel.file && path.basename(rel.file, path.extname(rel.file));
                joi.validate(rel, internals.relSchema, function (err, value) {
                    if (err) throw err;
                    rel = value;
                });
                this.rels[rel.name] = rel;
                rel.namespace = this;
                return this;
            }),

        // synchronously scans a directory for rel descriptors and adds them to the namespace
        scanDirectory: joi.func()
            .optional()
            .default(function (directory) {
                var files = fs.readdirSync(directory);
                files.forEach(function (file) {
                    this.rel({ file: path.join(directory, file) });
                }, this);

                return this;
            })
    };

    internals.filter = function (request) {
        return _.get(request.route.settings, 'plugins.hal', true);
    };

    /**
     * Returns a list of all registered namespaces sorted by name
     * @return {*}
     */
    internals.namespaces = function () {
        return _.sortBy(_.values(internals.byName), 'name');
    };

    /**
     * Validates and adds a new namespace configuration
     * @param namespace the namespace config
     * @return {*} a new namespace object
     */
    internals.namespaces.add = function (namespace) {
        // if only dir is specified
        namespace.name = namespace.name || namespace.dir && path.basename(namespace.dir);

        // fail fast if the namespace isnt valid
        joi.validate(namespace, internals.nsSchema, function (err, value) {
            if (err) throw err;
            namespace = value;

            // would prefer to initialize w/ joi but it keeps a static reference to the value for some reason
            namespace.rels = {};
        });

        if (namespace.dir) {
            namespace.scanDirectory(namespace.dir);
        }

        // index and return
        internals.byName[namespace.name] = namespace;
        internals.byPrefix[namespace.prefix] = namespace;

        return namespace;
    };

    /**
     * Removes one or all registered namespaces. Mainly used for testing
     * @param {String=} namespace the namespace to remove. a falsy value will remove all namespaces
     */
    internals.namespaces.remove = function (namespace) {
        var ns;

        if (!namespace) {
            internals.byName = {};
            internals.byPrefix = {};
        } else {
            ns = internals.byName[namespace];
            if (ns) {
                delete internals.byName[namespace];
                delete internals.byPrefix[namespace.prefix];
            }
        }
    };

    /**
     * Looks up a specific namespace
     * @param namespace
     * @return {*}
     */
    internals.namespace = function (namespace) {
        return internals.byName[namespace];
    };

    /**
     * Sorts and returns all rels by namespace
     * @return {*}
     */
    internals.rels = function () {
        var rels = [];
        _.values(internals.byName)
            .forEach(function (ns) {
                rels = rels.concat(_.values(ns.rels) || []);
            });
        return _.sortBy(rels, 'name');
    };

    /**
     * Adds a new rel configuration to a namespace
     * @param {String} namespace the namespace name
     * @param rel the rel configuration
     * @return the new rel
     */
    internals.rels.add = function (namespace, rel) {
        var ns = internals.byName[namespace];
        if (!ns) throw new Error('Invalid namespace ' + namespace);
        ns.rel(rel);
        return ns.rels[rel.name];
    };

    /**
     * Looks up a rel under a given namespace
     * @param {String} namespace the namespace name
     * @param {String} name the rel name
     * @param {boolean} strict if the namespace is found but not the rel, throw an error rather than lazily create the rel
     * @return {*} the rel or undefined if not found
     */
    internals.rel = function (namespace, name, strict) {
        var parts, ns, rel;

        if (!name) {
            // for shorthand namespace:rel notation
            if (namespace.indexOf(':') > 0) {
                parts = namespace.split(':');
                ns = internals.byPrefix[parts[0]];
                name = parts[1];
            }
        } else {
            ns = internals.byName[namespace];
        }

        // namespace is valid, check for rel
        if (ns) {
            if (ns.rels[name]) {

                // rel has been defined
                rel = ns.rels[name];

            } else if (!strict) {

                // lazily create the rel
                ns.rel({ name: name });
                rel = ns.rels[name];

            } else {
                // could be a typo, fail fast to let the developer know
                throw new Error('No such rel: "' + namespace + '"');
            }
        } else {
            // could be globally qualified (e.g. 'self')
            joi.validate({ name: namespace }, internals.relSchema, function (err, value) {
                rel = value;
            });
        }

        return rel;
    };

    /**
     * Route handler for /rels
     * @type {{handler: handler}}
     */
    internals.namespacesRoute = function (relsAuth) {
        return {
            auth: relsAuth,
            handler: function (req, reply) {
                reply.view('namespaces', { path: req.path, namespaces: internals.namespaces() });
            }
        };
    };

    /**
     * Route handler for /rels/{namespace}/{rel}
     * @type {{handler: handler}}
     */
    internals.relRoute = function (relsAuth) {
        return {
            auth: relsAuth,
            handler: function (req, reply) {
                var rel = internals.rel(req.params.namespace, req.params.rel);
                if (!rel) return reply(hapi.error.notFound());
                if (rel.file) {
                    fs.readFile(rel.file, function (err, data) {
                        reply.view('rel', { rel: rel, relData: data.toString() });
                    });
                } else {
                    reply.view('rel', { rel: rel });
                }
            }
        };
    };

// see http://tools.ietf.org/html/draft-kelly-json-hal-06#section-8.2
    internals.linkSchema = {
        href: joi.alternatives([joi.string(), joi.func()])
            .required(),
        templated: joi.boolean()
            .optional(),
        title: joi.string()
            .optional(),
        type: joi.string()
            .optional(),
        deprecation: joi.string()
            .optional(),
        name: joi.string()
            .optional(),
        profile: joi.string()
            .optional(),
        hreflang: joi.string()
            .optional()
    };

    internals.isRelativePath = function (path) {
        return path && (path.substring(0, 2) === './' || path.substring(0, 3) === '../');
    };

    /**
     * Resolves a name
     * @param link
     * @param relativeTo
     */
    internals.link = function (link, relativeTo) {
        relativeTo = relativeTo && relativeTo.split('?')[0];
        link = _.isFunction(link) || _.isString(link) ? { href: link } : hoek.clone(link);
        joi.validate(link, internals.linkSchema, function (err, value) {
            if (err) throw err;
            link = value;
        });

        if (relativeTo && internals.isRelativePath(link.href)) {
            link.href = new URI(link.href).absoluteTo(relativeTo + '/')
                .toString();
        }

        return link;
    };

// keeps found routes in a cache
    internals.routeCache = {};

    /**
     * Locates a named route. This feature may not belong here
     * @param routeName
     * @return {*}
     */
    internals.locateRoute = function (routeName) {
        var route, routes, i;

        if (internals.routeCache[routeName]) {
            return internals.routeCache[routeName].path;
        }

        routes = server.table()
            .reduce(function (acc, conn) {
                return acc.concat(conn.table);
            }, []);

        for (i = 0; i < routes.length; i++) {
            route = routes[i];
            if (route.settings.plugins.hal && route.settings.plugins.hal.name === routeName) {
                internals.routeCache[routeName] = route;
                return route;
            }
        }
    };

    /**
     * Locates a named route and expands templated parameters
     * @param routeId
     * @param params
     * @return String the expanded path to the named route
     */
    internals.route = function (routeId, params) {
        var route = server.lookup(routeId) || internals.locateRoute(routeId);
        if (!route) throw new Error('No route found with id or name ' + routeId);
        var href = _.template(route.path, { interpolate: /{([\s\S]+?)}/g })(params);
        var query = hoek.reach(route.settings, 'plugins.hal.query');
        return query ? href + query : href;
    };

    /**
     * Returns the documentation link to a namespace
     * @param namespace
     * @return {*}
     */
    internals.namespaceUrl = function (namespace) {
        return [settings.relsPath, namespace.name].join('/');
    };

    /**
     * Configures a representation with parameters specified by a hapi route config. The configuration object may
     * include 'links', 'embedded', and 'prepare' properties.
     * @param {Representation} rep the representation to configure
     * @param {{}} config the config object
     * @param callback
     */
    internals.configureRepresentation = function configureRepresentation(rep, config, callback) {
        var resolveHref = function (href, ctx) {
            return _.isFunction(href) ? href(rep, ctx) : urlTemplate.parse(href)
                .expand(flattenContext(href, ctx));
        };

        try {
            var entity = rep.entity;

            // shorthand prepare function
            if (_.isFunction(config)) config = { prepare: config };

            // configure links
            _.forEach(config.links, function (link, rel) {
                link = internals.link(link, rep.self.href);
                link.href = resolveHref(link.href, entity);
                rep.link(rel, link);

                // grab query options
                if (config.query) {
                    link.href += config.query;
                }
            });

            /**
             * Wraps callback functions to support next(rep) instead of next(null, rep)
             * @param callback
             * @return {Function}
             */
            var wrap = function (callback) {
                return function (err, result) {
                    if (err instanceof Error) {
                        callback(err);
                    } else {
                        callback(null, result || rep);
                    }
                };
            };

            /**
             * Looks for a toHal(representation, next) method on the entity. If found, it is called asynchronously. The method may modify the
             * representation or pass back a completely new representation by calling next(newRep)
             * @param callback
             */
            var convertEntity = function (callback) {
                if (_.isFunction(entity.toHal)) {
                    entity.toHal(rep, wrap(callback));
                } else {
                    callback(null, rep);
                }
            };

            /**
             * Looks for an asynchronous prepare method for programmatic configuration of the outbound hal entity. As with
             * toHal(), the prepare method can modify the existing rep or create an entirely new one.
             * @param rep
             * @param callback
             */
            var prepareEntity = function (rep, callback) {
                if (_.isFunction(config.prepare)) {
                    config.prepare(rep, wrap(callback));
                } else {
                    callback(null, rep);
                }
            };

            // configure embedded declarations. each rel entry is also a representation config object
            async.each(Object.keys(config.embedded || {}), function (rel, cb) {
                var embed = config.embedded[rel];

                // assume that arrays should be embedded as a collection
                if (!embed.path) {
                    throw new Error('Error in route ' + rep.request.path + ': "embedded" route configuration property requires a path');
                }
                var embedded = hoek.reach(entity, embed.path);
                if (!embedded) return cb();

                // force the embed array to be inialized. no self rel is necessary
                if (_.isArray(embedded)) rep.embed(rel, null, []);

                // force into an array for iterating
                embedded = [].concat(embedded);

                // embedded reps probably also shouldnt appear in the object payload
                rep.ignore(embed.path);

                async.each(embedded, function (item, acb) {
                    var link = internals.link(resolveHref(embed.href, { self: entity, item: item }), rep.self.href);

                    // create the embedded representation from the possibly templated href
                    var embeddedRep = rep.embed(rel, link, item);

                    embeddedRep = _.isArray(embeddedRep) ? embeddedRep : [embeddedRep];
                    // recursively process its links/embedded declarations
                    async.each(embeddedRep, function (e, bcb) {
                        configureRepresentation(e, embed, bcb);
                    }, acb);
                }, cb);

            }, function (err) {
                if (err) return callback(err);

                rep.ignore(config.ignore);

                // cascade the async config functions
                async.waterfall([
                    convertEntity,
                    prepareEntity
                ], callback);
            });
        } catch (e) {
            callback(e);
        }
    };

    /**
     * Selects the media type based on the request's Accept header and a ranked ordering of configured
     * media types.
     * @param mediaTypes
     * @param request
     * @return {*}
     */
    internals.getMediaType = function (mediaTypes, request) {
        return new Negotiator(request).mediaType(_.isArray(mediaTypes) ? mediaTypes : [mediaTypes]);
    };

    /**
     * Expands the url path to include protocol://server:port
     * @param request
     * @param path
     * @param search
     * @return {*}
     */
    internals.buildUrl = function (request, path, search) {
        return url.format({
            host: settings.host || request.headers.host,
            hostname: settings.hostname || request.connection.info.host,
            port: settings.port || request.connection.info.port,
            pathname: path,
            protocol: settings.protocol || request.connection.info.protocol,
            search: search
        });
    };

    /**
     * Expands the query string template, if present, using query parameter values in the request.
     * @param request
     * @param queryTemplate
     * @param { boolean } absolute whether the link should be expanded to include the server
     * @return {*}
     */
    internals.getRequestPath = function (request, queryTemplate, absolute) {
        var uriTemplate;

        var path = absolute ? internals.buildUrl(request, request.path) : request.path;

        if (queryTemplate) {
            uriTemplate = new URITemplate(path + queryTemplate);
            return uriTemplate.expand(request.query);
        }
        return path;
    };

    /**
     * Resolves a relative url. Borrowed from hapi
     * @param request
     * @param uri
     * @param absolute
     * @return {*}
     */
    internals.location = function (request, uri, absolute) {
        var isAbsolute = (uri.match(/^\w+\:\/\//));

        var path = isAbsolute ? uri : (uri.charAt(0) === '/' ? '' : '/') + uri;
        var search = null;

        if (isAbsolute) {
            path = uri;
        } else {
            var parts = uri.split('?');
            path = (parts[0].charAt(0) === '/' ? '' : '/') + parts[0];
            if (parts.length > 1) {
                search = parts[1];
            }
        }

        if (absolute) {
            path = internals.buildUrl(request, path, search);
        }
        return path;
    };

    internals.successfulResponseCode = function (statusCode) {
        return statusCode === 200 || statusCode === 201;
    };

    internals.isSourceEligible = function (source) {
        return _.isObject(source) && !(_.isArray(source));
    };

    internals.isRequestEligible = function (request) {
        // hapi 9/10 routes can be marked internal only
        return !request.route.settings.isInternal && internals.filter(request);
    };

    internals.isResponseEligible = function (response) {
        return response.variety === 'plain' && internals.successfulResponseCode(response.statusCode);
    };

    internals.shouldHalify = function (request) {
        return internals.isRequestEligible(request) &&
            internals.isResponseEligible(request.response) &&
            internals.isSourceEligible(request.response.source);
    };

    /**
     * A hapi lifecycle method that looks for the application/hal+json accept header and wraps the response entity into a
     * HAL representation
     * @param halacious
     * @param settings
     * @param request
     * @param reply
     */
    internals.preResponse = function (halacious, settings, request, reply) {
        var rf, halConfig, entity, rep, self, location;
        var mediaType = internals.getMediaType(settings.mediaTypes, request);
        var absolute;

        if (mediaType && internals.shouldHalify(request)) {

            halConfig = request.route.settings.plugins.hal || {};

            // all new representations for the request will be built by this guy
            rf = new RepresentationFactory(halacious, request);

            entity = request.response.source;

            absolute = halConfig.absolute || settings.absolute;

            // e.g. honor the location header if it has been set using response.created(...) or response.location(...)
            location = request.response.headers.location;
            self = location ? internals.location(request, location, absolute) : internals.getRequestPath(request, halConfig.query, absolute);

            rep = rf.create(entity, self);

            // asynchronously configure the rep and its children, then send the response
            internals.configureRepresentation(rep, halConfig, function (err, rep) {
                if (err) {
                    return reply(err);
                }

                // send back what they asked for
                var response = reply(rep)
                    .type(mediaType)
                    .code(request.response.statusCode);

                // avoid an undefined header
                if (request.response.settings.location) response.location(request.response.settings.location);

                response.hold();

                // // copy headers
                _.forEach(request.response.headers, function (value, key) {
                    if (key !== 'content-type') {
                        response.header(key, value);
                    }
                });

                response.send();
            });
        } else {
            reply.continue();
        }
    };

    /**
     * Prepares a hal response with all root "api" handlers declared in the routing table. Api handlers are identified with
     * the plugins.hal.api configuration settings. This function is exported for convenience if the developer wishes to
     * define his or her own api handler in order to include metadata in the payload
     *
     * @param absolute
     * @param rep
     * @param next
     */
    internals.apiLinker = function (absolute, rep, next) {
        // grab the routing table and iterate
        var req = rep.request;

        var routes = req.server.table()
            .reduce(function (acc, conn) {
                return acc.concat(conn.table);
            }, []);

        for (var i = 0; i < routes.length; i++) {
            var route = routes[i];

            var halConfig = route.settings.plugins.hal || {};

            if (halConfig.api) {
                var rel = halConfig.api;
                var href = routes[i].path;

                if (absolute) {
                    href = internals.buildUrl(rep.request, href);
                }

                // grab query options
                if (halConfig.query) {
                    href += halConfig.query;
                }

                rep.link(rel, href);
            }
        }
        next();
    };

    /**
     * Creates an auto api route configuration
     * @param absolute
     * @param apiAuth
     * @return {{auth: *, handler: handler, plugins: {hal: apiLinker}}}
     */
    internals.apiRouteConfig = function (absolute, apiAuth) {
        return {
            auth: apiAuth,
            handler: function (req, reply) {
                reply({})
                    .type('application/hal+json');
            },
            plugins: {
                hal: internals.apiLinker.bind(null, absolute)
            }
        };
    };

    /**
     * Creates a redirector to redirect the browser from /api to /api/
     * @param apiUrl
     * @param apiAuth
     * @return {{auth: *, handler: handler}}
     */
    internals.apiRedirectConfig = function (apiUrl, apiAuth) {
        return {
            auth: apiAuth,
            handler: function (req, reply) {
                reply.redirect(apiUrl + '/');
            }
        };
    };

    /**
     * Assigns a filter function to test routes before applying the hal interceptor.
     * @param filterFn
     */
    internals.setFilter = function (filterFn) {
        joi.validate(filterFn, joi.func(), function (err) {
            if (err) throw err;

            internals.filter = filterFn;
        });
    };

    internals.setUrlBuilder = function(urlBuilder) {
        joi.validate(urlBuilder, joi.func(), function (err) {
            if (err) throw err;

            internals.buildUrl = urlBuilder;
        });
    };

    var api = {
        namespaces: internals.namespaces,
        namespace: internals.namespace,
        namespaceUrl: internals.namespaceUrl,
        link: internals.link,
        rels: internals.rels,
        rel: function (namespace, name) {
            return internals.rel(namespace, name, opts.strict);
        },
        resolve: internals.resolve,
        route: internals.route,
        apiLinker: internals.apiLinker,
        filter: internals.setFilter,
        urlBuilder: internals.setUrlBuilder
    };

    // hapi wont find the local swig without this
    server.expose(api);

    selection.ext('onPreResponse', internals.preResponse.bind(internals, api, settings));

    if (settings.autoApi) {
        // bind the API handler to api root + '/'. Ending with '/' is necessary for resolving relative links on the client
        selection.route({
            method: 'GET',
            path: settings.apiPath + '/',
            config: internals.apiRouteConfig(settings.absolute, settings.apiAuth)
        });

        // set up a redirect to api root + '/'
        if (settings.apiPath.length > 0) {
            selection.route({
                method: 'GET',
                path: settings.apiPath,
                config: internals.apiRedirectConfig(settings.apiPath, settings.apiAuth)
            });
        }
    }

    internals.preStart = function(server, next) {
        if (_.isFunction(server.views)) {
            server.log(['halacious', 'info'], 'Views support detected, installing documentation routes');
            server.views({
                engines: {
                    html: swig
                },
                path: path.join(__dirname, '../views'),
                isCached: false
            });
            server.route({
                method: 'get',
                path: settings.relsPath,
                config: internals.namespacesRoute(settings.relsAuth)
            });
            server.route({
                method: 'get',
                path: settings.relsPath + '/{namespace}/{rel}',
                config: internals.relRoute(settings.relsAuth)
            });
        } else {
            server.log(['halacious', 'info'], 'Views support not detected. Please install vision plugin for rel documentation');
        }

        next();
    };

    // hapi < v9 does not support 'onPreStart' event
    if (_.isFunction(server.after)) {
        server.after(internals.preStart);
    } else {
        server.ext('onPreStart', internals.preStart);
    }

    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
