function JSJaCPacket(name) {
	this.name = name;

	/* [TODO]
	 * For W3C Dom Level 3 compliant browsers we need to have an
	 * XmlDocument.create that allows creating appropriate top-level
	 * nodes as they may not be altered afterwards 
	 */

	this.doc = XmlDocument.create();

	this.doc.appendChild(this.doc.createElement(name));

	this.pType = function() { return this.name; };

	this.getDoc = function() { return this.doc; };
	this.getNode = function() {	return this.getDoc().firstChild; };

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
	this.setXMLNS = function(xmlns) {
		if (!xmlns || xmlns == '')
			this.getNode().removeAttribute('xmlns');
		else
			this.getNode().setAttribute('xmlns',xmlns); 
		return this; 
	};
	this.setXMLNS('jabber:client');
	this.getTo = function() { return this.getNode().getAttribute('to'); }
	this.getFrom = function() { return this.getNode().getAttribute('from'); }
	this.getID = function() { return this.getNode().getAttribute('id'); }
	this.getType = function() { return this.getNode().getAttribute('type'); }
	this.getXMLLang = function() { return this.getNode().getAttribute('xml:lang'); };
	this.getXMLNS = function() { return this.getNode().getAttribute('xmlns',xmlns); };

	this.xml = function() { 
		return this.getDoc().xml ? this.getDoc().xml : (new XMLSerializer()).serializeToString(this.doc); 
	};

	this._childElVal = function(nodeName) {
		for (var i=0; i<this.getNode().childNodes.length; i++) {
			if (this.getNode().childNodes.item(i).nodeName == nodeName) {
				if (this.getNode().childNodes.item(i).firstChild)
					return this.getNode().childNodes.item(i).firstChild.nodeValue;
				else
					return '';
			}
		}
		return null;
	}

	this._replaceNode = function(aNode) {
		/* hot-fix for safari
		 * don't ask - just shake heads
		 */
		if (this.getDoc().importNode)
			this.getDoc().importNode(aNode,true);
		return this.getDoc().replaceChild(aNode.cloneNode(true),this.getNode()); 
	};

	this.clone = function() { return JSJaCPWrapNode(this.getNode()); }
} 

function JSJaCPresence() {
	this.base = JSJaCPacket;
	this.base('presence');

	//	this.setXMLNS('jabber:client');

	this.setStatus = function(status) {
		this.getNode().appendChild(this.getDoc().createElement('status')).appendChild(this.getDoc().createTextNode(status));
		return this; 
	};
	this.setShow = function(show) {
		this.getNode().appendChild(this.getDoc().createElement('show')).appendChild(this.getDoc().createTextNode(show));
		return this; 
	};
	this.setPriority = function(prio) {
		this.getNode().appendChild(this.getDoc().createElement('priority')).appendChild(this.getDoc().createTextNode(prio));
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
		query = this.getNode().appendChild(this.getDoc().createElement('query'));
		query.setAttribute('xmlns',xmlns);
		return query;
	};

	this.getQuery = function() {
		return this.getNode().getElementsByTagName('query').item(0);
	};
	this.getQueryXMLNS = function() {
		if (this.getQuery())
			return this.getQuery().getAttribute('xmlns');
		else
			return null;
	};
}

function JSJaCMessage() {
	this.base = JSJaCPacket;
	this.base('message');

	//	this.setXMLNS('jabber:client');

	this.setBody = function(body) {
		var aNode = this.getNode().appendChild(this.getDoc().createElement('body'));
		aNode.appendChild(this.getDoc().createTextNode(body));
		return this; 
	};
	this.setSubject = function(subject) {
		var aNode = this.getNode().appendChild(this.getDoc().createElement('subject'));
		aNode.appendChild(this.getDoc().createTextNode(subject));
		return this; 
	};
	
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

