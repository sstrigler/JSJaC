var JSJaCHBC_MAX_HOLD = 1;
var JSJACHBC_MAX_WAIT = 300; 

function JSJaCHttpBindingConnection(oArg) {
	this.base = JSJaCConnection;
	this.base(oArg);

	// member vars
	this._hold = JSJaCHBC_MAX_HOLD;
	this._inactivity = 0;
	this._last_requests = new Object(); // 'hash' storing hold+1 last requests
	this._last_rid = 0;                 // I know what you did last summer
	this._min_polling = 0;
	this._wait = JSJACHBC_MAX_WAIT;

	// public methods
	this.connect = JSJaCHBCConnect;
	this.disconnect = JSJaCHBCDisconnect;
	this.inherit = JSJaCHBCInherit;
	this.isPolling = function() { return (this._hold == 0) }; 
	this.setPollInterval = function(timerval) {
		if (!timerval || isNaN(timerval)) {
			this.oDbg.log("Invalid timerval: " + timerval,1);
			return -1;
		}
		if (this._min_polling && timerval < this._min_polling*1000)
			this._timerval = this._min_polling*1000;
		else if (this._inactivity && timerval > this._inactivity*1000)
			this._timerval = this._inactivity*1000;
		else
			this._timerval = timerval;
		return this._timerval;
	};

	// private methods
	this._getRequestString = JSJaCHBCGetRequestString;
	this._getFreeSlot = function() {
		for (var i=0; i<this._hold+1; i++)
			if (typeof(this._req[i]) == 'undefined' || typeof(this._req[i].r) == 'undefined' || this._req[i].r.readyState == 4)
				return i;
		return -1; // nothing found
	}
	this._getHold = function() { return this._hold; }
	this._getStreamID = JSJaCHBCGetStreamID;
	this._getSuspendVars = function() {
	  return ('host,port,secure,_rid,_last_rid,_wait,_min_polling,_inactivity,_hold,_last_requests').split(',');
	}
	this._handleInitialResponse = JSJaCHBCHandleInitialResponse;
	this._prepareResponse = JSJaCHBCPrepareResponse;
	this._resume = function() { 
	  /* make sure to repeat last request as we can be sure that
	   * it had failed 
	   */
	  this._rid--; 
	  this._keys._indexAt++;
	  this._process();
	  this._interval= setInterval("oCon._checkQueue()",JSJaC_CheckQueueInterval);
	  this._inQto = setInterval("oCon._checkInQ();",JSJaC_CheckInQueueInterval);
	}
	this._setHold = function(hold)  {
		if (!hold || isNaN(hold) || hold < 0)
			hold = 0;
		else if (hold > JSJaCHBC_MAX_HOLD)
			hold = JSJaCHBC_MAX_HOLD;
		this._hold = hold;
		return this._hold;
	};
	this._setupRequest = JSJaCHBCSetupRequest;	
}

function JSJaCHBCConnect(oArg) {
	// initial request to get sid and streamid

	this._setStatus('connecting');

	this.domain = oArg.domain || 'localhost';
	this.username = oArg.username;
	this.resource = oArg.resource;
	this.pass = oArg.pass;
	this.register = oArg.register;
	this.oDbg.log("httpbase: " + this._httpbase + "\domain:" + this.domain,2);
	this.host = oArg.host || this.domain;
	this.port = oArg.port || 5222;
	if (oArg.secure) {
		this.secure = 'true';
		if (!oArg.port)
			this.port = 5223;
	} else 
		this.secure = 'false';

	this.jid = this.username + '@' + this.domain;
	this.fulljid = this.jid + '/' + this.resource;

	if (oArg.wait)
		this._wait = oArg.wait;

	if (oArg.xmllang && oArg.xmllang != '')
		this._xmllang = oArg.xmllang;

	this._rid  = Math.round( 100000.5 + ( ( (900000.49999) - (100000.5) ) * Math.random() ) );

	var slot = this._getFreeSlot();
	this._req[slot] = this._setupRequest(true); // must be done
						    // after rid is
						    // created but
						    // before first
						    // use in reqstr

	var reqstr = "<body hold='"+this._hold+"' xmlns='http://jabber.org/protocol/httpbind' to='"+this.domain+"' wait='"+this._wait+"' rid='"+this._rid+"'";
	if (oArg.host || oArg.port)
		reqstr += " route='xmpp:"+this.host+":"+this.port+"'";
	if (oArg.secure)
		reqstr += " secure='"+this.secure+"'";
	if (JSJaC_HAVEKEYS) {
		this._keys = new JSJaCKeys(hex_sha1,this.oDbg); // generate first set of keys
		key = this._keys.getKey();
		reqstr += " newkey='"+key+"'";
	}
	if (this._xmllang)
		reqstr += " xml:lang='"+this._xmllang + "'";
	reqstr += "/>";


	this.oDbg.log(reqstr,4);

	oCon = this;
	this._req[slot].r.onreadystatechange = function() {
		if (typeof(oCon) == 'undefined' || !oCon)
			return;
		if (oCon._req[slot].r.readyState == 4) {
			oCon.oDbg.log("async recv: "+oCon._req[slot].r.responseText,4);
			oCon._handleInitialResponse(slot); // handle response
		}
	}

	if (typeof(this._req[slot].r.onerror) != 'undefined') {
		this._req[slot].r.onerror = function(e) {
			if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
				return;
			oCon.oDbg.log('XmlHttpRequest error',1);
			return false;
		};
	}

	this._req[slot].r.send(reqstr);
}

