/**
 * @fileoverview All stuff related to HTTP Polling
 * @author Stefan Strigler steve@zeank.in-berlin.de
 * @version $Revision$
 */

/**
 * Instantiates a websocket session
 * @class Implementation of {@link
 * http://www.xmpp.org/extensions/xep-0025.html HTTP Polling}
 * @extends JSJaCWebsocketConnection
 * @constructor
 */
function JSJaCWebsocketConnection(oArg) {
  /**
   * @ignore
   */
  this.endpoint = oArg.endpoint
  if (oArg && oArg.oDbg && oArg.oDbg.log) {
      /**
       * Reference to debugger interface
       * (needs to implement method <code>log</code>)
       * @type Debugger
       */
    this.oDbg = oArg.oDbg;
  } else {
    this.oDbg = new Object(); // always initialise a debugger
    this.oDbg.log = function() { };
  }
  if (oArg &&oArg.allow_plain)
      /**
       * @private
       */
    this.allow_plain = oArg.allow_plain;
  else
    this.allow_plain = JSJAC_ALLOW_PLAIN;
  
  if (oArg && oArg.cookie_prefix)
      /**
       * @private
       */
    this._cookie_prefix = oArg.cookie_prefix;
  else
    this._cookie_prefix = "";
  
  /**
   * @private
   */
  this._connected = false;
  /**
   * @private
   */
  this._events = new Array();
  /**
   * @private
   */
  this._keys = null;
  /**
   * @private
   */
  this._ID = 0;
  /**
   * @private
   */
  this._inQ = new Array();
  /**
   * @private
   */
  this._pQueue = new Array();
  /**
   * @private
   */
  this._regIDs = new Array();
  /**
   * @private
   */
  this._req = new Array();
  /**
   * @private
   */
  this._errcnt = 0;
  /**
   * @private
   */
  this._inactivity = JSJAC_INACTIVITY;
  /**
   * @private
   */
  this._sendRawCallbacks = new Array();

}
JSJaCWebsocketConnection.prototype._onclose = function(e){
    this.oDbg.log("websocket closed",e);
}

JSJaCWebsocketConnection.prototype.connect = function(oArg) {
  this._setStatus('connecting');
  this.ws = new WebSocket(this.endpoint);
  this.ws.onclose = this._onclose;
  this.ws.onopen = JSJaC.bind(this._onopen, this, oArg);
};


