dojo.provide("jsjac.packet.Packet");
dojo.require("jsjac.xmlextras");

jsjac.packet.USE_XMLNS = true;

jsjac.packet.Packet = function(/* string */name) {
  this.name = name;

  if (typeof(jsjac.packet.USE_XMLNS) != 'undefined' && jsjac.packet.USE_XMLNS)
    this.doc = jsjac.xmlextras.XmlDocument.create(name,'jabber:client');
  else
    this.doc =  jsjac.xmlextrasXmlDocument.create(name,'');

  this.pType = function() { return this.name; };

  this.getDoc = function() { return this.doc; };
  this.getNode = function() { return this.getDoc().documentElement; };

  this.setTo = function(/* string */to) {
    if (!to || to == '')
      this.getNode().removeAttribute('to');
    else
      this.getNode().setAttribute('to',to); 
    return this; 
  };
  this.setFrom = function(/* string */from) {
    if (!from || from == '')
      this.getNode().removeAttribute('from');
    else
      this.getNode().setAttribute('from',from);
    return this;
  };
  this.setID = function(/* string */id) { 
    if (!id || id == '')
      this.getNode().removeAttribute('id');
    else
      this.getNode().setAttribute('id',id); 
    return this; 
  };
  this.setType = function(/* string */type) { 
    if (!type || type == '')
      this.getNode().removeAttribute('type');
    else
      this.getNode().setAttribute('type',type);
    return this; 
  };
  this.setXMLLang = function(/* string */xmllang) {
    if (!xmllang || xmllang == '')
      this.getNode().removeAttribute('xml:lang');
    else
      this.getNode().setAttribute('xml:lang',xmllang);
    return this;
  };

  this.getTo = function() { return this.getNode().getAttribute('to'); }
  this.getFrom = function() { return this.getNode().getAttribute('from'); }
  this.getID = function() { return this.getNode().getAttribute('id'); }
  this.getType = function() { return this.getNode().getAttribute('type'); }
  this.getXMLLang = function() { return this.getNode().getAttribute('xml:lang'); };
  this.getXMLNS = function() { return this.getNode().namespaceURI; };

  this.xml = function() { 
    if (this.getDoc().xml)
      return this.getDoc().xml;
    var xml = (new XMLSerializer()).serializeToString(this.getNode()); // opera needs the node
    if (typeof(xml) != 'undefined') 
      return xml;
    return (new XMLSerializer()).serializeToString(this.doc); // oldschool

  };

  this._childElVal = function(/* string */nodeName) {
    var aNode = this._getChildNode(nodeName);
    if (aNode && aNode.firstChild)
      return aNode.firstChild.nodeValue;
    return '';
  }

  this._getChildNode = function(/* string */nodeName) {
    var children = this.getNode().childNodes;
    for (var i=0; i<children.length; i++)
      if (children.item(i).tagName == nodeName)
        return children.item(i);
    return null;
  }

  this._replaceNode = function(/* object */aNode) {
    // copy attribs
    for (var i=0; i<aNode.attributes.length; i++)
      if (aNode.attributes.item(i).nodeName != 'xmlns')
        this.getNode().setAttribute(aNode.attributes.item(i).nodeName,aNode.attributes.item(i).nodeValue);

    // copy children
    for (var i=0; i<aNode.childNodes.length; i++)
      if (this.getDoc().importNode)
        this.getNode().appendChild(this.getDoc().importNode(aNode.childNodes.item(i),true));
      else
        this.getNode().appendChild(aNode.childNodes.item(i).cloneNode(true));
				
  };

  this._setChildNode = function(/* object */nodeName, /* object */nodeValue) {
    var aNode = this._getChildNode(nodeName);
    var tNode = this.getDoc().createTextNode(nodeValue);
    if (aNode)
      try {
        aNode.replaceChild(tNode,aNode.firstChild);
      } catch (e) { }
    else {
      aNode = this.getNode().appendChild(this.getDoc().createElement(nodeName));
      aNode.appendChild(tNode);
    }
    return aNode;
  }

  this.clone = function() { return jsjac.packet.wrapNode(this.getNode()); }
};

/* ***
 * (static) JSJaCPWrapNode
 * transforms node to JSJaC internal representation (JSJaCPacket type)
 */
jsjac.packet.wrapNode = function(/* object */node) {
  var aNode;
  switch (node.nodeName.toLowerCase()) {
  case 'presence':
    aNode = new JSJaCPresence();
    break;
  case 'message':
    aNode = new JSJaCMessage();
    break;
  case 'iq':
    aNode = new JSJaCIQ();
    break;
  default : // unknown
    return node;
  }

  aNode._replaceNode(node);

  return aNode;
}

