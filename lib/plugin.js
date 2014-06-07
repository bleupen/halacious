'use strict';

var internals = {};
var joi = require('joi');
var hapi = require('hapi');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var hoek = require('hoek');
var swig = require('swig');
var extras = require('swig-extras');
var util = require('util');
var RepresentationFactory = require('./representation').RepresentationFactory;

extras.useFilter(swig, 'markdown');

// default plugin options
internals.defaults = {
    relsUrl: '/rels',
    apiUrl: '/api',
    apiServerLabel: null
};

// for tracking down namespaces
internals.byName = {};
internals.byPrefix = {};

// valid rel options
internals.relSchema = {
    // the rel name, will default to file's basename if available
    name: joi.string().required(),

    // a path to the rel's documentation in html or markdown
    file: joi.string().optional(),

    // a short textual description
    description: joi.string().optional(),

    // returns the qualified name of the rel (including the namespace)
    qname: joi.func().optional().default(function() {
        return this.namespace ? util.format("%s:%s", this.namespace.prefix, this.name) : this.name;
    })
};

// valid namespace options
internals.nsSchema = {
    // the namespace name, will default to dir basename if available
    name: joi.string().required(),

    // a path to a directory containing rel descriptors. all rels will automatically be added
    dir: joi.string().optional(),

    // the namespace prefix for shorthand rel addressing (e.g. 'prefix:relname')
    prefix: joi.string().optional().default(joi.ref('name')),

    // a short description
    description: joi.string().optional(),

    // a map of rel objects, keyed by name
    rels: joi.object().optional(),

    // validates and adds a rel to the namespace
    rel: joi.func().optional().default(function(rel) {
        this.rels = this.rels || {};
        rel.name = rel.name || rel.file && path.basename(rel.file, path.extname(rel.file));
        joi.validate(rel, internals.relSchema, function(err, value) {
            if (err) throw err;
            rel = value;
        });
        this.rels[rel.name] = rel;
        rel.namespace = this;
        return this;
    }),

    // synchronously scans a directory for rel descriptors and adds them to the namespace
    scanDirectory: joi.func().optional().default(function(directory) {
        var files = fs.readdirSync(directory);
        files.forEach(function (file) {
            this.rel({ file: path.join(directory, file) });
        }, this);

        return this;
    })
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
internals.namespaces.add = function(namespace) {
    // if only dir is specified
    namespace.name = namespace.name || namespace.dir && path.basename(namespace.dir);

    // fail fast if the namespace isnt valid
    joi.validate(namespace, internals.nsSchema, function(err, value) {
        if (err) throw err;
        namespace = value;
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
 * Looks up a specific namespace
 * @param namespace
 * @return {*}
 */
internals.namespace = function(namespace) {
    return internals.byName[namespace];
};

/**
 * Sorts and returns all rels by namespace
 * @return {*}
 */
internals.rels = function() {
    return _.sort(_.flatten(_.pluck(_.values(internals.byName), 'rels')), 'name');
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
    return ns.rels[name];
};

/**
 * Looks up a rel under a given namespace
 * @param {String} namespace the namespace name
 * @param {String} name the rel name
 * @return {*} the rel or undefined if not found
 */
internals.rel = function(namespace, name) {
    var parts, ns, rel;

    if (arguments.length === 1) {
        if (namespace.indexOf(':') > 0) {
            parts = namespace.split(':');
            ns = internals.byPrefix[parts[0]];
            name = parts[1];
            if (ns && ns.rels[name]) {
                rel = ns.rels[name];
            } else {
                // lazily create the rel because why not
                ns.rel({ name: name });
                rel = ns.rels[name];
            }
        }

        if (!rel) {
            // could be globally qualified (e.g. 'self')
            joi.validate({ name: namespace }, internals.relSchema, function (err, value) {
                rel = value;
            });
        }
    } else {
        ns = internals.byName[namespace];
        rel = ns && ns.rels[name];
    }
    return rel;
};

/**
 * Route handler for /rels
 * @type {{handler: handler}}
 */
internals.namespacesRoute = {
    handler: function(req, reply) {
        reply.view('namespaces', { path: req.path, namespaces: internals.namespaces()});
    }
};

/**
 * Route handler for /rels/{namespace}/{rel}
 * @type {{handler: handler}}
 */
internals.relRoute = {
    handler: function(req, reply) {
        var rel = internals.rel(req.params.namespace, req.params.rel);
        if (!rel) return reply(hapi.error.notFound());
        if (rel.file) {
            fs.readFile(rel.file, function (err, data) {
                reply.view('rel', { rel: rel, content: data.toString() });
            });
        } else {
            reply.view('rel', rel);
        }
    }
};

var templatedRE = new RegExp('{*}');

internals.linkSchema = {
    href: joi.string().required(),
    templated: joi.boolean().optional().default(templatedRE.test(this.href) ? true : undefined),
    title: joi.string().optional(),
    type: joi.string().optional(),
    deprecation: joi.string().optional(),
    name: joi.string().optional(),
    profile: joi.string().optional(),
    hreflang: joi.string().optional()
};

internals.isRelativePath = function(path) {
    return path && (path.substring(0, 2) === './' || path.substring(0, 3) === '../');
};

/**
 * Resolves a name
 * @param link
 * @param relativeTo
 */
internals.link = function(link, relativeTo) {
    link = _.isString(link) ? { href: link } : link;
    joi.validate(link, internals.linkSchema, function (err, value) {
        if (err) throw err;
        link = value;
    });

    if (relativeTo && internals.isRelativePath(link.href)) {
        link.href = path.resolve(relativeTo, link.href);
    }

    return link;
};

// keeps found routes in a cache
internals.routeCache = {};

internals.locateRoute = function (servers, routeName) {
    var route, routes, i, j;

    if (internals.routeCache[routeName]) {
        return internals.routeCache[routeName].path;
    }

    for (i = 0; i < servers.length; i++) {
        routes = servers[i].table();
        for (j = 0; j < routes.length; j++) {
            route = routes[j];
            if (route.settings.plugins.hal && route.settings.plugins.hal.name === routeName) {
                internals.routeCache[routeName] = route;
                return route.path;
            }
        }
    }
};

internals.route = function(servers, routeName, params) {
    var path = internals.locateRoute(servers, routeName);

    if (!path) {
        throw new Error('No route named '+routeName);
    }

    _.forEach(params, function (value, key) {
        path = path.replace('{' + key + '}', value);
    });

    return path;
};

internals.namespaceUrl = function (relsBase, namespace) {
    return path.join(relsBase, namespace.name);
};

internals.preResponse = function(halacious, request, next) {
    var statusCode = request.response.statusCode;
    var rf = new RepresentationFactory(halacious, request);

    if (request.headers.accept &&
        request.headers.accept.indexOf('application/hal+json') >= 0 &&
        (statusCode === 200 || statusCode === 201) &&
        _.isObject(request.response.source)) {

        var halConfig = request.route.plugins.hal || {};

        if (_.isFunction(halConfig)) halConfig = { builder: halConfig };

        var entity = request.response.source;

        var rep = rf.create(entity);
        _.forEach(halConfig._links, function (link, rel) {
            rep.link(rel, link);
        });

        if (halConfig.builder && _.isFunction(halConfig.builder)) {
            halConfig.builder(rep, function (err, val) {
                var value = err || val || rep;
                next(value).type('application/hal+json');
            });
        } else {
            next(rep).type('application/hal+json');
        }
    } else {
        next();
    }
};

exports.register = function(plugin, opts, next) {
    var settings = hoek.applyToDefaults(internals.defaults, opts);
    var selection = settings.apiServerLabel ? plugin.select(settings.apiServerLabel) : plugin;
    var api = {
        namespaces: internals.namespaces,
        namespace: internals.namespace,
        namespaceUrl: internals.namespaceUrl.bind(internals, settings.relsUrl),
        link: internals.link,
        rels: internals.rels,
        rel: internals.rel,
        resolve: internals.resolve,
        route: internals.route.bind(internals, plugin.servers)
    };

    var rf = new RepresentationFactory(api);

    plugin.expose(api);
    plugin.route({ method: 'get', path: settings.relsUrl, config: internals.namespacesRoute });
    plugin.route({ method: 'get', path: path.join(settings.relsUrl, '{namespace}/{rel}'), config: internals.relRoute });


    selection.ext('onPreResponse', internals.preResponse.bind(internals, api));
    plugin.views({
        engines: {
            html: 'swig'
        },
        path: './views',
        isCached: false
    });
    next();
};