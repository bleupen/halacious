'use strict';

var _ = require('lodash');
var hoek = require('hoek');
var path = require('path');
var urlTemplate = require('url-template');

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
    this.root = root || this;
    this.self = self;
    this._links = { self: self };
    this._embedded = {};
    this._namespaces = {};
    this._props = {};
    this._ignore = {};
    this.entity = entity;
}

Representation.prototype.curie = function(namespace) {
    if (namespace && !this._namespaces[namespace.prefix]) {
        this.root._namespaces[namespace.prefix] = namespace;
        this.root._links.curies = this.root._links.curies || [];
        this.root._links.curies.push({ name: namespace.prefix, href: this._halacious.namespaceUrl(namespace) + '/{rel}', templated: true});
    }
};

Representation.prototype.prop = function(name, value) {
    this._props[name] = value;
    return this;
};

Representation.prototype.ignore = function(props) {
    var props = Array.prototype.slice.call(arguments);
    props.forEach(function (prop) {
        this._ignore[prop] = true;
    }, this);
    return this;
};

Representation.prototype.toJSON = function() {
    var entity = { _links: this._links };
    var self = this;
    JSON.stringify(this.entity, function (key, value) {
        if (key && !self._ignore[key]) {
            entity[key] = value;
        } else {
            return value;
        }
    });
    hoek.merge(entity, this._props);
    if (_.keys(this._embedded).length > 0) {
        entity._embedded = this._embedded;
    }
    return entity;
};

Representation.prototype.link = function(rel, link) {
    var qname;
    rel = this._halacious.rel(rel);

    this.curie(rel.namespace);

    link = this._halacious.link(link, this._links.self.href);
    link.href = urlTemplate.parse(link.href).expand(this.entity);

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
    var qname, ns;
    rel = this._halacious.rel(rel);

    this.curie(rel.namespace);

    self = this._halacious.link(self, this._links.self.href);
    self.href = urlTemplate.parse(self.href).expand(this.entity);

    var embedded = this.factory.create(entity, self, this.root);

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

module.exports.RepresentationFactory = RepresentationFactory;