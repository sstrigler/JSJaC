JSJaC_HAVEKEYS = true;  // whether to use keys
JSJaC_NKEYS    = 64;    // number of keys to generate

/* ******************************
 * JabberConnection 
 * somewhat abstract base class
 */

function JSJaCConnection(oDbg) {
	oCon = this;
	if (oDbg && oDbg.log)
		this.oDbg = oDbg; // always initialise a debugger
	else {
		this.oDbg = new Object();
		this.oDbg.log = function() { };
	}

	this._connected = false;
	this._ID = 0;
	this.keys = null;

	this._events = new Array();
	this._regIDs = new Array();
	this._pQueue = new Array();

	this.connected = function() { return this._connected; };
	this.send = JSJaCSend;
	this.syncSend = JSJaCSyncSend;
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
	this._handlePID = function(aJSJaCPacket) {
		if (!aJSJaCPacket.getID())
			return false;
		for (var i in this._regIDs) {
			if (this._regIDs[i] && i == aJSJaCPacket.getID()) {
				var pID = aJSJaCPacket.getID();
				this.oDbg.log("handling "+pID,3);
				this._regIDs[i].cb(aJSJaCPacket,this._regIDs[i].arg);
				this._unregisterPID(pID);
				return true;
			}
		}
		return false;
	};
	this._registerPID = function(pID,cb,arg) {
		if (!pID || !cb)
			return false;
		this._regIDs[pID] = new Object();
		this._regIDs[pID].cb = cb;
		if (arg)
			this._regIDs[pID].arg = arg;
		this.oDbg.log("registered "+pID,3);
		return true;
	};
	this._unregisterPID = function(pID) {
		if (!this._regIDs[pID])
			return false;
		this._regIDs[pID] = null;
		this.oDbg.log("unregistered "+pID,3);
		return true;
	};
	this._process = function(timerval) {
		if (timerval)
			this.setPollInterval(timerval);
		this.send();
	};
	this.setPollInterval = function(timerval) {
		if (!timerval || isNaN(timerval)) {
			this.oDbg.log("Invalid timerval: " + timerval,1);
			return;
		}
		this.timerval = timerval;
	};

	this._handleResponse = JSJaCHandleResponse;
	this._doReg = JSJaCReg;
	this._doAuth = JSJaCAuth;
	this._doAuth2 = JSJaCAuth2;
	this._doAuth3 = JSJaCAuth3;
	this._sendQueue = JSJaCSendQueue;
	this._sendEmpty = JSJaCSendEmpty;
}

function JSJaCReg() {
	/* ***
	 * In-Band Registration see JEP-0077
	 */

	var iq = new JSJaCIQ();
	iq.setType('set','reg1');
	var query = iq.setQuery('jabber:iq:register');
	query.appendChild(iq.getDoc().createElement('username')).appendChild(iq.getDoc().createTextNode(this.username));
	query.appendChild(iq.getDoc().createElement('password')).appendChild(iq.getDoc().createTextNode(this.pass));
		
	this.send(iq,this._doAuth);
}

function JSJaCAuth(iq) {
	/* ***
	 * Non-SASL Authentication as described in JEP-0078
	 */

	if (iq && iq.getType() == 'error') { // we failed to register
		oCon.handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
		return;
	}

	var iq = new JSJaCIQ();
	iq.setIQ(oCon.server,null,'get','auth1');
	var query = iq.setQuery('jabber:iq:auth');

	var aNode = iq.getDoc().createElement('username');
	aNode.appendChild(iq.getDoc().createTextNode(oCon.username));
	query.appendChild(aNode);

	oCon.send(iq,oCon._doAuth2);
}

function JSJaCAuth2(iq) {
	oCon.oDbg.log("got iq: " + iq.xml(),4);
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
	iq.setIQ(oCon.server,null,'set','auth2');
	query = iq.setQuery('jabber:iq:auth');
	query.appendChild(iq.getDoc().createElement('username')).appendChild(iq.getDoc().createTextNode(oCon.username));
	query.appendChild(iq.getDoc().createElement('resource')).appendChild(iq.getDoc().createTextNode(oCon.resource));

	if (use_digest) { // digest login
		query.appendChild(iq.getDoc().createElement('digest')).appendChild(iq.getDoc().createTextNode(hex_sha1(oCon.streamid + oCon.pass)));
	} else { // use plaintext auth
		query.appendChild(iq.getDoc().createElement('password')).appendChild(iq.getDoc().createTextNode(oCon.pass));
	}

	oCon.send(iq,oCon._doAuth3);
}

/* ***
 * check if auth' was successful
 */
function JSJaCAuth3(iq) {
	if (iq.getType() != 'result' || iq.getType() == 'error') { // auth' failed
		oCon.disconnect();
		if (iq.getType() == 'error')
			oCon.handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
	} else
		oCon.handleEvent('onconnect');
}

/* ***
 * send a jsjac packet
 * optional args: cb  - callback to be called when result is received)
 *                arg - additional argument to be passed to callback
 */
