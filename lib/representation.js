'use strict';

var _ = require('lodash');
var hoek = require('hoek');
var path = require('path');
var templatedRE = new RegExp('{*}');


/**
 * Responsible for creating all hal entities, top level or embedded, needed for a hapi request
 * @param halacious a reference to the plugin api
 * @param request a hapi request object
 * @constructor
 */
function RepresentationFactory(halacious, request) {
    this._halacious = halacious;
    this._request = request;
}

/**
 * Creates a new hal representation out of a javascript object
 * @param {{}=} entity the entity to wrap with a representation. an empty object is created by default
 * @param {String || {}=} self the self href or link object. The request's path is used by default
 * @param {Representation} root a pointer to the top level representation for adding curied links
 * @return {Representation}
 */
RepresentationFactory.prototype.create = function(entity, self, root) {
    entity = entity || {};
    self = self || this._request && this._request.path;
    self = this._halacious.link(self);
    return new Representation(this, self, entity, root);
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

/**
 * Adds a namespace to the 'curie' link collection. all curies in a response, top level or nested, should be declared
 * in the top level _links collection. a reference '_root' is kept to the top level representation for this purpose
 * @param namespace
 */
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
 * @return {{} || []} the new link
 */
Representation.prototype.link = function(rel, link) {
    var qname;
    var originalRel = rel;
    rel = this._halacious.rel(rel);
    qname = rel.qname();

    if (_.isArray(link) && link.length > 0) {
        var that = this;
        this._links[qname] = [];
        return link.map(function (l) {
            return that.link(originalRel, l);
        }, this);
    }
    
    // adds the namespace to the top level curie list
    this.curie(rel.namespace);

    link = this._halacious.link(link, this._links.self.href);
    link.templated = templatedRE.test(link.href) ? true : undefined;
    // e.g. 'mco:rel'
    if (!this._links[qname]) {
        this._links[qname] = link;
    } else if (_.isArray(this._links[qname])) {
        this._links[qname].push(link);
    } else {
        this._links[qname] = [this._links[qname], link];
    }

    return link;
};

/**
 * Resolves a relative path against the representation's self href
 * @param relativePath
 * @return {*}
 */
Representation.prototype.resolve = function(relativePath) {
    return path.resolve(this._links.self.href, relativePath);
};

/**
 * Returns the path to a named route (specified by the plugins.hal.name configuration parameter), expanding any supplied
 * path parameters.
 * @param {String} routeName the route's name
 * @param {{}=} params for expanding templated urls
 * @return {*}
 */
Representation.prototype.route = function(routeName, params) {
    return this._halacious.route(routeName, params);
};

/**
 * Wraps an entity into a HAL representation and adds it to the _embedded collection
 * @param {String} rel the rel name
 * @param {String || {}} self an href or link object for the entity
 * @param {{} || []} entity an object to wrap
 * @return {entity || []}
 */
Representation.prototype.embed = function(rel, self, entity) {
    var qname;
    var originalRel = rel;
    rel = this._halacious.rel(rel);
    qname = rel.qname();
    
    if (_.isArray(entity) && entity.length > 0) {
        var that = this;
        this._embedded[qname] = [];
        return entity.map(function (e) {
            return that.embed(originalRel, self, e);
        }, this);
    }

    this.curie(rel.namespace);

    self = this._halacious.link(self, this._links.self.href);

    var embedded = this.factory.create(entity, self, this._root);

    if (!this._embedded[qname]) {
        this._embedded[qname] = embedded;
    } else if (_.isArray(this._embedded[qname])) {
        this._embedded[qname].push(embedded);
    } else {
        this._embedded[qname] = [this._embedded[qname], embedded];
    }

    return embedded;
};

/**
 * Convenience method for embedding an array of entities
 * @param rel
 * @param self
 * @param entities
 * @return {Representation}
 */
Representation.prototype.embedCollection = function(rel, self, entities) {
    entities = _.isArray(entities) ? entities : [ entities ];
    entities.forEach(function (entity) {
        this.embed(rel, hoek.clone(self), entity);
    }, this);
    return this;
};

module.exports.RepresentationFactory = RepresentationFactory;