JSJaC_HAVEKEYS = true;  // whether to use keys
JSJaC_NKEYS    = 16;    // number of keys to generate
JSJAC_INACTIVITY = 300; // qnd hack to make suspend/resume work more smoothly with polling
JSJAC_ERR_COUNT = 10;	// number of retries in case of connection errors

JSJAC_ALLOW_PLAIN = true; // whether to allow plaintext logins

JSJaC_CheckQueueInterval = 100; // msecs to poll send queue
JSJaC_CheckInQueueInterval = 1; // msecs to poll in queue
/* ******************************
 * JabberConnection 
 * somewhat abstract base class
 */

function JSJaCConnection(oArg) {
  oCon = this; // remember reference to ourself
  if (oArg && oArg.oDbg && oArg.oDbg.log)
    this.oDbg = oArg.oDbg; 
  else {
    this.oDbg = new Object(); // always initialise a debugger
    this.oDbg.log = function() { };
  }

  if (oArg && oArg.httpbase)
    this._httpbase = oArg.httpbase;

  if (oArg && typeof(oArg.allow_plain) != 'undefined')
    this.allow_plain = oArg.allow_plain;
  else 
    this.allow_plain = JSJAC_ALLOW_PLAIN;

  this._connected = false;
  this._events = new Array();
  this._keys = null;
  this._ID = 0;
  this._inQ = new Array();
  this._pQueue = new Array();
  this._regIDs = new Array();
  this._req = new Array();
  this._status = 'intialized';
  this._errcnt = 0;
  this._inactivity = JSJAC_INACTIVITY;

  this.connected = function() { return this._connected; };
  this.getPollInterval = function() { return this._timerval; };
  this.registerHandler = function(event,handler) {
    event = event.toLowerCase(); // don't be case-sensitive here
    if (!this._events[event])
      this._events[event] = new Array(handler);
    else
      this._events[event] = this._events[event].concat(handler);
    this.oDbg.log("registered handler for event '"+event+"'",2);
  };
  this.resume = function() {
    var s = readCookie('s');

    if (!s)
      return false;

    this.oDbg.log('read cookie: '+s,4);

    o = JSON.parse(s);

    for (var i in o)
      this[i] = o[i];

    // copy keys - not being very generic here :-/
    if (this._keys) {
      this._keys2 = new JSJaCKeys();
      var u = this._keys2._getSuspendVars();
      for (var i=0; i<u.length; i++) 
        this._keys2[u[i]] = this._keys[u[i]];
      this._keys = this._keys2;
    }

    if (this._connected)
      setTimeout("oCon._resume()",this.getPollInterval()); // don't poll too fast!
    return this._connected;
  }
  this.send = JSJaCSend;
  this.setPollInterval = function(timerval) {
    if (!timerval || isNaN(timerval)) {
      this.oDbg.log("Invalid timerval: " + timerval,1);
      return -1;
    }
    this._timerval = timerval;
    return this._timerval;
  };
  if (oArg && oArg.timerval)
    this.setPollInterval(oArg.timerval);
  this.status = function() { return this._status; }
  this.suspend = function() {
		
    // remove timers
    clearTimeout(this._timeout);
    clearInterval(this._interval);
    clearInterval(this._inQto);

    var u = ('_connected,_keys,_ID,_inQ,_pQueue,_regIDs,_errcnt,_inactivity,domain,username,resource,jid,fulljid,_sid,_httpbase,_timerval,_is_polling').split(',');
    u = u.concat(this._getSuspendVars());
    var s = new Object();

    for (var i=0; i<u.length; i++) {
      if (!this[u[i]]) continue; // hu? skip these!
      if (this[u[i]]._getSuspendVars) {
        var uo = this[u[i]]._getSuspendVars();
        var o = new Object();
        for (var j=0; j<uo.length; j++)
          o[uo[j]] = this[u[i]][uo[j]];
      } else
        var o = this[u[i]];

      s[u[i]] = o;
    }
		
    createCookie('s',JSON.toString(s),this._inactivity)

    this._connected = false;

    this._setStatus('suspending');
  }

  this._abort       = JSJaCAbort;
  this._checkInQ    = JSJaCCheckInQ;
  this._checkQueue  = JSJaCHBCCheckQueue;

  this._doAuth          = JSJaCAuth;

  this._doInBandReg     = JSJaCInBandReg;
  this._doInBandRegDone = JSJaCInBandRegDone;

  this._doLegacyAuth    = JSJaCLegacyAuth;
  this._doLegacyAuth2   = JSJaCLegacyAuth2;
  this._doLegacyAuthDone= JSJaCLegacyAuthDone;

  this._sendRaw         = JSJaCSendRaw;

  this._doSASLAuth      = JSJaCSASLAuth;

  this._doSASLAuthDigestMd5S1 = JSJaCSASLAuthDigestMd5S1;
  this._doSASLAuthDigestMd5S2 = JSJaCSASLAuthDigestMd5S2;

  this._doSASLAuthDone  = JSJaCSASLAuthDone;

  this._doStreamBind    = JSJaCStreamBind;
  this._doXMPPSess      = JSJaCXMPPSess;
  this._doXMPPSessDone  = JSJaCXMPPSessDone;

  this._handleEvent = function(event,arg) {
    event = event.toLowerCase(); // don't be case-sensitive here
    this.oDbg.log("incoming event '"+event+"'",3);
    if (!this._events[event])
      return;
    this.oDbg.log("handling event '"+event+"'",2);
    for (var i=0;i<this._events[event].length; i++) {
      if (this._events[event][i]) {
        try {
          if (arg)
            this._events[event][i](arg);
          else
            this._events[event][i]();
        } catch (e) { this.oDbg.log(e.name+": "+ e.message); }
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
        try {
          this._regIDs[i].cb(aJSJaCPacket,this._regIDs[i].arg);
        } catch (e) { this.oDbg.log(e.name+": "+ e.message); }
        this._unregisterPID(pID);
        return true;
      }
    }
    return false;
  };
  this._handleResponse = JSJaCHandleResponse;
  this._parseStreamFeatures = JSJaCParseStreamFeatures;
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
  this._setStatus = function(status) {
    if (!status || status == '')
      return;
    if (status != this._status) { // status changed!
      this._status = status;
      this._handleEvent('status_changed', status);
    }
  }
  this._unregisterPID = function(pID) {
    if (!this._regIDs[pID])
      return false;
    this._regIDs[pID] = null;
    this.oDbg.log("unregistered "+pID,3);
    return true;
  };

}

