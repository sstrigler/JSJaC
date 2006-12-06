dojo.provide("jsjac.packet.IQ");
dojo.require("jsjac.packet.Packet");

jsjac.packet.IQ = function() {
  this.base = JSJaCPacket;
  this.base('iq');

  this.setIQ = function(/* string */to,/* string */from,/* string */type,/* string */id) {
    if (to)
      this.setTo(to);
    if (type)
      this.setType(type);
    if (from)
      this.setFrom(from);
    if (id)
      this.setID(id);
    return this; 
  };
  this.setQuery = function(/* string */xmlns) {
    var query;
    try {
      query = this.getDoc().createElementNS(xmlns,'query');
    } catch (e) {
      // fallback
      query = this.getDoc().createElement('query');
    }
    if (query && query.getAttribute('xmlns') != xmlns) // fix opera 8.5x
      query.setAttribute('xmlns',xmlns);
    this.getNode().appendChild(query);
    return query;
  };

  this.getQuery = function() {
    return this.getNode().getElementsByTagName('query').item(0);
  };
  this.getQueryXMLNS = function() {
    if (this.getQuery())
      return this.getQuery().namespaceURI;
    else
      return null;
  };
};