function JSJaCSend(aJSJaCPacket,cb,arg) {
	// remember id for response if callback present
	if (aJSJaCPacket && cb) {
		if (!aJSJaCPacket.getID())
			aJSJaCPacket.setID('JSJaCID_'+this._ID++); // generate an ID

		// register callback with id
		this._registerPID(aJSJaCPacket.getID(),cb,arg);
	}

	if (aJSJaCPacket) {
		this.oDbg.log(aJSJaCPacket.xml());
		this._pQueue = this._pQueue.concat(aJSJaCPacket.clone());
	}
	this._sendQueue();
	return;
}

function JSJaCSendQueue() {
	if (!this.connected()) {
		this.oDbg.log("Connection lost ...",1);
		return;
	}

	if (this.timeout)
		clearTimeout(this.timeout);

	if (typeof(this.req) != 'undefined' && this.req.readyState != 4)
		return;

	this.req = this._setupRequest(true);

	/* setup onload handler for async send */
	this.req.onreadystatechange = function() {
		if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
			return;
		if (oCon.req.readyState == 4) {
			oCon.oDbg.log("async recv: "+oCon.req.responseText,4);
			oCon._handleResponse(oCon.req);
 			if (oCon._pQueue.length)
 				oCon._sendQueue();
			else
				oCon.timeout = setTimeout("oCon._process()",oCon.timerval); // schedule next tick

		}
	};

	if (typeof(this.req.onerror) != 'undefined') {
		this.req.onerror = function() {
			if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
				return;
			oCon.oDbg.log('XmlHttpRequest error',1);
			if (oCon._pQueue.length)
				oCon._sendQueue();
			else
				oCon.timeout = setTimeout("oCon._process()",oCon.timerval); // schedule next tick
			return true;
		};
	}

	var xml = '';
	while (this._pQueue.length) {
		var curNode = this._pQueue[0];
		this.oDbg.log(curNode.xml());
		xml += curNode.xml();
		this._pQueue = this._pQueue.slice(1,this._pQueue.length);
	}
	var reqstr = this._getRequestString(xml);
	this.oDbg.log("sending: " + reqstr,4);
	this.req.send(reqstr);

}

function JSJaCSyncSend(aPacket) {
	if (!aPacket)
		return;

	if (!this.connected()) {
		this.oDbg.log("Connection lost ...",1);
		return;
	}

	var xmlhttp = this._setupRequest(false);

	var reqstr = this._getRequestString(aPacket.xml());
	this.oDbg.log("sending: " + reqstr,4);
	xmlhttp.send(reqstr);
	this._handleResponse(xmlhttp);
}

/* ***
 * send empty request 
 * waiting for stream id to be able to proceed with authentication 
 */
function JSJaCSendEmpty() {
	oCon.req = oCon._setupRequest(false);
	var reqstr = oCon._getRequestString();
	oCon.oDbg.log("sending: " + reqstr,4);
	oCon.req.send(reqstr);
	oCon._getStreamID(); // handle response
}

function JSJaCHandleResponse(req) {
	var xmldoc = this._prepareResponse(req);

	if (!xmldoc)
		return null;

	this.oDbg.log("xmldoc.firstChild.childNodes.length: "+xmldoc.firstChild.childNodes.length,3);
	for (var i=0; i<xmldoc.firstChild.childNodes.length; i++) {
		this.oDbg.log("xmldoc.firstChild.childNodes.item("+i+").nodeName: "+xmldoc.firstChild.childNodes.item(i).nodeName,3);
		var aJSJaCPacket = JSJaCPWrapNode(xmldoc.firstChild.childNodes.item(i));
		if (typeof(aJSJaCPacket.pType) == 'undefined') // didn't parse as proper XMPP packet
			continue;
		if (!this._handlePID(aJSJaCPacket))
				this.handleEvent(aJSJaCPacket.pType(),aJSJaCPacket);
	}

	return null;
}

/* ***
 * an error packet for internal use
 */
function JSJaCError(code,type,condition) {
	var xmldoc = XmlDocument.create();
	if (xmldoc.documentElement)
		xmldoc.documentElement.appendChild(xmldoc.createElement('error'));
	else 
		xmldoc.appendChild(xmldoc.createElement('error'));

	xmldoc.firstChild.setAttribute('code',code);
	xmldoc.firstChild.setAttribute('type',type);
	xmldoc.firstChild.appendChild(xmldoc.createElement(condition));
	xmldoc.firstChild.firstChild.setAttribute('xmlns','urn:ietf:params:xml:ns:xmpp-stanzas');
	return xmldoc.firstChild.cloneNode(true);
}

/* ***
 * set of sha1 hash keys for securing sessions
 */											
function JSJaCKeys(func,oDbg) {
	var seed = Math.random();

	this.k = new Array();
	this.k[0] = seed.toString();
	this.oDbg = oDbg;

	for (var i=1; i<JSJaC_NKEYS; i++) {
		this.k[i] = func(this.k[i-1]);
		oDbg.log(i+": "+this.k[i],4);
	}

	this.indexAt = JSJaC_NKEYS-1;
	this.getKey = function() { 
		return this.k[this.indexAt--]; 
	};
	this.lastKey = function() { return (this.indexAt == 0); };
	this.size = function() { return this.k.length; };
}