function JSJaCHBCHandleInitialResponse(slot) {
	try {
		// This will throw an error on Mozilla when the connection was refused
		this.oDbg.log(this._req[slot].r.getAllResponseHeaders(),4);
		this.oDbg.log(this._req[slot].r.responseText,4);
	} catch(ex) {
		this.oDbg.log("No response",4);
	}

	if (this._req[slot].r.status != 200 || !this._req[slot].r.responseXML) {
		this.oDbg.log("initial response broken (status: "+this._req[slot].r.status+")",1);
		this._handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return;
	}
	var body = this._req[slot].r.responseXML.documentElement;

	if (!body || body.tagName != 'body' || body.namespaceURI != 'http://jabber.org/protocol/httpbind') {
		this.oDbg.log("no body element or incorrect body in initial response",1);
		this._handleEvent("onerror",JSJaCError("500","wait","internal-service-error"));
		return;
	}

	// Check for errors from the server
	if (body.getAttribute("type") == "terminate") {
		this.oDbg.log("invalid response:\n" + this._req[slot].r.responseText,1);
		clearTimeout(this._timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this._handleEvent('ondisconnect');
		this._handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return;
	}

	// get session ID
	this._sid = body.getAttribute('sid');
	this.oDbg.log("got sid: "+this._sid,2);

	// get attributes from response body
	if (body.getAttribute('polling'))
		this._min_polling = body.getAttribute('polling');

	if (body.getAttribute('inactivity'))
		this._inactivity = body.getAttribute('inactivity');
	
	if (body.getAttribute('requests'))
		this._setHold(body.getAttribute('requests')-1);
	this.oDbg.log("set hold to " + this._getHold(),2);

	// must be done after response attributes have been collected
	this.setPollInterval(this._timerval);

	/* start sending from queue for not polling connections */
	this._connected = true;

	oCon = this;
	this._interval= setInterval("oCon._checkQueue()",JSJaC_CheckQueueInterval);
	this._inQto = setInterval("oCon._checkInQ();",JSJaC_CheckInQueueInterval);

	/* wait for initial stream response to extract streamid needed
	 * for digest auth
	 */
	this._getStreamID(slot);
}

function JSJaCHBCGetStreamID(slot) {

	this.oDbg.log(this._req[slot].r.responseText,4);

	if (!this._req[slot].r.responseXML || !this._req[slot].r.responseXML.documentElement) {
		this._handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return;
	}
	var body = this._req[slot].r.responseXML.documentElement;

	// extract stream id used for non-SASL authentication
	if (body.getAttribute('authid')) {
		this.streamid = body.getAttribute('authid');
		this.oDbg.log("got streamid: "+this.streamid,2);
	} else {
		oCon = this;
		this._timeout = setTimeout("oCon._sendEmpty()",this.getPollInterval());
		return;
	}
	
	if (this.register)
		this._doReg();
	else
		this._doAuth();

	this._timeout = setTimeout("oCon._process()",this.getPollInterval());
}

/* inherit an instantiated session */
function JSJaCHBCInherit(oArg) {
	this.domain = oArg.domain || 'localhost';
	this.username = oArg.username;
	this.resource = oArg.resource;
	this._sid = oArg.sid;
	this._rid = oArg.rid;
	this._min_polling = oArg.polling;
	this._inactivity = oArg.inactivity;
	this._setHold(oArg.requests-1);
	this.setPollInterval(this._timerval);
	if (oArg.wait)
		this._wait = oArg.wait; // for whatever reason

	this._connected = true;

	this._handleEvent('onconnect');

	oCon = this;

	this._interval= setInterval("oCon._checkQueue()",JSJaC_CheckQueueInterval);
	this._inQto = setInterval("oCon._checkInQ();",JSJaC_CheckInQueueInterval);
	this._timeout = setTimeout("oCon._process()",this.getPollInterval());
}


function JSJaCHBCDisconnect() {
	
	this._setStatus('disconnecting');

	if (!this.connected())
		return;

	clearInterval(this._interval);
	clearInterval(this._inQto);

	if (this._timeout)
		clearTimeout(this._timeout); // remove timer

	var slot = this._getFreeSlot();
	// Intentionally synchronous
	this._req[slot] = this._setupRequest(false);

	var reqstr = "<body type='terminate' xmlns='http://jabber.org/protocol/httpbind' sid='"+this._sid+"' rid='"+this._rid+"'";
	if (JSJaC_HAVEKEYS) {
		reqstr += " key='"+this._keys.getKey()+"'";
	}
	reqstr += ">";

	while (this._pQueue.length) {
		var curNode = this._pQueue[0];
		reqstr += curNode;
		this._pQueue = this._pQueue.slice(1,this._pQueue.length);
	}

	reqstr += "<presence type='unavailable' xmlns='jabber:client'/></body>";

	// Wait for response (for a limited time, 5s)
	var abortTimerID = setTimeout("this._req[slot].abort();", 5000);
	this.oDbg.log("Disconnecting: " + reqstr,4);
	this._req[slot].r.send(reqstr);	
	clearTimeout(abortTimerID);
        eraseCookie('s');

	oCon.oDbg.log("Disconnected: "+oCon._req[slot].r.responseText,2);
	oCon._connected = false;
	oCon._handleEvent('ondisconnect');
}

function JSJaCHBCSetupRequest(async) {
	var req = new Object();
	var r = XmlHttp.create();
	try {
		r.open("POST",this._httpbase,async);
		r.setRequestHeader('Content-Type','text/xml; charset=utf-8');
	} catch(e) { this.oDbg.log(e,1); }
	req.r = r;
	this._rid++;
	req.rid = this._rid;
	return req;
}

function JSJaCHBCGetRequestString() {
 	var xml = '';

	// check if we're repeating a request

	if (this._rid <= this._last_rid && typeof(this._last_requests[this._rid]) != 'undefined') // repeat!
		xml = this._last_requests[this._rid].xml;
	else { // grab from queue
		while (this._pQueue.length) {
			var curNode = this._pQueue[0];
			xml += curNode;
			this._pQueue = this._pQueue.slice(1,this._pQueue.length);
		}
		this._last_requests[this._rid] = new Object();
		this._last_requests[this._rid].xml = xml;
		this._last_rid = this._rid;

		for (var i in this._last_requests)
		  if (i != 'toJSONString' && i < this._rid-this._hold)
		    delete(this._last_requests[i]); // truncate
	}
	var reqstr = "<body rid='"+this._rid+"' sid='"+this._sid+"' xmlns='http://jabber.org/protocol/httpbind' ";
	if (JSJaC_HAVEKEYS) {
		reqstr += "key='"+this._keys.getKey()+"' ";
		if (this._keys.lastKey()) {
			this._keys = new JSJaCKeys(hex_sha1,this.oDbg);
			reqstr += "newkey='"+this._keys.getKey()+"' ";
		}
	}
	if (xml) {
		reqstr += ">" + xml + "</body>";
	} else {
		reqstr += "/>"; 
	}
	 
	return reqstr;
}

function JSJaCHBCPrepareResponse(req) {
	if (!this.connected())
		return null;

	var r = req.r; // the XmlHttpRequest

	if (typeof(r) == 'undefined' || !r || typeof(r.status) == 'undefined')
		return null;

	/* handle error */
	
	if (r.status != 200 || !r.responseXML) {
		this._errcnt++;
		this.oDbg.log("invalid response ("+r.status+"):\n" + r.getAllResponseHeaders()+"\n"+r.responseText,1);
		if (this._errcnt > JSJAC_ERR_COUNT) {
		  // abort
		  oCon._abort();
		  return null;
		}
		this.oDbg.log("repeating ("+this._errcnt+")",1);

		this._setStatus('proto_error_fallback');

		// schedule next tick
		setTimeout("oCon._resume()",oCon.getPollInterval());

		return null;
	} 

	var body = r.responseXML.documentElement;
	if (!body || body.tagName != 'body' || body.namespaceURI != 'http://jabber.org/protocol/httpbind') {
		this.oDbg.log("invalid response:\n" + r.responseText,1);

		this._setStatus('internal_server_error');

		clearTimeout(this._timeout); // remove timer
		clearInterval(this._interval);
		clearInterval(this._inQto);
		this._handleEvent('onerror',JSJaCError('500','wait','internal-server-error'));
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this._handleEvent('ondisconnect');
		return null;

	}

	if (typeof(req.rid) != 'undefined' && this._last_requests[req.rid]) {
		if (this._last_requests[req.rid].handled) {
			this.oDbg.log("already handled "+req.rid,2);
			return null;
		} else 
			this._last_requests[req.rid].handled = true;
	}


	// Check for errors from the server
	if (body.getAttribute("type") == "terminate") {
		this.oDbg.log("invalid response:\n" + r.responseText,1);

		this._setStatus('internal_server_error');

		clearTimeout(this._timeout); // remove timer
		clearInterval(this._interval);
		clearInterval(this._inQto);
		this._handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this._handleEvent('ondisconnect');
		return null;
	}

	// no error
	this._errcnt = 0;
	return r.responseXML.documentElement;
}

