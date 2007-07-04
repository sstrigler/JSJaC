 /**
   * Gets the 'thread' identifier for this message
   * @return A thread identifier
   * @type String
   */
  this.getThread = function() { return this.getChildVal('thread'); };
  /**
   * Gets the body of this message
   * @return The body of this message
   * @type String
   */
  this.getBody = function() { return this.getChildVal('body'); };
  /**
   * Gets the subject of this message
   * @return The subject of this message
   * @type String
   */
  this.getSubject = function() { return this.getChildVal('subject') };
}

/**
 * Tries to Transform a w3c DOM node to JSJaC's internal representation 
 * (JSJaCPacket type, one of JSJaCPresence, JSJaCMessage, JSJaCIQ)
 * @param: {Node
 * http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247}
 * node The node to be transformed
 * @return A JSJaCPacket representing the given node. If node's root
 * elemenent is not one of 'message', 'presence' or 'iq',
 * <code>null</code> is being returned.
 * @type JSJaCPacket
 */
JSJaCPacket.wrapNode = function(node) {
  var aNode;
  switch (node.nodeName.toLowerCase()) {
  case 'presence':
    aNode = new JSJaCPresence();
    break;
  case 'message':
    aNode = new JSJaCMessage();
    break;
  case 'iq':
    aNode = new JSJaCIQ();
    break;
  default : // unknown
    return null;
  }

  aNode._replaceNode(node);

  return aNode;
}

