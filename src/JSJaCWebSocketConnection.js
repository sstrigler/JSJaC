/**
 * @author Janusz Dziemidowicz rraptorr@nails.eu.org
 * @fileoverview All stuff related to WebSocket
 * <pre>
 * The WebSocket protocol is a bit of a mess. Various, incompatible,
 * protocol drafts were implemented in browsers. Fortunately, recently
 * a finished protocol was released in RFC6455. Further description
 * assumes RFC6455 WebSocket protocol version.
 *
 * WebSocket browser support. Current (November 2012) browser status:
 * - Chrome 16+ - works properly and supports RFC6455
 * - Firefox 16+ - works properly and support RFC6455 (ealier versions
 *   have problems with proxies)
 * - Opera 12.10 - supports RFC6455, but does not work at all if a
 *   proxy is configured (earlier versions do not support RFC6455)
 * - Internet Explorer 10+ - works properly and supports RFC6455
 *
 * Due to the above status, this code is currently recommended on
 * Chrome 16+, Firefox 16+ and Internet Explorer 10+. Using it on
 * other browsers is discouraged.
 *
 * Please also note that some users are only able to connect to ports
 * 80 and 443. Port 80 is sometimes intercepted by transparent HTTP
 * proxies, which mostly does not support WebSocket, so port 443 is
 * the best choice currently (it does not have to be
 * encrypted). WebSocket also usually does not work well with reverse
 * proxies, be sure to make extensive tests if you use one.
 *
 * There is no standard for XMPP over WebSocket. However, there is a
 * draft (http://tools.ietf.org/html/draft-ietf-xmpp-websocket-00) and
 * this implementation follows it.
 *
 * Tested servers:
 *
 * - node-xmpp-bosh (https://github.com/dhruvbird/node-xmpp-bosh) -
 *   supports RFC6455 and works with no problems since 0.6.1, it also
 *   transparently uses STARTTLS if necessary
 * - wxg (https://github.com/Gordin/wxg) - supports RFC6455 and works
 *   with no problems, but cannot connect to servers requiring
 *   STARTTLS (original wxg at https://github.com/hocken/wxg has some
 *   issues, that were fixed by Gordin).
 * - ejabberd-websockets
 *   (https://github.com/superfeedr/ejabberd-websockets) - does not
 *   support RFC6455 hence it does not work, adapting it to support
 *   RFC6455 should be quite easy for anyone knowing Erlang (some work
 *   in progress can be found on github)
 * - Openfire (http://www.igniterealtime.org/projects/openfire/) -
 *   unofficial plugin is available, but it lacks support
 *   for RFC6455 hence it does not work
 * - Apache Vysper (http://mina.apache.org/vysper/) - does
 *   not support RFC6455 hence does not work
 * - Tigase (http://www.tigase.org/) - works fine since 5.2.0.
 * - MongooseIM (https://github.com/esl/ejabberd) - a fork of ejabberd
 *   with support for XMPP over Websockets.
 * </pre>
 */

/*exported JSJaCWebSocketConnection */

/**
 * Instantiates a WebSocket session.
 * @class Implementation of {@link http://tools.ietf.org/html/draft-ietf-xmpp-websocket-00 | An XMPP Sub-protocol for WebSocket}.
 * @extends JSJaCConnection
 * @constructor
 * @param {Object} oArg connection properties.
 * @param {string} oArg.httpbase WebSocket connection endpoint (i.e. ws://localhost:5280)
 * @param {JSJaCDebugger} [oArg.oDbg] A reference to a debugger implementing the JSJaCDebugger interface.
 */
function JSJaCWebSocketConnection(oArg) {
  this.base = JSJaCConnection;
  this.base(oArg);

  this._ws = null;

  this.registerHandler('onerror', JSJaC.bind(this._cleanupWebSocket, this));
}

JSJaCWebSocketConnection.prototype = new JSJaCConnection();

JSJaCWebSocketConnection.prototype._cleanupWebSocket = function() {
  if (this._ws !== null) {
    this._ws.onclose = null;
    this._ws.onerror = null;
    this._ws.onopen = null;
    this._ws.onmessage = null;

    this._ws.close();
    this._ws = null;
  }
};

/**
 * Connect to a jabber/XMPP server.
 * @param {Object} oArg The configuration to be used for connecting.
 * @param {string} oArg.domain The domain name of the XMPP service.
 * @param {string} oArg.username The username (nodename) to be logged in with.
 * @param {string} oArg.resource The resource to identify the login with.
 * @param {string} oArg.password The user's password.
 * @param {string} [oArg.authzid] Authorization identity. Used to act as another user, in most cases not needed and rarely supported by servers. If present should be a bare JID (user@example.net).
 * @param {boolean} [oArg.allow_plain] Whether to allow plain text logins.
 * @param {boolean} [oArg.allow_scram] Whether to allow SCRAM-SHA-1 authentication. Please note that it is quite slow, do some testing on all required browsers before enabling.
 * @param {boolean} [oArg.register] Whether to register a new account.
 * @param {string} [oArg.authhost] The host that handles the actualy authorization. There are cases where this is different from the settings above, e.g. if there's a service that provides anonymous logins at 'anon.example.org'.
 * @param {string} [oArg.authtype] Must be one of 'sasl' (default), 'nonsasl', 'saslanon', or 'anonymous'.
 * @param {string} [oArg.xmllang] The requested language for this login. Typically XMPP server try to respond with error messages and the like in this language if available.
 */
