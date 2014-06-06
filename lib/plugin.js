'use strict';

var internals = {};
var joi = require('joi');
var _ = require('lodash');

internals.defaults = {
    relsUrl: '/rels',
    apiUrl: '/api',
    apiServerLabel: null
};

internals.byName = {};

internals.byPrefix = {};

internals.nsSchema = {
    name: joi.string().required(),
    prefix: joi.string().optional().default(joi.ref('name')),
    description: joi.string().optional(),
    rels: joi.object().optional().default({}),
    rel: joi.func().optional().default(function(name, description) {
        this.rels[name] = { name: name, description: description, namespace: this};
        return this;
    })
};

internals.namespaces = function () {
    return _.values(internals.byName);
};

internals.namespaces.add = function(namespace) {
    var res = joi.validate(namespace, internals.nsSchema);
    if (res.error) throw res.error;
    namespace = res.value;
    internals.byName[namespace.name] = namespace;
    internals.byPrefix[namespace.prefix] = namespace;
    return namespace;
};

internals.namespace = function(namespace) {
    return internals.byName[namespace];
};

internals.rels = function() {
    return _.flatten(_.pluck(_.values(internals.byName), 'rels'));
};

internals.rels.add = function (namespace, name, description) {
    var ns = internals.byName[namespace];
    if (ns) {
        ns.rel(name, description);
    }
};

internals.rel = function(namespace, name) {
    var parts, ns;

    if (arguments.length === 1) {
        parts = arguments[0].split(':');
        ns = internals.byPrefix[parts[0]];
        return ns && ns.rels[parts[1]];
    }

    ns = internals.byName[namespace];
    return ns && ns.rels[name];
};

exports.register = function(plugin, opts, next) {
    plugin.expose('namespaces', internals.namespaces);
    plugin.expose('namespace', internals.namespace);
    plugin.expose('rels', internals.rels);
    plugin.expose('rel', internals.rel);
    next();
};