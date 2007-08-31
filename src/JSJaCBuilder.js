
/**
 * @private
 * This code is taken from {@link
 * http://wiki.script.aculo.us/scriptaculous/show/Builder
 * script.aculo.us' Dom Builder} and has been modified to suit our
 * needs.<br/> 
 * The original parts of the code do have the following
 * copyright and license notice:<br/> 
 * Copyright (c) 2005, 2006 Thomas Fuchs (http://script.aculo.us, 
 * http://mir.acu lo.us) <br/>
 * script.aculo.us is freely distributable under the terms of an
 * MIT-style license.<br>
 * For details, see the script.aculo.us web site: 
 * http://script.aculo.us/<br>
 */
var JSJaCBuilder = {
  /**
   * @private
   */
  buildNode: function(doc, elementName) {

    var element;

    // attributes (or text)
    if(arguments[2])
      if(JSJaCBuilder._isStringOrNumber(arguments[2]) ||
         (arguments[2] instanceof Array)) {
        element = doc.createElement(elementName);
        JSJaCBuilder._children(doc, element, arguments[2]);
      } else {
        if (arguments[2]['xmlns']) {
          try {
            element = doc.createElementNS(arguments[2]['xmlns'],elementName);
          } catch(e) { element = doc.createElement(elementName); }
        } else
          element = doc.createElement(elementName);
        for(attr in arguments[2]) {
          if (arguments[2].hasOwnProperty(attr)) {
            if (attr == 'xmlns' && element.namespaceURI == attr)
              continue;
            element.setAttribute(attr, arguments[2][attr]);
          }
        }
            
      }
    else
      element = doc.createElement(elementName);    
    // text, or array of children
    if(arguments[3])
      JSJaCBuilder._children(doc, element, arguments[3]);
    
    return element;
  },

  /**
   * @private
   */
  _text: function(doc, text) {
    return doc.createTextNode(text);
  },

  /**
   * @private
   */
  _children: function(doc, element, children) {
    if(typeof children=='object') { // array can hold nodes and text
      for (var i in children) {
        if (children.hasOwnProperty(i)) {
          var e = children[i];
          if (typeof e=='object') {
            if (e instanceof Array) {
              var node = JSJaCBuilder.buildNode(doc, e[0], e[1], e[2]);
              element.appendChild(node);
            } else {
              element.appendChild(e);
            }
          } else {
            if(JSJaCBuilder._isStringOrNumber(e)) {
              element.appendChild(JSJaCBuilder._text(doc, e));
            }
          }
        }
      }
    } else {
      if(JSJaCBuilder._isStringOrNumber(children)) {
        element.appendChild(JSJaCBuilder._text(doc, children));
      }
    }
  },
  
  _attributes: function(attributes) {
    var attrs = [];
    for(attribute in attributes)
      if (attributes.hasOwnProperty(attribute))
        attrs.push(attribute +
          '="' + attributes[attribute].toString().htmlEnc() + '"');
    return attrs.join(" ");
  },
  
  _isStringOrNumber: function(param) {
    return(typeof param=='string' || typeof param=='number');
  }
};