JSJaCWebSocketConnection.prototype.connect = function(oArg) {
  this._setStatus('connecting');

  this.domain = oArg.domain || 'localhost';
  this.username = oArg.username;
  this.resource = oArg.resource;
  this.pass = oArg.password || oArg.pass;
  this.authzid = oArg.authzid || '';
  this.register = oArg.register;

  this.authhost = oArg.authhost || this.domain;
  this.authtype = oArg.authtype || 'sasl';

  this.jid = this.username + '@' + this.domain;
  this.fulljid = this.jid + '/' + this.resource;

  if (oArg.allow_plain) {
    this._allow_plain = oArg.allow_plain;
  } else {
    this._allow_plain = JSJAC_ALLOW_PLAIN;
  }

  if (oArg.allow_scram) {
    this._allow_scram = oArg.allow_scram;
  } else {
    this._allow_scram = JSJAC_ALLOW_SCRAM;
  }

  if (oArg.xmllang && oArg.xmllang !== '') {
    this._xmllang = oArg.xmllang;
  } else {
    this._xmllang = 'en';
  }

  if (typeof WebSocket === 'undefined') {
    this._handleEvent('onerror', JSJaCError('503', 'cancel', 'service-unavailable'));
    return;
  }

  this._ws = new WebSocket(this._httpbase, 'xmpp');
  this._ws.onclose = JSJaC.bind(this._onclose, this);
  this._ws.onerror = JSJaC.bind(this._onerror, this);
  this._ws.onopen = JSJaC.bind(this._onopen, this);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._onopen = function() {
  var reqstr = this._getInitialRequestString();

  this.oDbg.log(reqstr, 4);

  this._ws.onmessage = JSJaC.bind(this._handleOpenStream, this);
  this._ws.send(reqstr);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._handleOpenStream = function(event) {
  var open, stream;

  this.oDbg.log(event.data, 4);

  open = event.data;
  // skip XML prolog if any
  open = open.substr(open.indexOf('<stream:stream'));
  if (open.substr(-2) !== '/>' && open.substr(-16) !== '</stream:stream>') {
    // some servers send closed opening tag, some not
    open += '</stream:stream>';
  }
  stream = this._parseXml(open);
  if(!stream) {
    this._handleEvent('onerror', JSJaCError('503', 'cancel', 'service-unavailable'));
    return;
  }

  // extract stream id used for non-SASL authentication
  this.streamid = stream.getAttribute('id');

  this.oDbg.log('got streamid: ' + this.streamid, 2);
  this._ws.onmessage = JSJaC.bind(this._handleInitialResponse, this);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._handleInitialResponse = function(event) {
  var doc = this._parseXml(event.data);
  if (!this._parseStreamFeatures(doc)) {
    this._handleEvent('onerror', JSJaCError('503', 'cancel', 'service-unavailable'));
    return;
  }

  this._connected = true;

  if (this.register) {
    this._doInBandReg();
  } else {
    this._doAuth();
  }
};

/**
 * Disconnect from XMPP service
 *
 * When called upon leaving a page needs to use 'onbeforeunload' event
 * as Websocket would be closed already otherwise prior to this call.
 */
JSJaCWebSocketConnection.prototype.disconnect = function() {
  this._setStatus('disconnecting');

  if (!this.connected()) {
    return;
  }
  this._connected = false;

  this.oDbg.log('Disconnecting', 4);
  this._sendRaw('</stream:stream>', JSJaC.bind(this._cleanupWebSocket, this));

  this.oDbg.log('Disconnected', 2);
  this._handleEvent('ondisconnect');
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._onclose = function() {
  this.oDbg.log('websocket closed', 2);
  if (this._status !== 'disconnecting') {
    this._connected = false;
    this._handleEvent('onerror', JSJaCError('503', 'cancel', 'service-unavailable'));
  }
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._onerror = function() {
  this.oDbg.log('websocket error', 1);
  this._connected = false;
  this._handleEvent('onerror', JSJaCError('503', 'cancel', 'service-unavailable'));
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._onmessage = function(event) {
  var stanza, node, packet;

  stanza = event.data;
  this._setStatus('processing');
  if (!stanza || stanza === '') {
    return;
  }

  // WebSocket works only on modern browsers, so it is safe to assume
  // that namespaceURI and getElementsByTagNameNS are available.
  node = this._parseXml(stanza);
  if (node.namespaceURI === NS_STREAM && node.localName === 'error') {
    if (node.getElementsByTagNameNS(NS_STREAMS, 'conflict').length > 0) {
      this._setStatus('session-terminate-conflict');
    }
    this._connected = false;
    this._handleEvent('onerror', JSJaCError('503', 'cancel', 'remote-stream-error'));
    return;
  }

  packet = JSJaCPacket.wrapNode(node);
  if (!packet) {
    return;
  }

  this.oDbg.log('async recv: ' + event.data, 4);
  this._handleEvent('packet_in', packet);

  if (packet.pType && !this._handlePID(packet)) {
    this._handleEvent(packet.pType() + '_in', packet);
    this._handleEvent(packet.pType(), packet);
  }
};

/**
 * Parse single XML stanza. As proposed in XMPP Sub-protocol for
 * WebSocket draft, it assumes that every stanza is sent in a separate
 * WebSocket frame, which greatly simplifies parsing.
 * @private
 */
JSJaCWebSocketConnection.prototype._parseXml = function(s) {
  var doc;

  this.oDbg.log('Parsing: ' + s, 4);
  try {
    doc = XmlDocument.create('stream', NS_STREAM);
    if(s.indexOf('<stream:stream') === -1) {
      // Wrap every stanza into stream element, so that XML namespaces work properly.
      doc.loadXML("<stream:stream xmlns:stream='" + NS_STREAM + "' xmlns='jabber:client'>" + s + "</stream:stream>");
      return doc.documentElement.firstChild;
    } else {
      doc.loadXML(s);
      return doc.documentElement;
    }
  } catch (e) {
    this.oDbg.log('Error: ' + e);
    this._connected = false;
    this._handleEvent('onerror', JSJaCError('500', 'wait', 'internal-service-error'));
  }

  return null;
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._getInitialRequestString = function() {
  var streamto, reqstr;

  streamto = this.domain;
  if (this.authhost) {
    streamto = this.authhost;
  }

  reqstr = '<stream:stream to="' + streamto + '" xmlns="jabber:client" xmlns:stream="' + NS_STREAM + '"';
  if (this.authtype === 'sasl' || this.authtype === 'saslanon') {
    reqstr += ' version="1.0"';
  }
  reqstr += '>';
  return reqstr;
};

JSJaCWebSocketConnection.prototype.send = function(packet, cb, arg) {
  this._ws.onmessage = JSJaC.bind(this._onmessage, this);
  if (!packet || !packet.pType) {
    this.oDbg.log('no packet: ' + packet, 1);
    return false;
  }

  if (!this.connected()) {
    return false;
  }

  // remember id for response if callback present
  if (cb) {
    if (!packet.getID()) {
      packet.setID('JSJaCID_' + this._ID++); // generate an ID
    }

    // register callback with id
    this._registerPID(packet, cb, arg);
  }

  try {
    this._handleEvent(packet.pType() + '_out', packet);
    this._handleEvent('packet_out', packet);
    this._ws.send(packet.xml());
  } catch (e) {
    this.oDbg.log(e.toString(), 1);
    return false;
  }

  return true;
};

/**
 * Resuming connections is not supported by WebSocket.
 */
JSJaCWebSocketConnection.prototype.resume = function() {
  return false; // not supported for websockets
};

/**
 * Suspending connections is not supported by WebSocket.
 */
JSJaCWebSocketConnection.prototype.suspend = function() {
  return false; // not supported for websockets
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._doSASLAuthScramSha1S1 = function(event) {
  var el = this._parseXml(event.data);
  return JSJaC.bind(JSJaCConnection.prototype._doSASLAuthScramSha1S1, this)(el);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._doSASLAuthScramSha1S2 = function(event) {
  var el = this._parseXml(event.data);
  return JSJaC.bind(JSJaCConnection.prototype._doSASLAuthScramSha1S2, this)(el);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._doSASLAuthDigestMd5S1 = function(event) {
  var el = this._parseXml(event.data);
  return JSJaC.bind(JSJaCConnection.prototype._doSASLAuthDigestMd5S1, this)(el);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._doSASLAuthDigestMd5S2 = function(event) {
  var el = this._parseXml(event.data);
  return JSJaC.bind(JSJaCConnection.prototype._doSASLAuthDigestMd5S2, this)(el);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._doSASLAuthDone = function(event) {
  var el = this._parseXml(event.data);
  return JSJaC.bind(JSJaCConnection.prototype._doSASLAuthDone, this)(el);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._reInitStream = function(cb) {
  var reqstr, streamto = this.domain;
  if (this.authhost) {
    streamto = this.authhost;
  }

  reqstr = '<stream:stream xmlns:stream="' + NS_STREAM + '" xmlns="jabber:client" to="' + streamto + '" version="1.0">';
  this._sendRaw(reqstr, cb);
};

/**
 * @private
 */
JSJaCWebSocketConnection.prototype._sendRaw = function(xml, cb, arg) {
  if (!this._ws) {
    // Socket might have been closed already because of an 'onerror'
    // event. In this case we'd try to send a closing stream element
    // 'ondisconnect' which won't work.
    return false;
  }
  if (cb) {
    this._ws.onmessage = JSJaC.bind(cb, this, arg);
  }
  this._ws.send(xml);
  return true;
};
