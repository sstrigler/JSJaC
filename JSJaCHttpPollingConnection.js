JSJaCHPC_NKEYS = 10; // number of keys to generate

function JSJaCHttpPollingConnection(oDbg) {
	this.base = JSJaCConnection;
	this.base(oDbg);

	this.keys = null;
	this.sendQueue = new Array();

	this.connect = JSJaCHPCConnect;
	this.disconnect = JSJaCHPCDisconnect;
	this._prepareResponse = JSJaCHPCPrepareResponse;
	this._getRequestString = JSJaCHPCGetRequestString;
	this._setupRequest = JSJaCHPCSetupRequest;
}

function JSJaCHPCKeys(oDbg) {
	var seed = Math.random();

	this.k = new Array();
	this.k[0] = this.username+seed;
	this.oDbg = oDbg;

	for (var i=1; i<JSJaCHPC_NKEYS; i++) {
		this.k[i] = b64_sha1(this.k[i-1]);
		if (this.oDbg)
			oDbg.log(i+": "+this.k[i],4);
	}

	this.indexAt = JSJaCHPC_NKEYS-1;
	this.getKey = function() { return this.k[this.indexAt--]; };
	this.lastKey = function() { return (this.indexAt == 0); };
}

function JSJaCHPCSetupRequest(async) {
 	var req = XmlHttp.create();

	req.open("POST",this.http_base,async);

	req.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
	return req;
}

function JSJaCHPCGetRequestString(aJSJaCPacket) {
	var reqstr = this.sid+';'+this.keys.getKey();
	if (this.keys.lastKey()) {
		this.keys = new JSJaCHPCKeys(this.oDbg);
		reqstr += ';'+this.keys.getKey();
	}
	reqstr += ',';
	if (aJSJaCPacket)
		reqstr += aJSJaCPacket.getDoc().xml;
	return reqstr;
}

function JSJaCHPCPrepareResponse() {
	// handle error
	if (!this.req.responseXML && this.req.responseText != '') {
		this.oDbg.log("invalid response (can't parse):" + this.req.responseText,1);
		clearTimeout(this.timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		return null;
	}

	var response = XmlDocument.create();

	response.loadXML("<body>"+this.req.responseText+"</body>");
	return response;
}

function JSJaCHPCConnect(http_base,server,username,resource,pass) {
	// initial request to get sid and streamid

	this.http_base = http_base || '/';
	this.server = server || 'localhost';
	this.username = username;
	this.resource = resource;
	this.pass = pass;

	this.keys = new JSJaCHPCKeys(this.oDbg); // generate first set of keys
	key = this.keys.getKey();

	this.req = XmlHttp.create();

	this.req.open("POST",this.http_base,false);
	this.req.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
	this.oDbg.log("0;"+key+",<stream:stream to='"+this.server+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>",4);
	this.req.send("0;"+key+",<stream:stream to='"+this.server+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>");

	this.oDbg.log(this.req.responseText,4);

	// extract session ID
	var aPList = this.req.getResponseHeader('Set-Cookie');
	aPList = aPList.split(";");
	for (var i=0;i<aPList.length;i++) {
		aArg = aPList[i].split("=");
		if (aArg[0] == 'ID')
			this.sid = aArg[1];
	}
	this.oDbg.log("got sid: "+this.sid,2);
	// extract stream id used for non-SASL authentication
	if (this.req.responseText.match(/id='(.+?)'/))
			this.streamid = RegExp.$1;
	this.oDbg.log("got streamid: "+this.streamid,2);

	this._connected = true;
	this._doAuth();
}

function JSJaCHPCDisconnect() {
	clearTimeout(this.timeout); // remove timer
	this.req = XmlHttp.create();
	this.req.open("POST",this.http_base,false);
	this.req.send(this.sid+";"+this.keys.getKey()+",</stream:stream>");
	this.oDbg.log("Disconnected: "+this.req.responseText,2);
	this._connected = false;
	this.handleEvent('ondisconnect');
}
