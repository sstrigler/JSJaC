JSJaCHBC_NKEYS = 5; // number of keys to generate

var re = new RegExp(/<body [^>]+>(.*)<\/body>/i);

function JSJaCHttpBindingConnection(oDbg) {
	this.base = JSJaCConnection;
	this.base(oDbg);

	this.keys  = null;	
	this.setup = false; 
	
	this.connect = JSJaCHBCConnect;
	this.disconnect = JSJaCHBCDisconnect;
	this._prepareResponse = JSJaCHBCPrepareResponse;
	this._getRequestString = JSJaCHBCGetRequestString;
	this._setupRequest = JSJaCHBCSetupRequest;
	this._getStreamID = JSJaCHBCGetStreamID;
}

function JSJaCHBCKeys(oDbg) {
	var seed = Math.random();

	this.k = new Array();
	this.k[0] = seed.toString();
	this.oDbg = oDbg;

	for (var i=1; i<JSJaCHBC_NKEYS; i++) {
		this.k[i] = b64_sha1(this.k[i-1]);
		oDbg.log(i+": "+this.k[i],4);
	}

	this.indexAt = JSJaCHBC_NKEYS-1;
	this.getKey = function() { 
		return this.k[this.indexAt--]; 
	};
	this.lastKey = function() { return (this.indexAt == 0); };
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
	this.rid++;
		
	var reqstr = "<body rid='"+this.rid+"' sid='"+this.sid+"' xmlns='http://jabber.org/protocol/httpbind'  ";
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
		clearTimeout(this.timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		if (req.status < 500)
  		this.handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
		else
	  	this.handleEvent('onerror',JSJaCError('503','cancel','service-unavailable'));
		return null;
	} 

	// Check for errors from the server
  var body = req.responseXML.firstChild;
	if (body.getAttribute("type") == "terminate") {
		this.oDbg.log("invalid response:\n" + req.responseText,1);
		clearTimeout(this.timeout); // remove timer
		this._connected = false;
		this.oDbg.log("Disconnected.",1);
		this.handleEvent('ondisconnect');
		this.handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
		return null;
	}

	/* it would be really nice if we could just use req.responseXML here.
	 * unfortunately given body element has a namespace attribute which
	 * causes that childNodes are prepended with some qualifying
	 * namespaceURI if treated seperately. if someone knows a more
	 * elegant solution to this, please let me know!
	 */

	re.exec(req.responseText);
	try {
		var response = XmlDocument.create();
		response.loadXML("<body>"+RegExp.$1+"</body>");
		return response;
	} catch (e) {
		return null;
	}
}

function JSJaCHBCConnect(http_base,server,username,resource,pass,timerval,register) {
	// initial request to get sid and streamid

	this.http_base = http_base || '/';
	this.server = server || 'localhost';
	this.username = username;
	this.resource = resource;
	this.pass = pass;
	this.rid  = Math.round( 100000.5 + ( ( (900000.49999) - (100000.5) ) * Math.random() ) );
	this.wait = 60;
  this.hold = 1;
	this.oDbg.log("http_base: " + this.http_base + "\nserver:" + server,2);

	this.keys = new JSJaCHBCKeys(this.oDbg); // generate first set of keys
	key = this.keys.getKey();

	this.req = this._setupRequest(false);

	this.oDbg.log("send body",4);
        // Create a body class?
	this.req.send("<body hold='"+this.hold+"' xmlns='http://jabber.org/protocol/httpbind' to='"+this.server+"' wait='"+this.wait+"' rid='"+this.rid+"'/>");

	// extract session ID
	this.oDbg.log(this.req.getAllResponseHeaders(),4);
	
	this.oDbg.log(this.req.responseText,4);
	
	if (this.req.responseText.match(/sid=[\'"](.+?)[\'"]/))
			this.sid = RegExp.$1;
	this.oDbg.log("got sid: "+this.sid,2);

	this._connected = true;

	/* wait for initial stream response to extract streamid needed
	 * for digest auth
	 */
	this._getStreamID();
}

function JSJaCHBCGetStreamID() {

	this.oDbg.log(this.req.responseText,4);

	// extract stream id used for non-SASL authentication
	if (this.req.responseText.match(/authid=[\'"](.+?)[\'"]/)) {
			this.streamid = RegExp.$1;
			this.oDbg.log("got streamid: "+this.streamid,2);
	} else {
		oCon = this;
		setTimeout("oCon._sendEmpty()",1000);
		return;
	}
	
	this._process(timerval); // start polling
	
	if (register)
		this._doReg();
	else
		this._doAuth();
}


function JSJaCHBCDisconnect() {
	
	if (!this.connected())
		return;
	
	if (this.timeout)
		clearTimeout(this.timeout); // remove timer
	this.rid++;
	this.req = this._setupRequest(false);

	var body = XmlDocument.create();	
	body.loadXML("<body type='terminate' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"' wait='"+this.wait+"' rid='"+this.rid+"'><presence type='unavailable' xmlns='jabber:client'/></body>");
	this.req.send(body.xml);

	this.oDbg.log("Disconnected: "+this.req.responseText,2);
	this._connected = false;
	this.handleEvent('ondisconnect');
}
