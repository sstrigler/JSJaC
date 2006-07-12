function JSJaCHttpPollingConnection(oArg) {
	this.base = JSJaCConnection;
	this.base(oArg);

	// give hint to JSJaCPacket that we're using HTTP Polling ...
	JSJACPACKET_USE_XMLNS = false;

	this.connect = JSJaCHPCConnect;
	this.disconnect = JSJaCHPCDisconnect;
	this.isPolling = function() { return true; };

	this._getFreeSlot = function() {
		if (typeof(this._req[0]) == 'undefined' || typeof(this._req[0].r) == 'undefined' || this._req[0].r.readyState == 4)
			return 0; 
		else
			return -1;
	}
	this._getRequestString = JSJaCHPCGetRequestString;
	this._getStreamID = JSJaCHPCGetStream;
	this._getSuspendVars = function() {
	  return new Array();
	}
	this._prepareResponse = JSJaCHPCPrepareResponse;
	this._resume = function() { 
	  this._process(this._timerval);
	  this._interval= setInterval("oCon._checkQueue()",JSJaC_CheckQueueInterval);
	  this._inQto = setInterval("oCon._checkInQ();",JSJaC_CheckInQueueInterval);
	}
	this._setupRequest = JSJaCHPCSetupRequest;
}

function JSJaCHPCSetupRequest(async) {
 	var r = XmlHttp.create();
	try {
		r.open("POST",this._httpbase,async);
		r.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
	} catch(e) { this.oDbg.log(e,1); }

	var req = new Object();
	req.r = r;
	return req;
}

function JSJaCHPCGetRequestString() {
	var reqstr = this._sid;
	if (JSJaC_HAVEKEYS) {
		reqstr += ";"+this._keys.getKey();
		if (this._keys.lastKey()) {
			this._keys = new JSJaCKeys(b64_sha1,this.oDbg);
			reqstr += ';'+this._keys.getKey();
		}
	}
	reqstr += ',';
	while (this._pQueue.length) {
	  reqstr += this._pQueue[0];
	  this._pQueue = this._pQueue.slice(1,this._pQueue.length);
	}
	return reqstr;
}

function JSJaCHPCPrepareResponse(r) {
	var req = r.r;
	if (!this.connected())
		return null;

	/* handle error */
	// proxy error (!)
	if (req.status != 200) {
		this.oDbg.log("invalid response ("+req.status+"):" + req.responseText+"\n"+req.getAllResponseHeaders(),1);
		clearTimeout(this._timeout); // remove timer
		clearInterval(this._interval);
		clearInterval(this._inQto);
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this._handleEvent('ondisconnect');
		this._handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return null;
	} 

	this.oDbg.log(req.getAllResponseHeaders(),4);
	var aPList = req.getResponseHeader('Set-Cookie');
	aPList = aPList.split(";");
	var sid;
	for (var i=0;i<aPList.length;i++) {
		var aArg = aPList[i].split("=");
		if (aArg[0] == 'ID')
			sid = aArg[1];
	}

	// http polling component error
	if (typeof(sid) != 'undefined' && sid.indexOf(':0') != -1) {
		switch (sid.substring(0,sid.indexOf(':0'))) {
		case '0':
			this.oDbg.log("invalid response:" + req.responseText,1);
			break;
		case '-1':
			this.oDbg.log("Internal Server Error",1);
			break;
		case '-2':
			this.oDbg.log("Bad Request",1);
			break;
		case '-3':
			this.oDbg.log("Key Sequence Error",1);
			break;
		}
		clearTimeout(this._timeout); // remove timer
		clearInterval(this._interval);
		clearInterval(this._inQto);
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this._handleEvent('ondisconnect');
		this._handleEvent('onerror',JSJaCError('500','wait','internal-server-error'));
		return null;
	}

	if (!req.responseText || req.responseText == '')
		return null;

	var response = XmlDocument.create("body","foobar");

	if (typeof(response.loadXML) != 'undefined') {
		response.loadXML("<body>"+req.responseText+"</body>");
		return response.documentElement;
	} else if (window.DOMParser)
		return (new DOMParser()).parseFromString("<body>"+req.responseText+"</body>", "text/xml").documentElement;
	else return null;;
}

