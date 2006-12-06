dojo.provide("jsjac.crypto.md5");
dojo.require("jsjac.crypto.common");

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
jsjac.crypto.hex_md5 = function(/* string */s){ return jsjac.crypto.binl2hex(jsjac.crypto.core_md5(jsjac.crypto.str2binl(s), s.length * jsjac.crypto.chrsz));};
jsjac.crypto.b64_md5 = function(/* string */s){ return jsjac.crypto.binl2b64(jsjac.crypto.core_md5(jsjac.crypto.str2binl(s), s.length * jsjac.crypto.chrsz));};
jsjac.crypto.str_md5 = function(/* string */s){ return jsjac.crypto.binl2str(jsjac.crypto.core_md5(jsjac.crypto.str2binl(s), s.length * jsjac.crypto.chrsz));};
jsjac.crypto.hex_hmac_md5 = function(/* string */key, /* string */data) { return jsjac.crypto.binl2hex(jsjac.crypto.core_hmac_md5(key, data)); };
jsjac.crypto.b64_hmac_md5 = function(/* string */key, /* string */data) { return jsjac.crypto.binl2b64(jsjac.crypto.core_hmac_md5(key, data)); };
jsjac.crypto.str_hmac_md5 = function(/* string */key, /* string */data) { return jsjac.crypto.binl2str(jsjac.crypto.core_hmac_md5(key, data)); };

/*
 * Perform a simple self-test to see if the VM is working
 */
jsjac.crypto.md5_vm_test = function()
{
  return jsjac.crypto.hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
};

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
jsjac.crypto.core_md5 = function(/* string */x, /* integer */len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = jsjac.crypto.md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = jsjac.crypto.md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = jsjac.crypto.md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = jsjac.crypto.md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = jsjac.crypto.md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = jsjac.crypto.md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = jsjac.crypto.md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = jsjac.crypto.md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = jsjac.crypto.md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = jsjac.crypto.md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = jsjac.crypto.md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = jsjac.crypto.md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = jsjac.crypto.md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = jsjac.crypto.md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = jsjac.crypto.md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = jsjac.crypto.md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = jsjac.crypto.md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = jsjac.crypto.md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = jsjac.crypto.md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = jsjac.crypto.md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = jsjac.crypto.md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = jsjac.crypto.md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = jsjac.crypto.md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = jsjac.crypto.md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = jsjac.crypto.md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = jsjac.crypto.md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = jsjac.crypto.md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = jsjac.crypto.md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = jsjac.crypto.md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = jsjac.crypto.md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = jsjac.crypto.md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = jsjac.crypto.md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = jsjac.crypto.md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = jsjac.crypto.md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = jsjac.crypto.md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = jsjac.crypto.md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = jsjac.crypto.md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = jsjac.crypto.md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = jsjac.crypto.md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = jsjac.crypto.md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = jsjac.crypto.md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = jsjac.crypto.md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = jsjac.crypto.md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = jsjac.crypto.md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = jsjac.crypto.md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = jsjac.crypto.md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = jsjac.crypto.md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = jsjac.crypto.md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = jsjac.crypto.md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = jsjac.crypto.md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = jsjac.crypto.md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = jsjac.crypto.md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = jsjac.crypto.md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = jsjac.crypto.md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = jsjac.crypto.md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = jsjac.crypto.md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = jsjac.crypto.md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = jsjac.crypto.md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = jsjac.crypto.md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = jsjac.crypto.md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = jsjac.crypto.md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = jsjac.crypto.md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = jsjac.crypto.md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = jsjac.crypto.md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = jsjac.crypto.safe_add(a, olda);
    b = jsjac.crypto.safe_add(b, oldb);
    c = jsjac.crypto.safe_add(c, oldc);
    d = jsjac.crypto.safe_add(d, oldd);
  }
  return Array(a, b, c, d);

};

/*
 * These functions implement the four basic operations the algorithm uses.
 */
jsjac.crypto.md5_cmn = function(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
};
jsjac.crypto.md5_ff = function(a, b, c, d, x, s, t)
{
  return jsjac.crypto.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
};
jsjac.crypto.md5_gg = function(a, b, c, d, x, s, t)
{
  return jsjac.crypto.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
};
jsjac.crypto.md5_hh = function(a, b, c, d, x, s, t)
{
  return jsjac.crypto.md5_cmn(b ^ c ^ d, a, b, x, s, t);
};
jsjac.crypto.md5_ii = function(a, b, c, d, x, s, t)
{
  return jsjac.crypto.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
};

/*
 * Calculate the HMAC-MD5, of a key and some data
 */
jsjac.crypto.core_hmac_md5 = function(key, data)
{
  var bkey = jsjac.crypto.str2binl(key);
  if(bkey.length > 16) bkey = jsjac.crypto.core_md5(bkey, key.length * jsjac.crypto.chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = jsjac.crypto.core_md5(ipad.concat(jsjac.crypto.str2binl(data)), 512 + data.length * jsjac.crypto.chrsz);
  return jsjac.crypto.core_md5(opad.concat(hash), 512 + 128);
};

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
jsjac.crypto.safe_add = function(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

/*
 * Bitwise rotate a 32-bit number to the left.
 */
jsjac.crypto.bit_rol = function(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert a string to an array of little-endian words
 * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
 */
jsjac.crypto.str2binl = function(str)
{
  var bin = Array();
  var mask = (1 << jsjac.crypto.chrsz) - 1;
  for(var i = 0; i < str.length * jsjac.crypto.chrsz; i += jsjac.crypto.chrsz)
    bin[i>>5] |= (str.charCodeAt(i / jsjac.crypto.chrsz) & mask) << (i%32);
  return bin;
};

/*
 * Convert an array of little-endian words to a string
 */
jsjac.crypto.binl2str = function(bin)
{
  var str = "";
  var mask = (1 << jsjac.crypto.chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += jsjac.crypto.chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
  return str;
};

/*
 * Convert an array of little-endian words to a hex string.
 */
jsjac.crypto.binl2hex = function(binarray)
{
  var hex_tab = jsjac.crypto.hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
  }
  return str;
};

/*
 * Convert an array of little-endian words to a base-64 string
 */
jsjac.crypto.binl2b64 = function(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += jsjac.crypto.b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
};

