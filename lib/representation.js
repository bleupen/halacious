'use strict';

var _ = require('lodash');
var hoek = require('hoek');
var path = require('path');
var urlTemplate = require('url-template');

var re = /\{([^\{\}]+)\}|([^\{\}]+)/g;

/**
 * evaluates and flattens deep expressions (e.g. '/{foo.a.b}') into a single level context object: {'foo.a.b': value}
 * @param template
 * @param ctx
 * @return {{}}
 */
function flattenContext(template, ctx) {
    var arr, result = {};

    while((arr = re.exec(template)) != null) {
        if (arr[1]) {
            var expr = arr[1];
            result[expr] = hoek.reach(ctx, expr);
        }
    }

    return result;
}

function RepresentationFactory(halacious, request) {
    this._halacious = halacious;
    this._request = request;
}

RepresentationFactory.prototype.create = function(entity, self, curieFn) {
    self = self || this._request && this._request.path;
    self = this._halacious.link(self);
    return new Representation(this, self, entity, curieFn);
};

function Representation(factory, self, entity, root) {
    this._halacious = factory._halacious;
    this.factory = factory;
    this.request = factory._request;
    this._root = root || this;
    this.self = self.href;
    this._links = { self: self };
    this._embedded = {};
    this._namespaces = {};
    this._props = {};
    this._ignore = {};
    this.entity = entity;
}

Representation.prototype.curie = function(namespace) {
    if (namespace && !this._root._namespaces[namespace.prefix]) {
        this._root._namespaces[namespace.prefix] = namespace;
        this._root._links.curies = this._root._links.curies || [];
        this._root._links.curies.push({ name: namespace.prefix, href: this._halacious.namespaceUrl(namespace) + '/{rel}', templated: true});
    }
};

/**
 * Adds a custom property to the HAL payload
 * @param {String} name the property name
 * @param {*} value the property value
 * @return {Representation}
 */
Representation.prototype.prop = function(name, value) {
    this._props[name] = value;
    return this;
};

/**
 * Merges an object's properties into the custom properties collection.
 * @param obj
 */
Representation.prototype.merge = function(obj) {
    hoek.merge(this._props, obj);
};

/**
 * @param {...String || String[]} props properties to ignore
 * @return {Representation}
 */
Representation.prototype.ignore = function(props) {
    props = _.isArray(props) ? props : Array.prototype.slice.call(arguments);
    props.forEach(function (prop) {
        this._ignore[prop] = true;
    }, this);
    return this;
};

/**
 * Prepares the representation for JSON serialization.
 * @return {{}}
 */
Representation.prototype.toJSON = function() {
    // initialize the json entity
    var payload = { _links: this._links };
    var self = this;

    // copy all target properties in the entity using JSON.stringify(). if the entity has a .toJSON() implementation,
    // it will be called. properties on the ignore list will not be copied
    var entity = this.entity;
    JSON.stringify(entity, function (key, value) {
        if (!key) {
            return value;
        }
        if (!self._ignore[key]) {
            payload[key] = value;
        }
    });

    // merge in any extra properties
    hoek.merge(payload, this._props);
    if (_.keys(this._embedded).length > 0) {
        payload._embedded = this._embedded;
    }

    return payload;
};

/**
 * Creates a new link and adds it to the _links collection
 * @param rel
 * @param link
 * @return {Representation}
 */
Representation.prototype.link = function(rel, link) {
    var qname;
    rel = this._halacious.rel(rel);

    this.curie(rel.namespace);

    link = this._halacious.link(link, this._links.self.href);
    link.href = urlTemplate.parse(link.href).expand(flattenContext(link.href, this.entity));

    qname = rel.qname();
    if (!this._links[qname]) {
        this._links[qname] = link;
    } else if (_.isArray(this._links[qname])) {
        this._links[qname].push(link);
    } else {
        this._links[qname] = [this._links[qname], link];
    }

    return this;
};

Representation.prototype.resolve = function(relativePath) {
    return path.resolve(this._links.self.href, relativePath);
};

Representation.prototype.route = function(routeName, params) {
    return this._halacious.route(routeName, params);
};

Representation.prototype.embed = function(rel, self, entity) {
    var qname;
    rel = this._halacious.rel(rel);

    this.curie(rel.namespace);

    self = this._halacious.link(self, this._links.self.href);

    self.href = urlTemplate.parse(self.href).expand(flattenContext(self.href, { self: this.entity, item: entity }));

    var embedded = this.factory.create(entity, self, this._root);

    qname = rel.qname();
    if (!this._embedded[qname]) {
        this._embedded[qname] = embedded;
    } else if (_.isArray(this._embedded[qname])) {
        this._embedded[qname].push(embedded);
    } else {
        this._embedded[qname] = [this._embedded[qname], embedded];
    }

    return embedded;
};

Representation.prototype.embedCollection = function(rel, self, entities) {
    entities = _.isArray(entities) ? entities : [ entities ];
    entities.forEach(function (entity) {
        this.embed(rel, hoek.clone(self), entity);
    }, this);
    return this;
};

module.exports.RepresentationFactory = RepresentationFactory;