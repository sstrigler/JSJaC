JSJaC_HAVEKEYS = true;  // whether to use keys
JSJaC_NKEYS    = 64;    // number of keys to generate

JSJaC_CheckQueueInterval = 100; // msecs to poll send queue
/* ******************************
 * JabberConnection 
 * somewhat abstract base class
 */

function JSJaCConnection(oArg) {
	oCon = this; // remember reference to ourself
	if (oArg.oDbg && oArg.oDbg.log)
		this.oDbg = oArg.oDbg; 
	else {
		this.oDbg = new Object(); // always initialise a debugger
		this.oDbg.log = function() { };
	}

	this._httpbase = oArg.httpbase;

	this._connected = false;
	this._events = new Array();
	this._keys = null;
	this._ID = 0;
	this._pQueue = new Array();
	this._regIDs = new Array();
	this._req = new Array();

	this.connected = function() { return this._connected; };
	this.getPollInterval = function() { return this._timerval; };
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
	this.registerHandler = function(event,handler) {
		event = event.toLowerCase(); // don't be case-sensitive here
		if (!this._events[event])
			this._events[event] = new Array(handler);
		else
			this._events[event] = this._events[event].concat(handler);
		this.oDbg.log("registered handler for event '"+event+"'",2);
	};
	this.send = JSJaCSend;
	this.setPollInterval = function(timerval) {
		if (!timerval || isNaN(timerval)) {
			this.oDbg.log("Invalid timerval: " + timerval,1);
			return -1;
		}
		this._timerval = timerval;
		return this._timerval;
	};
	this.setPollInterval(oArg.timerval);

	this._checkQueue = JSJaCHBCCheckQueue;

	this._doReg = JSJaCReg;
	this._doAuth = JSJaCAuth;
	this._doAuth2 = JSJaCAuth2;
	this._doAuth3 = JSJaCAuth3;

	this._doSASLAuth = JSJaCSASLAuth;
// 	this._doSASLAuthBind = JSJaCSASLAuthBind;
// 	this._doSASLAuthSess = JSJaCSASLAuthSess;
// 	this._doSASLAuthDone = JSJaCSASLAuthDone;

	this._doSASLAnonAuth = JSJaCSASLAnonAuth;
	this._doSASLAnonAuthReinitStream = JSJaCSASLAnonAuthReinitStream;
	this._doSASLAnonAuthBind = JSJaCSASLAnonAuthBind;
	this._doSASLAnonAuthSess = JSJaCSASLAnonAuthSess;
	this._doSASLAnonAuthDone = JSJaCSASLAnonAuthDone;
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
	this._handleResponse = JSJaCHandleResponse;
	this._process = JSJaCProcess;
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
	this._sendEmpty = JSJaCSendEmpty;
	this._unregisterPID = function(pID) {
		if (!this._regIDs[pID])
			return false;
		this._regIDs[pID] = null;
		this.oDbg.log("unregistered "+pID,3);
		return true;
	};
}

function JSJaCReg() {
	/* ***
	 * In-Band Registration see JEP-0077
	 */

	var iq = new JSJaCIQ();
	iq.setType('set');
	iq.setID('reg1');
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
	query.appendChild(iq.getDoc().createElement('username')).appendChild(iq.getDoc().createTextNode(oCon.username));

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
	if (iq.getType() != 'result') { // auth' failed
		oCon.disconnect();
		if (iq.getType() == 'error')
			oCon.handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
	} else
		oCon.handleEvent('onconnect');
}

/* ***
 * SASL
 */
function JSJaCSASLAuth(doc) {
	if (!doc || typeof(doc) == 'undefined') {
		this.oDbg.log("nothing to parse ... aborting",1);
		return false;
	}
	this.oDbg.log(doc.xml,2);

	// check if SASL Anonymous is supported
	this._mechs = new Array(); // list of supported mechanisms
	var lMec1 = doc.getElementsByTagName("mechanisms");
	for (var i=0; i<lMec1.length; i++)
		if (lMec1.item(i).getAttribute("xmlns") == "urn:ietf:params:xml:ns:xmpp-sasl") {
			this.oDbg.log("SASL support detected",2);
			var lMec2 = lMec1.item(i).getElementsByTagName("mechanism");
			for (var j=0; j<lMec2.length; j++)
				this._mechs.push(lMec2.item(j).firstChild.nodeValue);
			this.oDbg.log("supported sasl mechanisms: "+this._mechs,2);
			break;
		}
	this.oDbg.log("No support for SASL detected ... aborting",1);
	return false;
}

/* ***
 * SASL Anonymous Login
 */
