function JSJaCPacket(name) {

	this.doc = XmlDocument.create();

	this.doc.appendChild(this.doc.createElement(name));

	this.pType = function() { return name };

	this.getDoc = function() { return this.doc; };
	this.getNode = function() { return this.doc.firstChild; };

	this.setTo = function(to) { this.getNode().setAttribute('to',to); };
	this.setFrom = function(from) { this.getNode().setAttribute('from',from); };
	this.setID = function(id) { this.getNode().setAttribute('id',id); };
	this.setType = function(type) { this.getNode().setAttribute('type',type); };
	this.setXMLLang = function(xmllang) { this.getNode().setAttribute('xml:lang',xmllang); };
	this.setXMLNS = function(xmlns) { this.getNode().setAttribute('xmlns',xmlns); };

	this.getTo = function() { return this.getNode().getAttribute('to'); }
	this.getFrom = function() { return this.getNode().getAttribute('from'); }
	this.getID = function() { return this.getNode().getAttribute('id'); }
	this.getType = function() { return this.getNode().getAttribute('type'); }
	this.getXMLLang = function() { return this.getNode().getAttribute('xml:lang'); };
	this.getXMLNS = function() { return this.getNode().getAttribute('xmlns',xmlns); };

	this._replaceNode = function(aNode) { return this.doc.replaceChild(aNode,this.doc.firstChild); };
} 

function JSJaCPresence() {
	this.base = JSJaCPacket;
	this.base('presence');

	this.setXMLNS('jabber:client');

	this.setStatus = function(status) {
		this.getNode().appendChild(this.getDoc().createElement('status')).appendChild(this.getDoc().createTextNode(status));
	};
	this.setShow = function(show) {
		this.getNode().appendChild(this.getDoc().createElement('show')).appendChild(this.getDoc().createTextNode(show));
	};
	this.setPriority = function(prio) {
		this.getNode().appendChild(this.getDoc().createElement('priority')).appendChild(this.getDoc().createTextNode(prio));
	};
	this.setPresence = function(show,status,prio) {
		if (show)
			this.setShow(show);
		if (status)
			this.setStatus(status);
		if (prio)
			this.setPriority(prio);
	};

	this.getStatus = function() {	return this._childElVal('status');	};
	this.getShow = function() { return this._childElVal('show'); };
	this.getPriority = function() { return this._childElVal('priority'); };

	this._childElVal = function(nodeName) {
		if (this.getNode().getElementsByTagName(nodeName).length) {
			return this.getNode().getElementsByTagName(nodeName).item(0).firstChild.nodeValue; 
		}	else
			return null;
	}

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
	};
	this.setQuery = function(xmlns) {
		query = this.getNode().appendChild(this.getDoc().createElement('query'));
		query.setAttribute('xmlns',xmlns);
		return query;
	};
}

function JSJaCMessage() {
	this.base = JSJaCPacket;
	this.base('message');

	this.setBody = function(body) {
		var aNode = this.getNode().appendChild(this.getDoc().createElement('body'));
		aNode.appendChild(this.getDoc().createTextNode(body));
	};
	this.setSubject = function(subject) {
		var aNode = this.getNode().appendChild(this.getDoc().createElement('subject'));
		aNode.appendChild(this.getDoc().createTextNode(subject));
	};
	
	this.getBody = function() { return this.getNode().getElementsByTagName('body').item(0).firstChild.nodeValue; };
	this.getSubject = function() { return this.getNode().getElementsByTagName('subject').item(0).firstChild.nodeValue; };
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

