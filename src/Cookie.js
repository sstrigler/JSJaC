/**
 * @fileoverview OO interface to handle cookies.
 * Taken from {@link http://www.quirksmode.org/js/cookies.html 
 * http://www.quirksmode.org/js/cookies.html}
 * @author Stefan Strigler
 * @version $Revision$
 */

/**
 * Creates a new Cookie
 * @class Class representing browser cookies for storing small amounts of data
 * @constructor
 * @param {String} name  The name of the value to store
 * @param {String} value The value to store
 * @param {int}    secs  Number of seconds until cookie expires (may be empty)
 */
function Cookie(name,value,secs)
{
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
  this.expires = secs;

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
    document.cookie = this.name+"="+this.value+expires+"; path=/";
  };
  /**
   * Deletes this cookie
   */
  this.erase = function() {
    var c = new Cookie(this.name,"",-1);
    c.write();
  }
}

/**
 * Reads the value for given <code>name</code> from cookies and return new
 * <code>Cookie</code> object
 * @param {String} name The name of the cookie to read
 * @return A cookie object of the given name
 * @type Cookie
 * @throws CookieException when cookie with given name could not be found
 */
Cookie.read = function(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return new Cookie(name, c.substring(nameEQ.length,c.length));
  }
  throw new CookieException("Cookie not found");
};

/**
 * Some exception denoted to dealing with cookies
 * @constructor
 * @param {String} msg The message to pass to the exception
 */
function CookieException(msg) {
  this.message = msg;
  this.name = "CookieException";
}