function JSJaCHPCConnect(oArg) {
	// initial request to get sid and streamid

	this.domain = oArg.domain || 'localhost';
	this.username = oArg.username;
	this.resource = oArg.resource || 'jsjac';
	this.pass = oArg.pass;
	this.register = oArg.register;
	this.authtype = oArg.authtype || 'nonsasl';

	this.jid = this.username + '@' + this.domain;
	this.fulljid = this.jid + this.resource;

	this.anonhost = oArg.anonhost;
	if (this.anonhost)
		this.authtype = 'saslanon';

	var reqstr = "0";
	if (JSJaC_HAVEKEYS) {
		this._keys = new JSJaCKeys(b64_sha1,this.oDbg); // generate first set of keys
		key = this._keys.getKey();
		reqstr += ";"+key;
	}
	var streamto = this.domain;
	if (this.anonhost)
		streamto = this.anonhost;
	reqstr += ",<stream:stream to='"+streamto+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'";
	if (this.authtype != 'nonsasl')
		reqstr += " version='1.0'";
	reqstr += ">";
	this.oDbg.log(reqstr,4);

	this._req[0] = this._setupRequest(false);	
	this._req[0].r.send(reqstr);

	// extract session ID
	this.oDbg.log(this._req[0].r.getAllResponseHeaders(),4);
	var aPList = this._req[0].r.getResponseHeader('Set-Cookie');
	aPList = aPList.split(";");
	for (var i=0;i<aPList.length;i++) {
		aArg = aPList[i].split("=");
		if (aArg[0] == 'ID')
			this._sid = aArg[1];
	}
	this.oDbg.log("got sid: "+this._sid,2);

	oCon = this;
	this._interval= setInterval("oCon._checkQueue()",JSJaC_CheckQueueInterval);
	this._inQto = setInterval("oCon._checkInQ();",JSJaC_CheckInQueueInterval);

	/* wait for initial stream response to extract streamid needed
	 * for digest auth
	 */
	this._getStreamID();
}

function JSJaCHPCGetStream() {

	if (!this._req[0].r.responseXML || this._req[0].r.responseText == '') {
		oCon = this;
		this._timeout = setTimeout("oCon._sendEmpty()",1000);
		return;
	}

	this.oDbg.log(this._req[0].r.responseText,4);

	if (this.authtype == 'saslanon') {
		try {
			var doc = XmlDocument.create();
			doc.loadXML(this._req[0].r.responseText+'</stream:stream>');
				
			if (!this._doSASLAnonAuth(doc))
				return;
		} catch(e) {
			this.oDbg.log("loadXML: "+e.toString(),1);
		}
	} else if (this.authtype == 'sasl') {
		try {
			var doc = XmlDocument.create();
			doc.loadXML(this._req[0].r.responseText+'</stream:stream>');
				
			if (!this._doSASLAuth(doc))
				return;
		} catch(e) {
			this.oDbg.log("loadXML: "+e.toString(),1);
		}
	} else {

		// extract stream id used for non-SASL authentication
		if (this._req[0].r.responseText.match(/id=[\'\"]([^\'\"]+)[\'\"]/))
			this.streamid = RegExp.$1;
		this.oDbg.log("got streamid: "+this.streamid,2);
		
		if (this.register)
			this._doReg();
		else
			this._doAuth();
	}

	this._connected = true;
	this._process(this._timerval); // start polling
}

function JSJaCHPCDisconnect() {
	if (!this.connected())
		return;

	this._checkQueue();

	clearInterval(this._interval);
	clearInterval(this._inQto);

	if (this._timeout)
		clearTimeout(this._timeout); // remove timer

	this._req[0] = this._setupRequest(false);
	
	if (JSJaC_HAVEKEYS)
		this._req[0].r.send(this._sid+";"+this._keys.getKey()+",</stream:stream>");
	else
		this._req[0].r.send(this._sid+",</stream:stream>");
	this.oDbg.log("Disconnected: "+this._req[0].r.responseText,2);
	this._connected = false;
	this._handleEvent('ondisconnect');
}