function JSJaCSASLAnonAuth(doc) {
	if (!doc || typeof(doc) == 'undefined') {
		this.oDbg.log("nothing to parse ... aborting",1);
		return false;
	}
	this.oDbg.log(doc.xml,2);

	// check if SASL Anonymous is supported
	var lMec1 = doc.getElementsByTagName("mechanisms");
	for (var i=0; i<lMec1.length; i++)
		if (lMec1.item(i).getAttribute("xmlns") == "urn:ietf:params:xml:ns:xmpp-sasl") {
			this.oDbg.log("SASL support detected",2);
			var lMec2 = lMec1.item(i).getElementsByTagName("mechanism");
			for (var j=0; j<lMec2.length; j++)
				if (lMec2.item(j).firstChild && 
						lMec2.item(j).firstChild.nodeValue &&
						lMec2.item(j).firstChild.nodeValue.toLowerCase() == 'anonymous') {// got it
					// request anon auth
					var slot = this._getFreeSlot();
					this._req[slot] = this._setupRequest(true);

					this._req[slot].onreadystatechange = function() {
						if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
							return;
						if (oCon._req[slot].readyState == 4) {
							oCon.oDbg.log("async recv: "+oCon._req[slot].responseText,4);
							oCon._doSASLAnonAuthReinitStream(oCon._req[slot]);							
						}
					};
					
					if (typeof(this._req[slot].onerror) != 'undefined') {
						this._req[slot].onerror = function(e) {
							if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
								return;
							oCon.oDbg.log('XmlHttpRequest error',1);
							return false;
						};
					}

					var reqstr = this._getRequestString("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='ANONYMOUS'/>");
					this.oDbg.log("sending: " + reqstr,4);
					this._req[slot].send(reqstr);
					return true; // stop here
				}
			break;
		}
	this.oDbg.log("No support for SASL Anonymous detected ... aborting",1);
	return false;
}

function JSJaCSASLAnonAuthReinitStream(req) {
	this.oDbg.log(req.responseText,2);
	var doc = this._prepareResponse(req);
	if (doc.getElementsByTagName("success").length == 0) {
		this.oDgb.log("auth failed",1);
		con.disconnect();
		return;
	}
	
	var slot = this._getFreeSlot();
	this._req[slot] = this._setupRequest(true);

	this._req[slot].onreadystatechange = function() {
		if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
			return;
		if (oCon._req[slot].readyState == 4) {
			oCon.oDbg.log("async recv: "+oCon._req[slot].responseText,4);
			oCon._doSASLAnonAuthBind(oCon._req[slot]);							
		}
	};
					
	if (typeof(this._req[slot].onerror) != 'undefined') {
		this._req[slot].onerror = function(e) {
			if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
				return;
			oCon.oDbg.log('XmlHttpRequest error',1);
			oCon.disconnect();
			return false;
		};
	}

	var reqstr = this._getRequestString("<stream:stream xmlns:stream='http://etherx.jabber.org/streams' xmlns='jabber:client' to='"+this.domain+"' version='1.0'>");

	this.oDbg.log("sending: " + reqstr,2);
	this._req[slot].send(reqstr);
	return true;
}

function JSJaCSASLAnonAuthBind(req) {
	this.oDbg.log(req.responseText,2);

	iq = new JSJaCIQ();
	iq.setIQ(this.domain,null,'set','bind_1');
	var eBind = iq.getDoc().createElement("bind");
	eBind.setAttribute("xmlns","urn:ietf:params:xml:ns:xmpp-bind")
	iq.getNode().appendChild(eBind);
	this.oDbg.log(iq.xml());
	this.send(iq,oCon._doSASLAnonAuthSess);
}

function JSJaCSASLAnonAuthSess(iq) {
	if (iq.getType() != 'result' || iq.getType() == 'error') { // auth' failed
		oCon.disconnect();
		if (iq.getType() == 'error')
			oCon.handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
		return;
	}

	oCon.jid = iq.getDoc().firstChild.getElementsByTagName('jid').item(0).firstChild.nodeValue;

	iq = new JSJaCIQ();
	iq.setIQ(this.domain,null,'set','sess_1');
	var eSess = iq.getDoc().createElement("session");
	eSess.setAttribute("xmlns","urn:ietf:params:xml:ns:xmpp-session");
	iq.getNode().appendChild(eSess);
	oCon.oDbg.log(iq.xml());
	oCon.send(iq,oCon._doSASLAnonAuthDone);
}

