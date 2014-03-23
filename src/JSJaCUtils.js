/*exported JSJaCUtils */

/**
 * Various utilities put together so that they don't pollute global
 * name space.
 * @namespace
 */
var JSJaCUtils = {
  /**
   * XOR two strings of equal length.
   * @param {string} s1 first string to XOR.
   * @param {string} s2 second string to XOR.
   * @return {string} s1 ^ s2.
   */
  xor: function(s1, s2) {
    /*jshint bitwise: false */
    if(!s1) {
      return s2;
    }
    if(!s2) {
      return s1;
    }

    var result = '';
    for(var i = 0; i < s1.length; i++) {
      result += String.fromCharCode(s1.charCodeAt(i) ^ s2.charCodeAt(i));
    }
    return result;
  },

  /**
   * Create nonce value of given size.
   * @param {int} size size of the nonce that should be generated.
   * @return {string} generated nonce.
   */
  cnonce: function(size) {
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var cnonce = '';
    for (var i = 0; i < size; i++) {
      cnonce += tab.charAt(Math.round(Math.random(new Date().getTime()) * (tab.length - 1)));
    }
    return cnonce;
  },

  /**
   * Current timestamp.
   * @return Seconds since 1.1.1970.
   * @type int
   */
  now: function() {
    if (Date.now && typeof Date.now == 'function') {
      return Date.now();
    } else {
      return new Date().getTime();
    }
  }

};