/*** *** *** START AUTH STUFF *** *** ***/

function JSJaCParseStreamFeatures(doc) {
  if (!doc || !doc.xml) {
    this.oDbg.log("nothing to parse ... aborting",1);
    return false;
  }
  this.oDbg.log(doc.xml,2);

  this.mechs = new Object(); 
  var lMec1 = doc.getElementsByTagName("mechanisms");
  this.has_sasl = false;
  for (var i=0; i<lMec1.length; i++)
    if (lMec1.item(i).getAttribute("xmlns") == "urn:ietf:params:xml:ns:xmpp-sasl") {
      this.has_sasl=true;
      var lMec2 = lMec1.item(i).getElementsByTagName("mechanism");
      for (var j=0; j<lMec2.length; j++)
        this.mechs[lMec2.item(j).firstChild.nodeValue] = true;
      break;
    }
  if (this.has_sasl)
    this.oDbg.log("SASL detected",2);
  else {
    this.authtype = 'nonsasl';
    this.oDbg.log("No support for SASL detected",2);
  }

  /* [TODO] 
   * check if in-band registration available
   * check for session and bind features
   */
}

function JSJaCInBandReg() {
  if (this.authtype == 'saslanon' || this.authtype == 'anonymous')
    return; // bullshit - no need to register if anonymous

  /* ***
   * In-Band Registration see JEP-0077
   */

  var iq = new JSJaCIQ();
  iq.setType('set');
  iq.setID('reg1');
  var query = iq.setQuery('jabber:iq:register');
  query.appendChild(iq.getDoc().createElement('username')).appendChild(iq.getDoc().createTextNode(this.username));
  query.appendChild(iq.getDoc().createElement('password')).appendChild(iq.getDoc().createTextNode(this.pass));

  this.send(iq,this._doInBandRegDone);
}

function JSJaCInBandRegDone(iq) {
  if (iq && iq.getType() == 'error') { // we failed to register
    oCon.oDbg.log("registration failed for "+oCon.username,0);
    oCon._handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
    return;
  }

  oCon.oDbg.log(oCon.username + " registered succesfully",0);

  oCon._doAuth();
}

