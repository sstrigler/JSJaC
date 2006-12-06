dojo.provide("jsjac.ErrorPacket");

/* ***
 * an error packet for internal use
 */
jsjac.ErrorPacket = function(code,type,condition) {
  var xmldoc = XmlDocument.create("error","jsjac");

  xmldoc.documentElement.setAttribute('code',code);
  xmldoc.documentElement.setAttribute('type',type);
  xmldoc.documentElement.appendChild(xmldoc.createElement(condition)).setAttribute('xmlns','urn:ietf:params:xml:ns:xmpp-stanzas');
  return xmldoc.documentElement.cloneNode(true);
}