JSJaCWebsocketConnection.prototype._onopen = function(event,oArg){
     this.domain = oArg.domain || 'localhost';
     this.username = oArg.username;
     this.resource = oArg.resource;
     this.pass = oArg.pass;
     this.register = oArg.register;
     this
     this.authhost = oArg.authhost || this.domain;
     this.authtype = oArg.authtype || 'sasl';

     if (oArg.xmllang && oArg.xmllang != '')
       this._xmllang = oArg.xmllang;

     this.host = oArg.host || this.domain;
     this.port = oArg.port || 5222;
     if (oArg.secure)
       this.secure = 'true';
     else
       this.secure = 'false';

     if (oArg.wait)
       this._wait = oArg.wait;

     this.jid = this.username + '@' + this.domain;
     this.fulljid = this.jid + '/' + this.resource;

     var reqstr = this._getInitialRequestString();

     this.ws.onmessage = JSJaC.bind(this._handleOpenStream, this);

     this.ws.send(reqstr);
}
JSJaCWebsocketConnection.prototype._handleOpenStream = function(event){
    this.oDbg.log(event.data,4);
    // extract stream id used for non-SASL authentication
    if (event.data.match(/id=[\'\"]([^\'\"]+)[\'\"]/))
        this.streamid = RegExp.$1;
    this.oDbg.log("got streamid: "+this.streamid,2);
    this.ws.onmessage = JSJaC.bind(this._handleInitialResponse, this);
}

JSJaCWebsocketConnection.prototype._handleInitialResponse = function(event){
    var doc;
    try {
        var response = event.data;
        doc = this._parseTree(response);
        if (!this._parseStreamFeatures(doc)) {
          this.authtype = 'nonsasl';
          return;
        }
    } catch(e) {
      this.oDbg.log("loadXML: "+e.toString(),1);
    }
    this._connected = true;
    
    if (this.register)
        this._doInBandReg();
    else
        this._doAuth();
    
}

/**
 * Tells whether this connection is connected
 * @return <code>true</code> if this connections is connected,
 * <code>false</code> otherwise
 * @type boolean
 */
JSJaCWebsocketConnection.prototype.connected = function() { return this._connected; };
JSJaCWebsocketConnection.prototype.disconnect = function() {
  this._setStatus('disconnecting');

  if (!this.connected())
    return;
  this._connected = false;
  this.ws.close();
  this.oDbg.log("Disconnected: "+this.ws.responseText,2);
  this._handleEvent('ondisconnect');
};

JSJaCWebsocketConnection.prototype._onmessage = function(event){
    stanza = event.data;
    this._setStatus('processing');
    if (!stanza || stanza == '')
      return null;
    var node = this._parseTree(stanza)
    var packet = JSJaCPacket.wrapNode(node);
    this.oDbg.log("async recv: "+event.data,4);
    this._handleEvent("packet_in", packet);

    if (packet.pType && !this._handlePID(packet)) {
      this._handleEvent(packet.pType()+'_in',packet);
      this._handleEvent(packet.pType(),packet);
    }
    this._handleResponse(node);
}

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._handlePID = function(aJSJaCPacket) {
  this.oDbg.log(aJSJaCPacket);
  if (!aJSJaCPacket.getID())
    return false;
  for (var i in this._regIDs) {
    if (this._regIDs.hasOwnProperty(i) &&
        this._regIDs[i] && i == aJSJaCPacket.getID()) {
      var pID = aJSJaCPacket.getID();
      this.oDbg.log("handling "+pID,3);
      try {
        if (this._regIDs[i].cb.call(this, aJSJaCPacket,this._regIDs[i].arg) === false) {
          // don't unregister
          return false;
        } else {
          this._unregisterPID(pID);
          return true;
        }
      } catch (e) {
        // broken handler?
        this.oDbg.log(e.name+": "+ e.message);
        this._unregisterPID(pID);
        return true;
      }
    }
  }
  return false;
};

JSJaCWebsocketConnection.prototype._handleResponse = function(rootEl){
    for (var i=0; i<rootEl.childNodes.length; i++) {
        if (this._sendRawCallbacks.length) {
            var cb = this._sendRawCallbacks[0];
            this._sendRawCallbacks = this._sendRawCallbacks.slice(1, this._sendRawCallbacks.length);
            cb.fn.call(this, rootEl.childNodes.item(i), cb.arg);
            continue;
        }
        this._inQ = this._inQ.concat(rootEl.childNodes.item(i));
    }
}

/**
 * @private
 */
 
JSJaCWebsocketConnection.prototype._parseTree = function(s) { 
    try {
        var r = XmlDocument.create("body","foo");
        if (typeof(r.loadXML) != 'undefined') {
          r.loadXML("<body xmlns:stream='foo' >" + s + "</body>");
          return r.documentElement.firstChild;
        } else if (window.DOMParser)
            return (new DOMParser()).parseFromString(s, "text/xml")
                    .documentElement.firstChild;
    } catch (e) { this.oDbg.log("Error : "+e) }
    return null;
}

JSJaCWebsocketConnection.prototype._getInitialRequestString = function() {
  var streamto = this.domain;
  if (this.authhost)
    streamto = this.authhost;

  reqstr = "<?xml version=\"1.0\"?><stream:stream to='"+streamto+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'";
  if (this.authtype == 'sasl' || this.authtype == 'saslanon')
    reqstr += " version='1.0'";
  reqstr += ">";
  return reqstr;
};

JSJaCWebsocketConnection.prototype.send = function(packet,cb,arg) {
  this.ws.onmessage = JSJaC.bind(this._onmessage, this)
  if (!packet || !packet.pType) {
    this.oDbg.log("no packet: "+packet, 1);
    return false;
  }

  if (!this.connected())
    return false;

  // remember id for response if callback present
  if (cb) {
    if (!packet.getID())
      packet.setID('JSJaCID_'+this._ID++); // generate an ID

    // register callback with id
    this._registerPID(packet.getID(),cb,arg);
  }

  try {
    this._handleEvent(packet.pType()+'_out', packet);
    this._handleEvent("packet_out", packet);
    this.ws.send(packet.xml());
  } catch (e) {
    this.oDbg.log(e.toString(),1);
    return false;
  }

  return true;
};


/**
 * Registers an event handler (callback) for this connection.

 * <p>Note: All of the packet handlers for specific packets (like
 * message_in, presence_in and iq_in) fire only if there's no
 * callback associated with the id.<br>

 * <p>Example:<br/>
 * <code>con.registerHandler('iq', 'query', 'jabber:iq:version', handleIqVersion);</code>


 * @param {String} event One of

 * <ul>
 * <li>onConnect - connection has been established and authenticated</li>
 * <li>onDisconnect - connection has been disconnected</li>
 * <li>onResume - connection has been resumed</li>

 * <li>onStatusChanged - connection status has changed, current
 * status as being passed argument to handler. See {@link #status}.</li>

 * <li>onError - an error has occured, error node is supplied as
 * argument, like this:<br><code>&lt;error code='404' type='cancel'&gt;<br>
 * &lt;item-not-found xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/&gt;<br>
 * &lt;/error&gt;</code></li>

 * <li>packet_in - a packet has been received (argument: the
 * packet)</li>

 * <li>packet_out - a packet is to be sent(argument: the
 * packet)</li>

 * <li>message_in | message - a message has been received (argument:
 * the packet)</li>

 * <li>message_out - a message packet is to be sent (argument: the
 * packet)</li>

 * <li>presence_in | presence - a presence has been received
 * (argument: the packet)</li>

 * <li>presence_out - a presence packet is to be sent (argument: the
 * packet)</li>

 * <li>iq_in | iq - an iq has been received (argument: the packet)</li>
 * <li>iq_out - an iq is to be sent (argument: the packet)</li>
 * </ul>

 * @param {String} childName A childnode's name that must occur within a
 * retrieved packet [optional]

 * @param {String} childNS A childnode's namespace that must occure within
 * a retrieved packet (works only if childName is given) [optional]

 * @param {String} type The type of the packet to handle (works only if childName and chidNS are given (both may be set to '*' in order to get skipped) [optional]

 * @param {Function} handler The handler to be called when event occurs. If your handler returns 'true' it cancels bubbling of the event. No other registered handlers for this event will be fired.
 */
JSJaCWebsocketConnection.prototype.registerHandler = function(event) {
  event = event.toLowerCase(); // don't be case-sensitive here
  var eArg = {handler: arguments[arguments.length-1],
              childName: '*',
              childNS: '*',
              type: '*'};
  if (arguments.length > 2)
    eArg.childName = arguments[1];
  if (arguments.length > 3)
    eArg.childNS = arguments[2];
  if (arguments.length > 4)
    eArg.type = arguments[3];
  if (!this._events[event])
    this._events[event] = new Array(eArg);
  else
    this._events[event] = this._events[event].concat(eArg);

  // sort events in order how specific they match criterias thus using
  // wildcard patterns puts them back in queue when it comes to
  // bubbling the event
  this._events[event] =
  this._events[event].sort(function(a,b) {
    var aRank = 0;
    var bRank = 0;
    with (a) {
      if (type == '*')
        aRank++;
      if (childNS == '*')
        aRank++;
      if (childName == '*')
        aRank++;
    }
    with (b) {
      if (type == '*')
        bRank++;
      if (childNS == '*')
        bRank++;
      if (childName == '*')
        bRank++;
    }
    if (aRank > bRank)
      return 1;
    if (aRank < bRank)
      return -1;
    return 0;
  });
  this.oDbg.log("registered handler for event '"+event+"'",2);
};

JSJaCWebsocketConnection.prototype.unregisterHandler = function(event,handler) {
  event = event.toLowerCase(); // don't be case-sensitive here

  if (!this._events[event])
    return;

  var arr = this._events[event], res = new Array();
  for (var i=0; i<arr.length; i++)
    if (arr[i].handler != handler)
      res.push(arr[i]);

  if (arr.length != res.length) {
    this._events[event] = res;
    this.oDbg.log("unregistered handler for event '"+event+"'",2);
  }
};

/**
 * Register for iq packets of type 'get'.
 * @param {String} childName A childnode's name that must occur within a
 * retrieved packet

 * @param {String} childNS A childnode's namespace that must occure within
 * a retrieved packet (works only if childName is given)

 * @param {Function} handler The handler to be called when event occurs. If your handler returns 'true' it cancels bubbling of the event. No other registered handlers for this event will be fired.
 */
JSJaCWebsocketConnection.prototype.registerIQGet =
  function(childName, childNS, handler) {
  this.registerHandler('iq', childName, childNS, 'get', handler);
};

/**
 * Register for iq packets of type 'set'.
 * @param {String} childName A childnode's name that must occur within a
 * retrieved packet

 * @param {String} childNS A childnode's namespace that must occure within
 * a retrieved packet (works only if childName is given)

 * @param {Function} handler The handler to be called when event occurs. If your handler returns 'true' it cancels bubbling of the event. No other registered handlers for this event will be fired.
 */
JSJaCWebsocketConnection.prototype.registerIQSet =
  function(childName, childNS, handler) {
  this.registerHandler('iq', childName, childNS, 'set', handler);
};

/**
 * Resumes this connection from saved state (cookie)
 * @return Whether resume was successful
 * @type boolean
 */
JSJaCWebsocketConnection.prototype.resume = function() {
  try {
    var json = JSJaCCookie.read(this._cookie_prefix+'JSJaC_State').getValue(); 
    this.oDbg.log('read cookie: '+json,2);
    JSJaCCookie.read(this._cookie_prefix+'JSJaC_State').erase();

    return this.resumeFromData(JSJaCJSON.parse(json));
  } catch (e) {}
  return false; // sth went wrong
};

/**
 * Resumes BOSH connection from data  
 * @param {Object} serialized jsjac state information
 * @return Whether resume was successful
 * @type boolean
 */
JSJaCWebsocketConnection.prototype.resumeFromData = function(data) {
  try {
    this._setStatus('resuming');

    for (var i in data)
      if (data.hasOwnProperty(i))
        this[i] = data[i];
     
    // copy keys - not being very generic here :-/
    if (this._keys) {
      this._keys2 = new JSJaCKeys();
      var u = this._keys2._getSuspendVars();
      for (var i=0; i<u.length; i++)
        this._keys2[u[i]] = this._keys[u[i]];
      this._keys = this._keys2;
    }

    if (this._connected) {
      // don't poll too fast!
      this._handleEvent('onresume');
      setTimeout(JSJaC.bind(this._resume, this),this.getPollInterval());
      this._interval = setInterval(JSJaC.bind(this._checkQueue, this),
				   JSJAC_CHECKQUEUEINTERVAL);
      this._inQto = setInterval(JSJaC.bind(this._checkInQ, this),
				JSJAC_CHECKINQUEUEINTERVAL);
    }

    return (this._connected === true);
  } catch (e) {
    if (e.message)
      this.oDbg.log("Resume failed: "+e.message, 1);
    else
      this.oDbg.log("Resume failed: "+e, 1);
    return false;
  }
};

/**
 * Sends an IQ packet. Has default handlers for each reply type.
 * Those maybe overriden by passing an appropriate handler.
 * @param {JSJaCIQPacket} iq - the iq packet to send
 * @param {Object} handlers - object with properties 'error_handler',
 *                            'result_handler' and 'default_handler'
 *                            with appropriate functions
 * @param {Object} arg - argument to handlers
 * @return 'true' if sending was successfull, 'false' otherwise
 * @type boolean
 */
JSJaCWebsocketConnection.prototype.sendIQ = function(iq, handlers, arg) {
  if (!iq || iq.pType() != 'iq') {
    return false;
  }

  handlers = handlers || {};
  var error_handler = handlers.error_handler || function(aIq) {
    this.oDbg.log(aIq.xml(), 1);
  };
 
  var result_handler = handlers.result_handler ||  function(aIq) {
    this.oDbg.log(aIq.xml(), 2);
  };
  // unsure, what's the use of this?
  var default_handler = handlers.default_handler || function(aIq) {
    this.oDbg.log(aIq.xml(), 2);
  };

  var iqHandler = function(aIq, arg) {
    switch (aIq.getType()) {
      case 'error':
      error_handler(aIq);
      break;
      case 'result':
      result_handler(aIq, arg);
      break;
      default: // may it be?
      default_handler(aIq, arg);
    }
  };
  return this.send(iq, iqHandler, arg);
};


/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doAuth = function() {
  if (this.has_sasl && this.authtype == 'nonsasl')
    this.oDbg.log("Warning: SASL present but not used", 1);
  
  this._doSASLAuth()
  return true;
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doInBandReg = function() {
  if (this.authtype == 'saslanon' || this.authtype == 'anonymous')
    return; // bullshit - no need to register if anonymous

  /* ***
   * In-Band Registration see JEP-0077
   */

  var iq = new JSJaCIQ();
  iq.setType('set');
  iq.setID('reg1');
  iq.appendNode("query", {xmlns: "jabber:iq:register"},
                [["username", this.username],
                 ["password", this.pass]]);

  this.send(iq,this._doInBandRegDone);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doInBandRegDone = function(iq) {
  if (iq && iq.getType() == 'error') { // we failed to register
    this.oDbg.log("registration failed for "+this.username,0);
    this._handleEvent('onerror',iq.getChild('error'));
    return;
  }

  this.oDbg.log(this.username + " registered succesfully",0);

  this._doAuth();
};


/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doSASLAuth = function() {
  if (this.authtype == 'nonsasl' || this.authtype == 'anonymous')
    return false;

  if (this.authtype == 'saslanon') {
    if (this.mechs['ANONYMOUS']) {
      this.oDbg.log("SASL using mechanism 'ANONYMOUS'",2);
      return this._sendRaw("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='ANONYMOUS'/>",
                           this._doSASLAuthDone);
    }
    this.oDbg.log("SASL ANONYMOUS requested but not supported",1);
  } else {
    if (this.mechs['DIGEST-MD5']) {
      this.oDbg.log("SASL using mechanism 'DIGEST-MD5'",2);
      return this._sendRaw("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='DIGEST-MD5'/>",
                           this._doSASLAuthDigestMd5S1);
    } else if (this.allow_plain && this.mechs['PLAIN']) {
      this.oDbg.log("SASL using mechanism 'PLAIN'",2);
      var authStr = this.username+'@'+
      this.domain+String.fromCharCode(0)+
      this.username+String.fromCharCode(0)+
      this.pass;
      this.oDbg.log("authenticating with '"+authStr+"'",2);
      authStr = btoa(authStr);
      return this._sendRaw("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>"+authStr+"</auth>",
                           this._doSASLAuthDone);
    }
    this.oDbg.log("No SASL mechanism applied",1);
    this.authtype = 'nonsasl'; // fallback
  }
  return false;
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doSASLAuthDigestMd5S1 = function(event) {
  el = this._parseTree(event.data)
  if (el.nodeName != "challenge") {
    this.oDbg.log("challenge missing",1);
    this._handleEvent('onerror',JSJaCError('401','auth','not-authorized'));
    this.disconnect();
  } else {
    var challenge = atob(el.firstChild.nodeValue);
    this.oDbg.log("got challenge: "+challenge,2);
    this._nonce = challenge.substring(challenge.indexOf("nonce=")+7);
    this._nonce = this._nonce.substring(0,this._nonce.indexOf("\""));
    this.oDbg.log("nonce: "+this._nonce,2);
    if (this._nonce == '' || this._nonce.indexOf('\"') != -1) {
      this.oDbg.log("nonce not valid, aborting",1);
      this.disconnect();
      return;
    }

    this._digest_uri = "xmpp/";
    //     if (typeof(this.host) != 'undefined' && this.host != '') {
    //       this._digest-uri += this.host;
    //       if (typeof(this.port) != 'undefined' && this.port)
    //         this._digest-uri += ":" + this.port;
    //       this._digest-uri += '/';
    //     }
    this._digest_uri += this.domain;

    this._cnonce = cnonce(14);

    this._nc = '00000001';

    var A1 = str_md5(this.username+':'+this.domain+':'+this.pass)+
    ':'+this._nonce+':'+this._cnonce;

    var A2 = 'AUTHENTICATE:'+this._digest_uri;

    var response = hex_md5(hex_md5(A1)+':'+this._nonce+':'+this._nc+':'+
                           this._cnonce+':auth:'+hex_md5(A2));

    var rPlain = 'username="'+this.username+'",realm="'+this.domain+
    '",nonce="'+this._nonce+'",cnonce="'+this._cnonce+'",nc="'+this._nc+
    '",qop=auth,digest-uri="'+this._digest_uri+'",response="'+response+
    '",charset="utf-8"';
   
    this.oDbg.log("response: "+rPlain,2);

    this._sendRaw("<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"+
                  binb2b64(str2binb(rPlain))+"</response>",
                  this._doSASLAuthDigestMd5S2);
  }
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doSASLAuthDigestMd5S2 = function(event) {
  el = this._parseTree(event.data)
  if (el.nodeName == 'failure') {
    if (el.xml)
      this.oDbg.log("auth error: "+el.xml,1);
    else
      this.oDbg.log("auth error",1);
    this._handleEvent('onerror',JSJaCError('401','auth','not-authorized'));
    this.disconnect();
    return;
  }

  var response = atob(el.firstChild.nodeValue);
  this.oDbg.log("response: "+response,2);

  var rspauth = response.substring(response.indexOf("rspauth=")+8);
  this.oDbg.log("rspauth: "+rspauth,2);

  var A1 = str_md5(this.username+':'+this.domain+':'+this.pass)+
  ':'+this._nonce+':'+this._cnonce;

  var A2 = ':'+this._digest_uri;

  var rsptest = hex_md5(hex_md5(A1)+':'+this._nonce+':'+this._nc+':'+
                        this._cnonce+':auth:'+hex_md5(A2));
  this.oDbg.log("rsptest: "+rsptest,2);

  if (rsptest != rspauth) {
    this.oDbg.log("SASL Digest-MD5: server repsonse with wrong rspauth",1);
    this.disconnect();
    return;
  }

  if (el.nodeName == 'success')
    this._reInitStream(this.domain, this._doStreamBind);
  else // some extra turn
    this._sendRaw("<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>",
                  this._doSASLAuthDone);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doSASLAuthDone = function (event) {
  el = this._parseTree(event.data)
  if (el.nodeName != 'success') {
    this.oDbg.log("auth failed",1);
    this._handleEvent('onerror',JSJaCError('401','auth','not-authorized'));
    this.disconnect();
  } else
    this._reInitStream(this.domain, this._doStreamBind);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doStreamBind = function() {
  var iq = new JSJaCIQ();
  iq.setIQ(this.domain,'set','bind_1');
  iq.appendNode("bind", {xmlns: "urn:ietf:params:xml:ns:xmpp-bind"},
                [["resource", this.resource]]);
  this.oDbg.log(iq.xml());
  this.send(iq,this._doXMPPSess);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doXMPPSess = function(iq) {
  if (iq.getType() != 'result' || iq.getType() == 'error') { // failed
    this.disconnect();
    if (iq.getType() == 'error')
      this._handleEvent('onerror',iq.getChild('error'));
    return;
  }
 
  this.fulljid = iq.getChildVal("jid");
  this.jid = this.fulljid.substring(0,this.fulljid.lastIndexOf('/'));
 
  iq = new JSJaCIQ();
  iq.setIQ(this.domain,'set','sess_1');
  iq.appendNode("session", {xmlns: "urn:ietf:params:xml:ns:xmpp-session"},
                []);
  this.oDbg.log(iq.xml());
  this.send(iq,this._doXMPPSessDone);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._doXMPPSessDone = function(iq) {
  if (iq.getType() != 'result' || iq.getType() == 'error') { // failed
    this.disconnect();
    if (iq.getType() == 'error')
      this._handleEvent('onerror',iq.getChild('error'));
    return;
  } else
    this._handleEvent('onconnect');
    this.ws.onmessage = JSJaC.bind(this._onmessage, this);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._reInitStream = function(to,cb,arg) {
  this._sendRaw("<stream:stream xmlns:stream='http://etherx.jabber.org/streams' xmlns='jabber:client' to='"+to+"' version='1.0'>",cb,arg);
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._handleEvent = function(event,arg) {
  event = event.toLowerCase(); // don't be case-sensitive here
  this.oDbg.log("incoming event '"+event+"'",3);
  if (!this._events[event])
    return;
  this.oDbg.log("handling event '"+event+"'",2);
  for (var i=0;i<this._events[event].length; i++) {
    var aEvent = this._events[event][i];
    if (typeof aEvent.handler == 'function') {
      try {
        if (arg) {
          if (arg.pType) { // it's a packet
            if ((!arg.getNode().hasChildNodes() && aEvent.childName != '*') ||
				(arg.getNode().hasChildNodes() &&
				 !arg.getChild(aEvent.childName, aEvent.childNS)))
              continue;
            if (aEvent.type != '*' &&
                arg.getType() != aEvent.type)
              continue;
            this.oDbg.log(aEvent.childName+"/"+aEvent.childNS+"/"+aEvent.type+" => match for handler "+aEvent.handler,3);
          }
          if (aEvent.handler(arg)) {
            // handled!
            break;
          }
        }
        else
          if (aEvent.handler()) {
            // handled!
            break;
          }
      } catch (e) { 

        if (e.fileName&&e.lineNumber) {
            this.oDbg.log(aEvent.handler+"\n>>>"+e.name+": "+ e.message+' in '+e.fileName+' line '+e.lineNumber,1);    
        } else {
            this.oDbg.log(aEvent.handler+"\n>>>"+e.name+": "+ e.message,1);             
        }

      }
    }
  }
};



/**
 * @private
 */
JSJaCWebsocketConnection.prototype._registerPID = function(pID,cb,arg) {
  if (!pID || !cb)
    return false;
  this._regIDs[pID] = new Object();
  this._regIDs[pID].cb = cb;
  if (arg)
    this._regIDs[pID].arg = arg;
  this.oDbg.log("registered "+pID,3);
  return true;
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._unregisterPID = function(pID) {
  if (!this._regIDs[pID])
    return false;
  this._regIDs[pID] = null;
  this.oDbg.log("unregistered "+pID,3);
  return true;
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._parseStreamFeatures = function(doc) {
  if (!doc) {
    this.oDbg.log("nothing to parse ... aborting",1);
    return false;
  }

  var errorTag;
  if (doc.getElementsByTagNameNS)
    errorTag = doc.getElementsByTagNameNS("http://etherx.jabber.org/streams", "error").item(0);
  else {
    var errors = doc.getElementsByTagName("error");
    for (var i=0; i<errors.length; i++)
      if (errors.item(i).namespaceURI == "http://etherx.jabber.org/streams") {
        errorTag = errors.item(i);
        break;
      }
  }

  if (errorTag) {
    this._setStatus("internal_server_error");
    clearTimeout(this._timeout); // remove timer
    clearInterval(this._interval);
    clearInterval(this._inQto);
    this._handleEvent('onerror',JSJaCError('503','cancel','session-terminate'));
    this._connected = false;
    this.oDbg.log("Disconnected.",1);
    this._handleEvent('ondisconnect');
    return false;
  }

  this.mechs = new Object();
  var lMec1 = doc.getElementsByTagName("mechanisms");
  this.has_sasl = false;
  for (var i=0; i<lMec1.length; i++)
    if (lMec1.item(i).getAttribute("xmlns") ==
        "urn:ietf:params:xml:ns:xmpp-sasl") {
      this.has_sasl=true;
      var lMec2 = lMec1.item(i).getElementsByTagName("mechanism");
      for (var j=0; j<lMec2.length; j++)
        this.mechs[lMec2.item(j).firstChild.nodeValue] = true;
      break;
    }
  if (this.has_sasl)
    this.oDbg.log("SASL detected",2);
  else {
    this.oDbg.log("No support for SASL detected",2);
    return false;
  }

  /* [TODO]
   * check if in-band registration available
   * check for session and bind features
   */

  return true;
};


/**
 * @private
 */
JSJaCWebsocketConnection.prototype._setStatus = function(status) {
  if (!status || status == '')
    return;
  if (status != this._status) { // status changed!
    this._status = status;
    this._handleEvent('onstatuschanged', status);
    this._handleEvent('status_changed', status);
  }
};

/**
 * @private
 */
JSJaCWebsocketConnection.prototype._sendRaw = function(xml,cb,arg) {
  if (cb){
      this.ws.onmessage = JSJaC.bind(cb, this, arg);
  }
  this.ws.send(xml);
}

/**
 * @private
 */
var falselogger = {log: function(){}}