function JSJaCSASLAnonAuthDone(iq) {
	if (iq.getType() != 'result' || iq.getType() == 'error') { // auth' failed
		oCon.disconnect();
		if (iq.getType() == 'error')
			oCon.handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
		return;
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
		try {
			this._pQueue = this._pQueue.concat(aJSJaCPacket.xml());
		} catch (e) {
			this.oDbg.log(e.toString(),1);
		}
	}

	return;
}

function JSJaCProcess(timerval) {
	if (!this.connected()) {
		this.oDbg.log("Connection lost ...",1);
		if (this._interval)
			clearInterval(this._interval);
		return;
	}

	if (timerval)
		this.setPollInterval(timerval);

	if (this._timeout)
		clearTimeout(this._timeout);

	var slot = this._getFreeSlot();
	
	if (slot < 0)
		return;

	if (typeof(this._req[slot]) != 'undefined' && this._req[slot].readyState != 4) {
		this.oDbg.log("Slot "+slot+" is not ready");
		return;
	}
		
	if (!this.isPolling() && this._pQueue.length == 0 && this._req[(slot+1)%2] && this._req[(slot+1)%2].readyState != 4) {
		return;
	}

	if (!this.isPolling())
		this.oDbg.log("Found working slot at "+slot,2);

	this._req[slot] = this._setupRequest(true);

	/* setup onload handler for async send */
	this._req[slot].onreadystatechange = function() {
		if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
			return;
		if (oCon._req[slot].readyState == 4) {
			oCon.oDbg.log("async recv: "+oCon._req[slot].responseText,4);
			oCon._handleResponse(oCon._req[slot]);
 			if (oCon._pQueue.length)
 				oCon._process();
			else
				oCon._timeout = setTimeout("oCon._process()",oCon.getPollInterval()); // schedule next tick

		}
	};

	if (typeof(this._req[slot].onerror) != 'undefined') {
		this._req[slot].onerror = function(e) {
			if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
				return;
			oCon.oDbg.log('XmlHttpRequest error',1);
			if (oCon._pQueue.length)
				oCon._process();
			else
				oCon._timeout = setTimeout("oCon._process()",oCon.getPollInterval()); // schedule next tick
			return false;
		};
	}

	var xml = '';
	while (this._pQueue.length) {
		var curNode = this._pQueue[0];
		xml += curNode;
		this._pQueue = this._pQueue.slice(1,this._pQueue.length);
	}
	var reqstr = this._getRequestString(xml);
	this.oDbg.log("sending: " + reqstr,4);
	this._req[slot].send(reqstr);
}

function JSJaCHBCCheckQueue() {
	if (this._pQueue.length != 0)
		this._process();
	return true;
}

/* ***
 * send empty request 
 * waiting for stream id to be able to proceed with authentication 
 */
function JSJaCSendEmpty() {
	var slot = this._getFreeSlot();
	this._req[slot] = this._setupRequest(true);

	oCon = this;
	this._req[slot].onreadystatechange = function() {
		if (typeof(oCon) == 'undefined' || !oCon)
			return;
		if (oCon._req[slot].readyState == 4) {
			oCon.oDbg.log("async recv: "+oCon._req[slot].responseText,4);
			oCon._getStreamID(slot); // handle response
		}
	}

	if (typeof(this._req[slot].onerror) != 'undefined') {
		this._req[slot].onerror = function(e) {
			if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
				return;
			oCon.oDbg.log('XmlHttpRequest error',1);
			return false;
		};
	}

	var reqstr = this._getRequestString();
	this.oDbg.log("sending: " + reqstr,4);
	this._req[slot].send(reqstr);
}

function JSJaCHandleResponse(req) {
	var rootEl = this._prepareResponse(req);

	if (!rootEl)
		return null;

	this.oDbg.log("childNodes: "+rootEl.childNodes.length,3);
	for (var i=0; i<rootEl.childNodes.length; i++) {
		this.oDbg.log("rootEl.childNodes.item("+i+").nodeName: "+rootEl.childNodes.item(i).nodeName,3);
		var aJSJaCPacket = JSJaCPWrapNode(rootEl.childNodes.item(i));
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

	this._k = new Array();
	this._k[0] = seed.toString();
	this.oDbg = oDbg;

	for (var i=1; i<JSJaC_NKEYS; i++) {
		this._k[i] = func(this._k[i-1]);
		oDbg.log(i+": "+this._k[i],4);
	}

	this.indexAt = JSJaC_NKEYS-1;
	this.getKey = function() { 
		return this._k[this.indexAt--]; 
	};
	this.lastKey = function() { return (this.indexAt == 0); };
	this.size = function() { return this._k.length; };
}