function JSJaCAuth() {
  if (this.has_sasl && this.authtype == 'nonsasl')
    this.oDbg.log("Warning: SASL present but not used", 1);

  if (!this._doSASLAuth() && 
      !this._doLegacyAuth()) {
    this.oDbg.log("Auth failed for authtype "+this.authtype,1);
    this.disconnect();
    return false;
  }
  return true;
}

/*** *** *** LEGACY AUTH *** *** ***/

function JSJaCLegacyAuth() {
  if (this.authtype != 'nonsasl' && this.authtype != 'anonymous')
    return false;

  /* ***
   * Non-SASL Authentication as described in JEP-0078
   */
  var iq = new JSJaCIQ();
  iq.setIQ(oCon.server,null,'get','auth1');
  var query = iq.setQuery('jabber:iq:auth');
  query.appendChild(iq.getDoc().createElement('username')).appendChild(iq.getDoc().createTextNode(oCon.username));

  this.send(iq,this._doLegacyAuth2);
  return true;
}

function JSJaCLegacyAuth2(iq) {
  if (!iq || iq.getType() != 'result') {
    if (iq.getType() == 'error') 
      oCon._handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
    oCon.disconnect();
    return;
  } 

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
  } else if (oCon.allow_plain) { // use plaintext auth
    query.appendChild(iq.getDoc().createElement('password')).appendChild(iq.getDoc().createTextNode(oCon.pass));
  } else {
    oCon.oDbg.log("no valid login mechanism found",1);
    oCon.disconnect();
    return false;
  }

  oCon.send(iq,oCon._doLegacyAuthDone);
}

/* ***
 * check if auth' was successful
 */
function JSJaCLegacyAuthDone(iq) {
  if (iq.getType() != 'result') { // auth' failed
    if (iq.getType() == 'error')
      oCon._handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
    oCon.disconnect();
  } else
    oCon._handleEvent('onconnect');
}

/*** *** *** END LEGACY AUTH *** *** ***/

/*** *** *** SASL AUTH *** *** ***/

function JSJaCSASLAuth() {
  if (this.authtype == 'nonsasl' || this.authtype == 'anonymous')
    return false;

  if (this.authtype == 'saslanon') {
    if (this.mechs['ANONYMOUS']) {
      this.oDbg.log("SASL using mechanism 'ANONYMOUS'",2);
      return this._sendRaw("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='ANONYMOUS'/>",
                           '_doSASLAuthDone');
    }
    this.oDbg.log("SASL ANONYMOUS requested but not supported",1);
  } else {
    if (this.mechs['DIGEST-MD5']) {
      this.oDbg.log("SASL using mechanism 'DIGEST-MD5'",2);
      return this._sendRaw("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='DIGEST-MD5'/>",
                           '_doSASLAuthDigestMd5S1');
    } else if (this.allow_plain && this.mechs['PLAIN']) {
      this.oDbg.log("SASL using mechanism 'PLAIN'",2);
      return this._sendRaw("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>"+ 
                           binb2b64(str2binb(this.username+'@'+
                                             this.domain+String.fromCharCode(0)+
                                             this.username+String.fromCharCode(0)+
                                             this.pass))+"</auth>", 
                           '_doSASLAuthDone');
    }
    this.oDbg.log("No SASL mechanism applied",1);
    this.authtype = 'nonsasl'; // fallback
  }
  return false;
}

function JSJaCSASLAuthDigestMd5S1(req) {
  this.oDbg.log(req.r.responseText,2);

  var doc = oCon._prepareResponse(req);
  if (!doc || doc.getElementsByTagName("challenge").length == 0) {
    this.oDbg.log("challenge missing",1);
    this.disconnect();
  } else {
    var challenge = atob(doc.getElementsByTagName("challenge")
                         .item(0).firstChild.nodeValue);
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
      '",charset=utf-8';
    
    this.oDbg.log("response: "+rPlain,2);

    this._sendRaw("<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"+
                  binb2b64(str2binb(rPlain))+"</response>",
                  '_doSASLAuthDigestMd5S2');
  }
}

function JSJaCSASLAuthDigestMd5S2(req) {
  this.oDbg.log(req.r.responseText,2);

  var doc = this._prepareResponse(req);

  if (doc.firstChild.nodeName == 'failure') {
    this.oDbg.log("auth error: "+doc.firstChild.xml,1);
    this.disconnect();
  }

  var response = atob(doc.firstChild.firstChild.nodeValue)
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

  if (doc.firstChild.nodeName == 'success')
    this._reInitStream(this.domain,'_doStreamBind');
  else // some extra turn
    this._sendRaw("<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>",
                  '_doSASLAuthDone');
}

