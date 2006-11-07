/* *** *** *** *** *** *** *** *** ***
 * this code is taken from http://webfx.eae.net/dhtml/xmlextras/xmlextras.html 
 * *** *** *** *** *** *** *** *** ***
 */

//<script>
//////////////////
// Helper Stuff //
//////////////////

// used to find the Automation server name
function getDomDocumentPrefix() {
  if (getDomDocumentPrefix.prefix)
    return getDomDocumentPrefix.prefix;
	
  var prefixes = ["MSXML2", "Microsoft", "MSXML", "MSXML3"];
  var o;
  for (var i = 0; i < prefixes.length; i++) {
    try {
      // try to create the objects
      o = new ActiveXObject(prefixes[i] + ".DomDocument");
      return getDomDocumentPrefix.prefix = prefixes[i];
    }
    catch (ex) {};
  }
  
  throw new Error("Could not find an installed XML parser");
}

function getXmlHttpPrefix() {
  if (getXmlHttpPrefix.prefix)
    return getXmlHttpPrefix.prefix;
  
  var prefixes = ["MSXML2", "Microsoft", "MSXML", "MSXML3"];
  var o;
  for (var i = 0; i < prefixes.length; i++) {
    try {
      // try to create the objects
      o = new ActiveXObject(prefixes[i] + ".XmlHttp");
      return getXmlHttpPrefix.prefix = prefixes[i];
    }
    catch (ex) {};
  }
  
  throw new Error("Could not find an installed XML parser");
}

//////////////////////////
// Start the Real stuff //
//////////////////////////


// XmlHttp factory
function XmlHttp() {}

XmlHttp.create = function () {
  try {
    if (window.XMLHttpRequest) {
      var req = new XMLHttpRequest();
      
      // some versions of Moz do not support the readyState property
      // and the onreadystate event so we patch it!
      if (req.readyState == null) {
	req.readyState = 1;
	req.addEventListener("load", function () {
			       req.readyState = 4;
			       if (typeof req.onreadystatechange == "function")
				 req.onreadystatechange();
			     }, false);
      }
      
      return req;
    }
    if (window.ActiveXObject) {
      return new ActiveXObject(getXmlHttpPrefix() + ".XmlHttp");
    }
  }
  catch (ex) {}
  // fell through
  throw new Error("Your browser does not support XmlHttp objects");
};

// XmlDocument factory
function XmlDocument() {}

XmlDocument.create = function (name,ns) {
  name = name || 'foo';
  ns = ns || '';
  try {
    var doc;
    // DOM2
    if (document.implementation && document.implementation.createDocument) {
      doc = document.implementation.createDocument("", "", null);
      // some versions of Moz do not support the readyState property
      // and the onreadystate event so we patch it!
      if (doc.readyState == null) {
	doc.readyState = 1;
	doc.addEventListener("load", function () {
			       doc.readyState = 4;
			       if (typeof doc.onreadystatechange == "function")
				 doc.onreadystatechange();
			     }, false);
      }
    }
    if (window.ActiveXObject)
      doc = new ActiveXObject(getDomDocumentPrefix() + ".DomDocument");
    
    try { 
      if (ns != '')
	doc.appendChild(doc.createElement(name)).setAttribute('xmlns',ns);
      else
	doc.appendChild(doc.createElement(name));
    } catch (dex) { 
      doc = document.implementation.createDocument(ns,name,null);
      
      if (doc.documentElement == null)
	doc.appendChild(doc.createElement(name));
      
      if (ns != '' && 
	  doc.documentElement.getAttribute('xmlns') != ns) // fixes buggy opera 8.5x
	doc.documentElement.setAttribute('xmlns',ns);
    }
    
    return doc;
  }
  catch (ex) { }
  throw new Error("Your browser does not support XmlDocument objects");
};

// Create the loadXML method 
if (typeof(Document) != 'undefined' && window.DOMParser) {

  // XMLDocument did not extend the Document interface in some versions
  // of Mozilla. Extend both!
  //XMLDocument.prototype.loadXML = 
  Document.prototype.loadXML = function (s) {
		
    // parse the string to a new doc	
    var doc2 = (new DOMParser()).parseFromString(s, "text/xml");
		
    // remove all initial children
    while (this.hasChildNodes())
      this.removeChild(this.lastChild);
			
    // insert and import nodes
    for (var i = 0; i < doc2.childNodes.length; i++) {
      this.appendChild(this.importNode(doc2.childNodes[i], true));
    }
  };
 }

// Create xml getter for Mozilla
/* IMPORTANT NOTE
 * Usage of this .xml getter method is deprecated 
 */
if (window.XMLSerializer &&
    window.Node && Node.prototype && Node.prototype.__defineGetter__) {
	
  /*
   * xml getter
   *
   * This serializes the DOM tree to an XML String
   *
   * Usage: var sXml = oNode.xml
   *
   */
  // XMLDocument did not extend the Document interface in some versions
  // of Mozilla. Extend both!
  XMLDocument.prototype.__defineGetter__("xml", function () {
                                           return (new XMLSerializer()).serializeToString(this);
                                         });
  Document.prototype.__defineGetter__("xml", function () {
                                        return (new XMLSerializer()).serializeToString(this);
                                      });
	
  /* doesn't work correctly in mozi, does it?  */
  Node.prototype.__defineGetter__("xml", function () {
                                    return (new XMLSerializer()).serializeToString(this);
                                  });
 }
