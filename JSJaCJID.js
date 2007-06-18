// list of forbidden chars for nodenames
var JSJACJID_FORBIDDEN = ['"',' ','&','\'','/',':','<','>','@']; 

function JSJaCJID(jid) {
  this._node = '';
  this._domain = '';
  this._resource = '';

  // getters

  this.getNode = function() { return this._node; };
  this.getDomain = function() { return this._domain; };
  this.getResource = function() { return this._resource; };

  // setters

  this.setNode = function(node) {
    this._checkNodeName(node);
    this._node = node || '';
    return this;
  };

  this.setDomain = function(domain) {
    if (!domain || domain == '')
      throw new JSJaCJIDInvalidException("domain name missing");
    // chars forbidden for a node are not allowed in domain names
    // anyway, so let's check
    this._checkNodeName(domain); 
    this._domain = domain;
    return this;
  };

  this.setResource = function(resource) {
    this._resource = resource || '';
    return this;
  };

  // public functions

  this.toString = function() {
    var jid = '';
    if (this.getNode() && this.getNode() != '')
      jid = this.getNode() + '@';
    jid += this.getDomain(); // we always have a domain
    if (this.getResource() && this.getResource() != "")
      jid += '/' + this.getResource();
    return jid;
  }

  this.removeResource = function() {
    return this.setResource();
  };


  // private functions

  // throws exception on error
  this._checkNodeName = function(nodeprep) {
    if (!nodeprep || nodeprep == '')
      return;
    for (var i=0; i< JSJACJID_FORBIDDEN.length; i++) {
      if (nodeprep.indexOf(JSJACJID_FORBIDDEN[i]) != -1) {
        throw new JSJaCJIDInvalidException("forbidden char in nodename: "+JSJACJID_FORBIDDEN[i]);
      }
    }
  };


  // constructor

  if (typeof(jid) == 'string') {
    if (jid.indexOf('@') != -1) {
        this.setNode(jid.substring(0,jid.indexOf('@')));
        jid = jid.substring(jid.indexOf('@')+1);
    }
    if (jid.indexOf('/') != -1) {
      this.setResource(jid.substring(jid.indexOf('/')+1));
      jid = jid.substring(0,jid.indexOf('/'));
    }
    this.setDomain(jid);
  } else {
    this.setNode(jid.node);
    this.setDomain(jid.domain);
    this.setResource(jid.resource);
  }

}

function JSJaCJIDInvalidException(msg) {
  this.message = msg;
  this.name = "JSJaCJIDInvalidException";
}
