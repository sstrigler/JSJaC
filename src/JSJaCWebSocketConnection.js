/**
 * @author Janusz Dziemidowicz rraptorr@nails.eu.org
 * @fileoverview All stuff related to WebSocket
 * <pre>
 * The WebSocket protocol is a bit of a mess. Various, incompatible,
 * protocol drafts were implemented in browsers. Fortunately, recently
 * a finished protocol was released in RFC6455. Further description
 * assumes RFC6455 WebSocket protocol version.
 *
 * WebSocket browser support. Current (April 2012) browser status:
 * - Chrome 16+ - works properly and supports RFC6455
 * - Firefox 11+ - works properly and support RFC6455, but has
 *   problems with proxies (see bugs 713026 and 713023)
 * - Opera 11.62 - supports only very old draft and is disabled by
 *   default, in short: does not work
 * - Internet Explorer 10+ - RFC6455 is supported since PP5
 *
 * Due to the above status, this code currently only works on Chrome
 * 16+ and Firefox 11+, but due to proxy problems on Firefox it is
 * recommended to use it only on Chrome.
 *
 * Please also note that some users are only able to connect to ports
 * 80 and 443. Port 80 is sometimes intercepted by transparent HTTP
 * proxies, which mostly does not support WebSocket, so port 443 is
 * the best choice currently (it does not have to be
 * encrypted). WebSocket also usually does not work well with reverse
 * proxies, be sure to make extensive tests if you use one.
 *
 * There is no standard for XMPP over WebSocket. However, there is an
 * expired draft
 * (http://tools.ietf.org/html/draft-moffitt-xmpp-over-websocket-00)
 * and this implementation follows it.
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
 * - Tigase (http://www.tigase.org/) - no known work on WebSocket
 *   support
 * </pre>
 */

/**
 * Instantiates a WebSocket session.
 * @class Implementation of {@link http://tools.ietf.org/html/draft-moffitt-xmpp-over-websocket-00 | An XMPP Sub-protocol for WebSocket}.
 * @extends JSJaCConnection
 * @constructor
 * @param oArg connection properties.
 * @param oArg.httpbase WebSocket connection endpoint (i.e. ws://localhost:5280)
 * @param [oArg.allow_plain] controls if plaintext authentication is
 * allowed.
 * @param [oArg.oDbg] a reference to a debugger interface.
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

JSJaCWebSocketConnection.prototype.connect = function(oArg) {
  this._setStatus('connecting');

  this.domain = oArg.domain || 'localhost';
  this.username = oArg.username;
  this.resource = oArg.resource;
  this.pass = oArg.pass;
  this.register = oArg.register;

  this.authhost = oArg.authhost || this.domain;
  this.authtype = oArg.authtype || 'sasl';

  this.jid = this.username + '@' + this.domain;
  this.fulljid = this.jid + '/' + this.resource;

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

JSJaCWebSocketConnection.prototype.disconnect = function() {
  this._setStatus('disconnecting');

  if (!this.connected()) {
    return;
  }
  this._connected = false;

  this.oDbg.log('Disconnecting', 4);
  this._cleanupWebSocket();

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
    this._registerPID(packet.getID(), cb, arg);
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

JSJaCWebSocketConnection.prototype.resume = function() {
  return false; // not supported for websockets
};

JSJaCWebSocketConnection.prototype.suspend = function() {
  return false; // not supported for websockets
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
  if (cb) {
    this._ws.onmessage = JSJaC.bind(cb, this, arg);
  }

  this._ws.send(xml);
  return true;
};
