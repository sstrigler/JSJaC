var JSJACPACKET_USE_XMLNS = true;

function JSJaCPacket(name) {
	this.name = name;

 	if (typeof(JSJACPACKET_USE_XMLNS) != 'undefined' && JSJACPACKET_USE_XMLNS)
 	  this.doc = XmlDocument.create(name,'jabber:client');
 	else
 	  this.doc = XmlDocument.create(name,'');

	this.pType = function() { return this.name; };

	this.getDoc = function() { return this.doc; };
	this.getNode = function() { return this.getDoc().documentElement; };

	this.setTo = function(to) {
		if (!to || to == '')
			this.getNode().removeAttribute('to');
		else
			this.getNode().setAttribute('to',to); 
		return this; 
	};
	this.setFrom = function(from) {
		if (!from || from == '')
			this.getNode().removeAttribute('from');
		else
			this.getNode().setAttribute('from',from);
		return this;
	};
	this.setID = function(id) { 
		if (!id || id == '')
			this.getNode().removeAttribute('id');
		else
			this.getNode().setAttribute('id',id); 
		return this; 
	};
	this.setType = function(type) { 
		if (!type || type == '')
			this.getNode().removeAttribute('type');
		else
			this.getNode().setAttribute('type',type);
		return this; 
	};
	this.setXMLLang = function(xmllang) {
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

	this._childElVal = function(nodeName) {
		var aNode = this._getChildNode(nodeName);
		if (aNode && aNode.firstChild)
		    return aNode.firstChild.nodeValue;
		return '';
	}

	this._getChildNode = function(nodeName) {
	  var children = this.getNode().childNodes;
	  for (var i=0; i<children.length; i++)
	    if (children.item(i).tagName == nodeName)
	      return children.item(i);
	  return null;
	}

	this._replaceNode = function(aNode) {
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

	this._setChildNode = function(nodeName, nodeValue) {
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

	this.clone = function() { return JSJaCPWrapNode(this.getNode()); }
} 

function JSJaCPresence() {
	this.base = JSJaCPacket;
	this.base('presence');

	this.setStatus = function(status) {
		this._setChildNode("status", status);
		return this; 
	};
	this.setShow = function(show) {
		this._setChildNode("show",show);
		return this; 
	};
	this.setPriority = function(prio) {
		this._setChildNode("priority", prio);
		return this; 
	};
	this.setPresence = function(show,status,prio) {
		if (show)
			this.setShow(show);
		if (status)
			this.setStatus(status);
		if (prio)
			this.setPriority(prio);
		return this; 
	};

	this.getStatus = function() {	return this._childElVal('status');	};
	this.getShow = function() { return this._childElVal('show'); };
	this.getPriority = function() { return this._childElVal('priority'); };
}

function JSJaCIQ() {
	this.base = JSJaCPacket;
	this.base('iq');

	this.setIQ = function(to,from,type,id) {
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
	this.setQuery = function(xmlns) {
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
}

function JSJaCMessage() {
	this.base = JSJaCPacket;
	this.base('message');

	this.setBody = function(body) {
		this._setChildNode("body",body);
		return this; 
	};
	this.setSubject = function(subject) {
		this._setChildNode("subject",subject);
		return this; 
	};
	this.setThread = function(thread) {
		this._setChildNode("thread", thread);
		return this; 
	};
	this.getThread = function() { return this._childElVal('thread'); };
	this.getBody = function() { return this._childElVal('body'); };
	this.getSubject = function() { return this._childElVal('subject') };
}

/* ***
 * (static) JSJaCPWrapNode
 * transforms node to JSJaC internal representation (JSJaCPacket type)
 */
function JSJaCPWrapNode(node) {
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

