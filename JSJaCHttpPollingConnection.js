JSJaCHPC_NKEYS = 256; // number of keys to generate

function JSJaCHttpPollingConnection(oDbg) {
	this.base = JSJaCConnection;
	this.base(oDbg);

	this.keys = null;

	this.connect = JSJaCHPCConnect;
	this.disconnect = JSJaCHPCDisconnect;
	this._prepareResponse = JSJaCHPCPrepareResponse;
	this._getRequestString = JSJaCHPCGetRequestString;
	this._setupRequest = JSJaCHPCSetupRequest;
	this._getStreamID = JSJaCHPCGetStream;
}

function JSJaCHPCKeys(oDbg) {
	var seed = Math.random();

	this.k = new Array();
	this.k[0] = seed.toString();
	this.oDbg = oDbg;

	for (var i=1; i<JSJaCHPC_NKEYS; i++) {
		this.k[i] = b64_sha1(this.k[i-1]);
		oDbg.log(i+": "+this.k[i],4);
	}

	this.indexAt = JSJaCHPC_NKEYS-1;
	this.getKey = function() { 
		return this.k[this.indexAt--]; 
	};
	this.lastKey = function() { return (this.indexAt == 0); };
}

function JSJaCHPCSetupRequest(async) {
 	var req = XmlHttp.create();

	req.open("POST",this.http_base,async);

	req.setRequestHeader('Content-Type','application/x-www-form-urlencoded');

	return req;
}

function JSJaCHPCGetRequestString(xml) {
	var reqstr = this.sid+';'+this.keys.getKey();
	if (this.keys.lastKey()) {
		this.keys = new JSJaCHPCKeys(this.oDbg);
		reqstr += ';'+this.keys.getKey();
	}
	reqstr += ',';
	if (xml)
		reqstr += xml;
	return reqstr;
}

function JSJaCHPCPrepareResponse(req) {
	if (!this.connected())
		return null;

	/* handle error */
	// proxy error (!)
	if (req.status != 200) {
		this.oDbg.log("invalid response:\n" + req.responseText,1);
		clearTimeout(this.timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		this.handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return null;
	} 

	this.oDbg.log(req.getAllResponseHeaders(),4);
	var aPList = req.getResponseHeader('Set-Cookie');
	aPList = aPList.split(";");
	for (var i=0;i<aPList.length;i++) {
		aArg = aPList[i].split("=");
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
		clearTimeout(this.timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		this.handleEvent('onerror',JSJaCError('500','wait','internal-server-error'));
		return null;
	}

	var response = XmlDocument.create();
	response.loadXML("<body>"+req.responseText+"</body>");
	return response;
}

function JSJaCHPCConnect(http_base,server,username,resource,pass,timerval,register) {
	// initial request to get sid and streamid

	this.http_base = http_base || '/';
	this.server = server || 'localhost';
	this.username = username;
	this.resource = resource;
	this.pass = pass;
	this.timerval = timerval;
	this.register = register;

	this.oDbg.log("http_base: " + this.http_base + "\nserver:" + server,2);

	this.keys = new JSJaCHPCKeys(this.oDbg); // generate first set of keys
	key = this.keys.getKey();

	this.req = this._setupRequest(false);

	this.oDbg.log("0;"+key+",<stream:stream to='"+this.server+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>",4);
	this.req.send("0;"+key+",<stream:stream to='"+this.server+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>");

	// extract session ID
	this.oDbg.log(this.req.getAllResponseHeaders(),4);
	var aPList = this.req.getResponseHeader('Set-Cookie');
	aPList = aPList.split(";");
	for (var i=0;i<aPList.length;i++) {
		aArg = aPList[i].split("=");
		if (aArg[0] == 'ID')
			this.sid = aArg[1];
	}
	this.oDbg.log("got sid: "+this.sid,2);

	/* wait for initial stream response to extract streamid needed
	 * for digest auth
	 */
	this._getStreamID();
}

function JSJaCHPCGetStream() {

	if ((!this.req.responseXML || this.req.responseText == '') && !this.keys.lastKey()) {
		oCon = this;
		setTimeout("oCon._sendEmpty()",1000);
		return;
	}
	if (this.keys.lastKey()) {
		this.handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		this.oDbg.log("Couldn't instantiate stream. Giving up...",1);
		return;
	}

	this.oDbg.log(this.req.responseText,4);

	// extract stream id used for non-SASL authentication
	if (this.req.responseText.match(/id=[\'"](.+?)[\'"]/))
			this.streamid = RegExp.$1;
	this.oDbg.log("got streamid: "+this.streamid,2);

	this._connected = true;

	this._process(this.timerval); // start polling

	if (this.register)
		this._doReg();
	else
		this._doAuth();
}

function JSJaCHPCDisconnect() {
	if (!this.connected())
		return;

	if (this.timeout)
		clearTimeout(this.timeout); // remove timer

	this.req = this._setupRequest(false);

	this.req.send(this.sid+";"+this.keys.getKey()+",</stream:stream>");
	this.oDbg.log("Disconnected: "+this.req.responseText,2);
	this._connected = false;
	this.handleEvent('ondisconnect');
}