function JSJaCSASLAuthDone(req) {
  var doc = this._prepareResponse(req);
  if (doc.firstChild.nodeName != 'success') {
    this.oDgb.log("auth failed",1);
    this.disconnect();
  } else
    this._reInitStream(this.domain,'_doStreamBind');
}

function JSJaCStreamBind() {
  iq = new JSJaCIQ();
  iq.setIQ(this.domain,null,'set','bind_1');
  var eBind = iq.getDoc().createElement("bind");
  eBind.setAttribute("xmlns","urn:ietf:params:xml:ns:xmpp-bind");
  eBind.appendChild(iq.getDoc().createElement("resource"))
    .appendChild(iq.getDoc().createTextNode(this.resource));
  iq.getNode().appendChild(eBind);
  this.oDbg.log(iq.xml());
  this.send(iq,this._doXMPPSess);
}

function JSJaCXMPPSess(iq) {
  if (iq.getType() != 'result' || iq.getType() == 'error') { // failed
    oCon.disconnect();
    if (iq.getType() == 'error')
      oCon._handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
    return;
  }
  
  oCon.fulljid = iq.getDoc().firstChild.getElementsByTagName('jid').item(0).firstChild.nodeValue;
  oCon.jid = oCon.fulljid.substring(0,oCon.fulljid.lastIndexOf('/'));
  
  iq = new JSJaCIQ();
  iq.setIQ(this.domain,null,'set','sess_1');
  var eSess = iq.getDoc().createElement("session");
  eSess.setAttribute("xmlns","urn:ietf:params:xml:ns:xmpp-session");
  iq.getNode().appendChild(eSess);
  oCon.oDbg.log(iq.xml());
  oCon.send(iq,oCon._doXMPPSessDone);
}

function JSJaCXMPPSessDone(iq) {
  if (iq.getType() != 'result' || iq.getType() == 'error') { // failed
    oCon.disconnect();
    if (iq.getType() == 'error')
      oCon._handleEvent('onerror',iq.getNode().getElementsByTagName('error').item(0));
    return;
  } else
    oCon._handleEvent('onconnect');
}

/*** *** *** END SASL AUTH *** *** ***/

/*** *** *** END AUTH STUFF *** *** ***/

