'use strict';

var _ = require('lodash');
var hoek = require('hoek');

function RepresentationFactory(halacious) {
    this._halacious = halacious;
}

RepresentationFactory.prototype.create = function(self, entity) {
    self = this._halacious.resolve(self);
    return new Representation(this._halacious, self, entity);
};

function Representation(halacious, self, entity) {
    this._halacious = halacious;
    this._links = { self: self };
    this._embedded = {};
    this.entity = entity;
}

Representation.prototype.toJSON = function() {
    var entity = {_links: this._links};
    hoek.merge(entity, this.entity);
    if (_.keys(this._embedded).length > 0) {
        entity._embedded = this._embedded;
    }
    return entity;
};

Representation.prototype.link = function(rel, link) {
    rel = this._halacious.rel(rel);
    link = this._halacious.resolve(link, this._links.self.href);
    this._links[rel.qname()] = link;
    return this;
};

Representation.prototype.embed = function(rel, link, entity) {

};

module.exports.RepresentationFactory = RepresentationFactory;