'use strict';

var _ = require('lodash');
var hoek = require('hoek');
var path = require('path');

function RepresentationFactory(halacious) {
    this._halacious = halacious;
}

RepresentationFactory.prototype.create = function(self, entity) {
    self = this._halacious.resolve(self);
    return new Representation(this._halacious, self, entity);
};

function Representation(halacious, self, entity) {
    this._self = self;
    this._halacious = halacious;
    this._links = { };
    this._embedded = {};
    this._namespaces = {};
    this.entity = entity;
}

Representation.prototype.toJSON = function() {
    var entity = { _links: { self: this._self }};
    if (this.namespaces.length > 0) {
        var curies = [];
    }
    hoek.merge(entity, this.entity);
    if (_.keys(this._embedded).length > 0) {
        entity._embedded = this._embedded;
    }
    return entity;
};

Representation.prototype.link = function(rel, link) {
    rel = this._halacious.rel(rel);

    if (rel.namespace) this._namespaces[rel.namespace.prefix] = rel.namespace;

    link = this._halacious.resolve(link, this._links.self.href);
    this._links[rel.qname()] = link;
    return this;
};

Representation.prototype.resolve = function(relativePath) {
    return path.join(this._links.self.href, relativePath);
};

Representation.prototype.route = function(routeName, params) {
    return this._halacious.route(routeName, params);
};

Representation.prototype.embed = function(rel, link, entity) {

};

module.exports.RepresentationFactory = RepresentationFactory;