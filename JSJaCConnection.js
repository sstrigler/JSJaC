
/* ******************************
 * JabberConnection 
 * somewhat abstract base class
 */

function JSJaCConnection(oDbg) {
	if (oDbg && oDbg.log)
		this.oDbg = oDbg; // always initialise a debugger
	else {
		this.oDbg = new Object();
		this.oDbg.log = function() { };
	}

	this._connected = false;
	this._iqID = 0;
	this._events = new Object();

	this.connected = function() { return this._connected; };
	this.send = JSJaCSend;
	this.registerHandler = function(event,handler) {
		event = event.toLowerCase(); // don't be case-sensitive here
		if (!this._events[event])
			this._events[event] = new Array(handler);
		else
			this._events[event] = this._events[event].concat(handler);
		this.oDbg.log("registered handler for event '"+event+"'",2);
	};
	this.handleEvent = function(event,arg) {
		event = event.toLowerCase(); // don't be case-sensitive here
		this.oDbg.log("incoming event '"+event+"'",3);
		if (!this._events[event])
			return;
		this.oDbg.log("handling event '"+event+"'",2);
		for (var i in this._events[event]) {
			if (this._events[event][i]) {
				if (arg)
					this._events[event][i](arg);
				else
					this._events[event][i]();
			}
		}
	};
	oCon = this;
	this.process = function(timerval) {
		this.timeout = setInterval("oCon.send()",timerval);
	};
	this.setPollInterval = function(timerval) {
		if (this.timeout)
			clearTimeout(this.timeout);
		this.timeout = setInterval("oCon.send()",timerval);
	};

	this._handleResponse = JSJaCHandleResponse;
	this._doAuth = JSJaCAuth;
}

function JSJaCAuth() {

	/* ***
	 * check for available authentication methods
	 * according to JEP-0078 digest and plaintext are supported
	 */
	var iq = new JSJaCIQ();
	iq.setIQ(this.server,null,'get','auth1');
	var query = iq.setQuery('jabber:iq:auth');

	var aNode = iq.getDoc().createElement('username');
	aNode.appendChild(iq.getDoc().createTextNode(this.username));
	query.appendChild(aNode);

	iq = this.send(iq,false);

	var use_digest = false;
	for (var aChild=iq.getNode().firstChild.firstChild; aChild!=null; aChild=aChild.nextSibling) {
		if (aChild.nodeName == 'digest') {
			use_digest = true;
			break;
		}
	}

	/* ***
	 * Send authentication
	 */
	iq = new JSJaCIQ();
	iq.setIQ(this.server,null,'set','auth2');
	query = iq.setQuery('jabber:iq:auth');
	query.appendChild(iq.getDoc().createElement('username')).appendChild(iq.getDoc().createTextNode(this.username));
	query.appendChild(iq.getDoc().createElement('resource')).appendChild(iq.getDoc().createTextNode(this.resource));

	if (use_digest) { // digest login
		query.appendChild(iq.getDoc().createElement('digest')).appendChild(iq.getDoc().createTextNode(hex_sha1(this.streamid + this.pass)));
	} else { // use plaintext auth
		query.appendChild(iq.getDoc().createElement('password')).appendChild(iq.getDoc().createTextNode(this.pass));
	}

	iq = this.send(iq,false);
	if (iq.getType() != 'result' || iq.getType() == 'error') { // auth' failed
		this.disconnect();
		// [TODO] handle error
	}
}

function JSJaCSend(aJSJaCPacket) {
	if (!this.connected()) {
		this.oDbg.log("Connection lost ...",1);
		// [TODO] should raise an error here
		return null;
	}

	var async = false;
	if (aJSJaCPacket && aJSJaCPacket.pType() != 'iq') // 'message' or 'presence'
		async = true;

	if (async && typeof(this.req) != 'undefined' && this.req.readyState != 4) {
		this.oDbg.log("httpreq in readyState " + this.req.readyState+"<br>adding packet to send queue",3);
		this.sendQueue = this.sendQueue.concat(aJSJaCPacket);
		return null;
	}

	// remember id for response
	var pID;
	if (!async && aJSJaCPacket) {
		pID = aJSJaCPacket.getID();

		if(!pID) { // not ID yet, assign one
			pID = 'JSJaCIQ_'+this._iqID++;
			aJSJaCPacket.setID(pID);
		}
	}

	this.req = this._setupRequest(async);

	/* setup onload handler for async send */
	if (async) {
		oCon = this; // guess this is the worst thing to do ...
		this.req.onreadystatechange = function() {
			if (typeof(oCon) == 'undefined')
				return;
			if (oCon.req.readyState == 4) {
				oCon.oDbg.log("async recv: "+oCon.req.responseText,4);
				if (oCon.req.responseXML) {
				  oCon._handleResponse();
				}
				if (oCon.sendQueue.length) {
					var aPacket = oCon.sendQueue[0];
					oCon.oDbg.log("sending from queue: "+aPacket.getDoc().xml,2);
					oCon.sendQueue = oCon.sendQueue.slice(1,oCon.sendQueue.length);
					oCon.send(aPacket);
				}
			}
		};
	}

	var reqstr = this._getRequestString(aJSJaCPacket);
	this.oDbg.log("sending: " + reqstr,4);
	this.req.send(reqstr);

	if (async)
		return null;

	this.oDbg.log("received: "+this.req.responseText,4);

	return this._handleResponse(pID);
}

function JSJaCHandleResponse(pID) {
	var xmldoc = this._prepareResponse();
	var rPacket;
	this.oDbg.log("xmldoc.firstChild.childNodes.length: "+xmldoc.firstChild.childNodes.length,3);
	for (var i=0; i<xmldoc.firstChild.childNodes.length; i++) {
		this.oDbg.log("xmldoc.firstChild.childNodes.item("+i+").nodeName: "+xmldoc.firstChild.childNodes.item(i).nodeName,3);
		if (pID && xmldoc.firstChild.childNodes.item(i).getAttribute('id') == pID)
			rPacket = JSJaCPWrapNode(xmldoc.firstChild.childNodes.item(i));
		else
			this.handleEvent(xmldoc.firstChild.childNodes.item(i).nodeName,JSJaCPWrapNode(xmldoc.firstChild.childNodes.item(i)));
	}
	if (this.sendQueue.length) {
		var aPacket = this.sendQueue[0];
		this.oDbg.log("sending from queue: "+aPacket.getDoc().xml,2);
		this.sendQueue = this.sendQueue.slice(1,this.sendQueue.length);
		this.send(aPacket);
	}

	return rPacket;
}
