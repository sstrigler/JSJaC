/* Copyright 2003-2006 Peter-Paul Koch
 *           2006-2008 Stefan Strigler
 */

/**
 * @fileoverview OO interface to handle cookies.
 * Taken from {@link http://www.quirksmode.org/js/cookies.html
 * http://www.quirksmode.org/js/cookies.html}
 * Regarding licensing of this code the author states:
 *
 * "You may copy, tweak, rewrite, sell or lease any code example on
 * this site, with one single exception."
 *
 * @author Stefan Strigler
 * @version $Revision$
 */

/**
 * Creates a new Cookie
 * @class Class representing browser cookies for storing small amounts of data
 * @constructor
 * @param {String} name   The name of the value to store
 * @param {String} value  The value to store
 * @param {int}    secs   Number of seconds until cookie expires (may be empty)
 * @param {String} domain The domain for the cookie
 * @param {String} path   The path of cookie
 */
function JSJaCCookie(name,value,secs,domain,path)
{
  if (window == this)
    return new JSJaCCookie(name, value, secs, domain, path);

  /**
   * This cookie's name
   * @type String
   */
  this.name = name;
  /**
   * This cookie's value
   * @type String
   */
  this.value = value;
  /**
   * Time in seconds when cookie expires (thus being delete by
   * browser). A value of -1 denotes a session cookie which means that
   * stored data gets lost when browser is being closed. 
   * @type int
   */
  this.secs = secs;

  /**
   * The cookie's domain
   * @type string
   */
  this.domain = domain;

  /**
   * The cookie's path
   * @type string
   */
  this.path = path;

  /**
   * Stores this cookie
   */
  this.write = function() {
    if (this.secs) {
      var date = new Date();
      date.setTime(date.getTime()+(this.secs*1000));
      var expires = "; expires="+date.toGMTString();
    } else
      var expires = "";
    var domain = this.domain?"; domain="+this.domain:"";
    var path = this.path?"; path="+this.path:"; path=/";
    document.cookie = this.getName()+"="+JSJaCCookie._escape(this.getValue())+
      expires+
      domain+
      path;
  };
  /**
   * Deletes this cookie
   */
  this.erase = function() {
    var c = new JSJaCCookie(this.getName(),"",-1);
    c.write();
  };

  /**
   * Gets the name of this cookie
   * @return The name
   * @type String
   */
  this.getName = function() {
    return this.name;
  };
 
  /**
   * Sets the name of this cookie
   * @param {String} name The name for this cookie
   * @return This cookie
   * @type Cookie
   */
  this.setName = function(name) {
    this.name = name;
    return this;
  };

  /**
   * Gets the value of this cookie
   * @return The value
   * @type String
   */
  this.getValue = function() {
    return this.value;
  };
 
  /**
   * Sets the value of this cookie
   * @param {String} value The value for this cookie
   * @return This cookie
   * @type Cookie
   */
  this.setValue = function(value) {
    this.value = value;
    return this;
  };

  /**
   * Sets the domain of this cookie
   * @param {String} domain The value for the domain of the cookie
   * @return This cookie
   * @type Cookie
   */
  this.setDomain = function(domain) {
    this.domain = domain;
    return this;
  };

  /**
   * Sets the path of this cookie
   * @param {String} path The value of the path of the cookie
   * @return This cookie
   * @type Cookie
   */
  this.setPath = function(path) {
    this.path = path;
    return this;
  };
}

/**
 * Reads the value for given <code>name</code> from cookies and return new
 * <code>Cookie</code> object
 * @param {String} name The name of the cookie to read
 * @return A cookie object of the given name
 * @type Cookie
 * @throws CookieException when cookie with given name could not be found
 */
JSJaCCookie.read = function(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) 
      return new JSJaCCookie(
        name, 
        JSJaCCookie._unescape(c.substring(nameEQ.length,c.length)));
  }
  throw new JSJaCCookieException("Cookie not found");
};

/**
 * Reads the value for given <code>name</code> from cookies and returns
 * its valued new
 * @param {String} name The name of the cookie to read
 * @return The value of the cookie read
 * @type String
 * @throws CookieException when cookie with given name could not be found
 */
JSJaCCookie.get = function(name) {
  return JSJaCCookie.read(name).getValue();
};

/**
 * Deletes cookie with given <code>name</code>
 * @param {String} name The name of the cookie to delete
 * @throws CookieException when cookie with given name could not be found
 */
JSJaCCookie.remove = function(name) {
  JSJaCCookie.read(name).erase();
};

/**
 * @private
 */
JSJaCCookie._escape = function(str) {
  return str.replace(/;/g, "%3AB");
}

/**
 * @private
 */
JSJaCCookie._unescape = function(str) {
  return str.replace(/%3AB/g, ";");
}

/**
 * Some exception denoted to dealing with cookies
 * @constructor
 * @param {String} msg The message to pass to the exception
 */
function JSJaCCookieException(msg) {
  this.message = msg;
  this.name = "CookieException";
}
