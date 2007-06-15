function JSJaCJID(jid) {
  if (jid.node && jid.domain && jid.resource) {
    this._node = jid.node;
    this._domain = jid.domain;
    this._resource = jid.resource;
  } else {
    this._node = jid.substring(0,jid.indexOf('@'));
    if (jid.indexOf('/') != -1) {
      this._domain = jid.substring(jid.indexOf('@')+1,jid.indexOf('/'));
      this._resource = jid.substring(jid.indexOf('/')+1);
    } else {
      this._domain = jid.substring(jid.indexOf('@')+1);
      this._resource = "";
    }
  }

  this.getNode = function() { return this._node; };
  this.getDomain = function() { return this._domain; };
  this.getResource = function() { return this._resource; };

  this.setNode = function(node) {
    this._node = node;
    return this;
  }

  this.setDomain = function(domain) {
    this._domain = domain;
    return this;
  }

  this.setResource = function(resource) {
    resource = resource || "";
    this._resource = resource;
    return this;
  }

  this.toString = function() {
    if (this.getResource() != "")
      return this.getNode() + '@' + 
        this.getDomain() + '/' + 
        this.getResource();
    else
      return this.getNode() + '@' + this.getDomain();
  }

  this.removeResource = function() {
    this.setResource("");
  }
}