function JSJaCSendRaw(xml,cb,arg) 
{
  var slot = this._getFreeSlot();
  this._req[slot] = this._setupRequest(true);
  
  this._req[slot].r.onreadystatechange = function() {
    if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
      return;
    if (oCon._req[slot].r.readyState == 4) {
      oCon.oDbg.log("async recv: "+oCon._req[slot].r.responseText,4);
      if (typeof(cb) != 'undefined')
        eval("oCon."+cb+"(oCon._req[slot],"+arg+")");
    }
  }
  
  if (typeof(this._req[slot].r.onerror) != 'undefined') {
    this._req[slot].r.onerror = function(e) {
      if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
        return;
      oCon.oDbg.log('XmlHttpRequest error',1);
      return false;
    }
  }
  
  var reqstr = this._getRequestString(xml);
  this.oDbg.log("sending: " + reqstr,4);
  this._req[slot].r.send(reqstr);
  return true;
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

  if (typeof(this._req[slot]) != 'undefined' && typeof(this._req[slot].r) != 'undefined' && this._req[slot].r.readyState != 4) {
    this.oDbg.log("Slot "+slot+" is not ready");
    return;
  }
		
  if (!this.isPolling() && this._pQueue.length == 0 && this._req[(slot+1)%2] && this._req[(slot+1)%2].r.readyState != 4)
    return;

  if (!this.isPolling())
    this.oDbg.log("Found working slot at "+slot,2);

  this._req[slot] = this._setupRequest(true);

  /* setup onload handler for async send */
  this._req[slot].r.onreadystatechange = function() {
    if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
      return;
    oCon.oDbg.log("ready state changed for slot "+slot+" ["+oCon._req[slot].r.readyState+"]",4);
    if (oCon._req[slot].r.readyState == 4) {
      oCon._setStatus('processing');
      oCon.oDbg.log("async recv: "+oCon._req[slot].r.responseText,4);
      oCon._handleResponse(oCon._req[slot]);
      if (oCon._pQueue.length)
        oCon._process();
      else // schedule next tick
        oCon._timeout = setTimeout("oCon._process()",oCon.getPollInterval());

    }
  };

  if (typeof(this._req[slot].r.onerror) != 'undefined') {
    this._req[slot].r.onerror = function(e) {
      if (typeof(oCon) == 'undefined' || !oCon || !oCon.connected())
        return;
      oCon._errcnt++;
      oCon.oDbg.log('XmlHttpRequest error ('+oCon._errcnt+')',1);
      if (oCon._errcnt > JSJAC_ERR_COUNT) {

        // abort
        oCon._abort();
        return false;
      }

      oCon._setStatus('onerror_fallback');
				
      // schedule next tick
      setTimeout("oCon._resume()",oCon.getPollInterval());
      return false;
    };
  }

  var reqstr = this._getRequestString();

  if (typeof(this._rid) != 'undefined') // remember request id if any
    this._req[slot].rid = this._rid;

  this.oDbg.log("sending: " + reqstr,4);
  this._req[slot].r.send(reqstr);
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

  this._req[slot].r.onreadystatechange = function() {
    if (typeof(oCon) == 'undefined' || !oCon)
      return;
    if (oCon._req[slot].r.readyState == 4) {
      oCon.oDbg.log("async recv: "+oCon._req[slot].r.responseText,4);
      oCon._getStreamID(slot); // handle response
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

  var reqstr = this._getRequestString();
  this.oDbg.log("sending: " + reqstr,4);
  this._req[slot].r.send(reqstr);
}

function JSJaCHandleResponse(req) {
  var rootEl = this._prepareResponse(req);

  if (!rootEl)
    return null;

  this.oDbg.log("childNodes: "+rootEl.childNodes.length,3);
  for (var i=0; i<rootEl.childNodes.length; i++) {
    this.oDbg.log("rootEl.childNodes.item("+i+").nodeName: "+rootEl.childNodes.item(i).nodeName,3);
    this._inQ = this._inQ.concat(rootEl.childNodes.item(i));
  }
  return null;
}

function JSJaCCheckInQ() {
  for (var i=0; i<this._inQ.length && i<10; i++) {
    var item = this._inQ[0];
    this._inQ = this._inQ.slice(1,this._inQ.length);
    var aJSJaCPacket = JSJaCPWrapNode(item);
    if (typeof(aJSJaCPacket.pType) != 'undefined')
      if (!this._handlePID(aJSJaCPacket))
        this._handleEvent(aJSJaCPacket.pType(),aJSJaCPacket);
  }
  // 	this._inQto = setTimeout("oCon._checkInQ();",JSJaC_CheckInQueueInterval);
}

function JSJaCAbort() {
  clearTimeout(this._timeout); // remove timer
  this._connected = false;

  this._setStatus('aborted');

  this.oDbg.log("Disconnected.",1);
  this._handleEvent('ondisconnect');
  this._handleEvent('onerror',JSJaCError('500','cancel','service-unavailable'));
}

/* ***
 * an error packet for internal use
 */
function JSJaCError(code,type,condition) {
  var xmldoc = XmlDocument.create("error","jsjac");

  xmldoc.documentElement.setAttribute('code',code);
  xmldoc.documentElement.setAttribute('type',type);
  xmldoc.documentElement.appendChild(xmldoc.createElement(condition)).setAttribute('xmlns','urn:ietf:params:xml:ns:xmpp-stanzas');
  return xmldoc.documentElement.cloneNode(true);
}

/* ***
 * set of sha1 hash keys for securing sessions
 */											
function JSJaCKeys(func,oDbg) {
  var seed = Math.random();

  this._k = new Array();
  this._k[0] = seed.toString();
  this.oDbg = oDbg;

  if (func) {
    for (var i=1; i<JSJaC_NKEYS; i++) {
      this._k[i] = func(this._k[i-1]);
      oDbg.log(i+": "+this._k[i],4);
    }
  }

  this._indexAt = JSJaC_NKEYS-1;
  this.getKey = function() { 
    return this._k[this._indexAt--]; 
  };
  this.lastKey = function() { return (this._indexAt == 0); };
  this.size = function() { return this._k.length; };

  this._getSuspendVars = function() {
    return ('_k,_indexAt').split(',');
  }
}
