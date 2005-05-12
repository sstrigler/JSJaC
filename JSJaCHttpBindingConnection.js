JSJaCHBC_MAX_HOLD = 0;

function JSJaCHttpBindingConnection(oDbg) {
	this.base = JSJaCConnection;
	this.base(oDbg);

	this._hold = JSJaCHBC_MAX_HOLD;
	this._inactivity = 0;
	this._min_polling = 0;
	this._wait = 60;  

	this.connect = JSJaCHBCConnect;
	this.disconnect = JSJaCHBCDisconnect;
	this.isPolling = function() { return (this._hold == 0) }; 
	this.setPollInterval = function(timerval) {
		if (!timerval || isNaN(timerval)) {
			this.oDbg.log("Invalid timerval: " + timerval,1);
			return -1;
		}
		if (!this.isPolling())
			return -1;
		if (this._min_polling && timerval < this._min_polling*1000)
			this._timerval = this._min_polling*1000;
		else if (this._inactivity && timerval > this._inactivity*1000)
			this._timerval = this._inactivity*1000;
		else
			this._timerval = timerval;
		return this._timerval;
	};

	this._getRequestString = JSJaCHBCGetRequestString;
	this._getStreamID = JSJaCHBCGetStreamID;
	this._prepareResponse = JSJaCHBCPrepareResponse;
	this._setHold = function(hold)  {
		if (!hold || isNaN(hold))
			return -1;
		if (hold < 0)
			hold = 0;
		else if (hold > JSJaCHBC_MAX_HOLD)
			hold = JSJaCHBC_MAX_HOLD;
		this._hold = hold;
		return this._hold;
	};
	this._setupRequest = JSJaCHBCSetupRequest;
}

function JSJaCHBCSetupRequest(async) {
	var req = XmlHttp.create();
	try {
		req.open("POST",this.http_base,async);
		req.setRequestHeader('Content-Type','text/xml');
	} catch(e) { this.oDbg.log(e,1); }
	return req;
}

function JSJaCHBCGetRequestString(xml) {
	this._rid++;
		
	var reqstr = "<body rid='"+this._rid+"' sid='"+this.sid+"' xmlns='http://jabber.org/protocol/httpbind' ";
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

	/* handle error */
	
	if (req.status != 200) {
		this.oDbg.log("invalid response:\n" + req.responseText,1);
		clearTimeout(this._timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		if (req.status < 500)
			this.handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
		else
			this.handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return null;
	} 

	if (!req.responseXML)
		return null;

	// Check for errors from the server
	var body = req.responseXML.firstChild;
	if (body.getAttribute("type") == "terminate") {
		this.oDbg.log("invalid response:\n" + req.responseText,1);
		clearTimeout(this._timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		this.handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
		return null;
	}

	return req.responseXML;
}

function JSJaCHBCConnect(http_base,server,username,resource,pass,timerval,register) {
	// initial request to get sid and streamid

	this.http_base = http_base || '/';
	this.server = server || 'localhost';
	this.username = username;
	this.resource = resource;
	this.pass = pass;
	this.register = register;
	this.oDbg.log("http_base: " + this.http_base + "\nserver:" + server,2);

	this._rid  = Math.round( 100000.5 + ( ( (900000.49999) - (100000.5) ) * Math.random() ) );

	var reqstr = '';
	if (JSJaC_HAVEKEYS) {
		this._keys = new JSJaCKeys(hex_sha1,this.oDbg); // generate first set of keys
		key = this._keys.getKey();
		reqstr += "<body hold='"+this._hold+"' xmlns='http://jabber.org/protocol/httpbind' to='"+this.server+"' wait='"+this._wait+"' rid='"+this._rid+"' newkey='"+key+"'/>";
	} else
		reqstr += "<body hold='"+this._hold+"' xmlns='http://jabber.org/protocol/httpbind' to='"+this.server+"' wait='"+this._wait+"' rid='"+this._rid+"'/>";

	this.req = this._setupRequest(false);
	this.oDbg.log(reqstr,4);
	this.req.send(reqstr);

	this.oDbg.log(this.req.getAllResponseHeaders(),4);
	this.oDbg.log(this.req.responseText,4);

	if (!this.req.responseXML || !this.req.responseXML.firstChild) {
		this.handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
		return;
	}
	var body = this.req.responseXML.firstChild;

	// get session ID
	this.sid = body.getAttribute('sid');
	this.oDbg.log("got sid: "+this.sid,2);

	// get attributes from response body
	if (body.getAttribute('polling'))
		this.min_polling = body.getAttribute('polling');

	if (body.getAttribute('inactivity'))
		this.inactivity = body.getAttribute('inactivity');
	
	if (body.getAttribute('requests'))
		this._setHold(body.getAttribute('requests'));

	// must be done after response attributes have been collected
	this.setPollInterval(timerval);

	this._connected = true;

	/* wait for initial stream response to extract streamid needed
	 * for digest auth
	 */
	this._getStreamID();
}

function JSJaCHBCGetStreamID() {

	this.oDbg.log(this.req.responseText,4);

	if (!this.req.responseXML || !this.req.responseXML.firstChild) {
		this.handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
		return;
	}
	var body = this.req.responseXML.firstChild;

	// extract stream id used for non-SASL authentication
	if (body.getAttribute('authid')) {
		this.streamid = body.getAttribute('authid');
		this.oDbg.log("got streamid: "+this.streamid,2);
	} else {
		oCon = this;
		setTimeout("oCon._sendEmpty()",this.getPollInterval());
		return;
	}
	
	if (this.register)
		this._doReg();
	else
		this._doAuth();

	setTimeout("oCon._process()",this.getPollInterval());
}


function JSJaCHBCDisconnect() {
	
	if (!this.connected())
		return;
	
	if (this._timeout)
		clearTimeout(this._timeout); // remove timer
	this._rid++;
	this.req = this._setupRequest(false);

	var reqstr = "<body type='terminate' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"' rid='"+this._rid+"'><presence type='unavailable' xmlns='jabber:client' ";
	if (JSJaC_HAVEKEYS) {
		reqstr += "key='"+this._keys.getKey()+"' ";
	}
	reqstr += "/></body>"
	this.req.send(reqstr);

	this.oDbg.log("Disconnected: "+this.req.responseText,2);
	this._connected = false;
	this.handleEvent('ondisconnect');
}
