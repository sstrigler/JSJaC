dojo.provide("jsjac.crypto.sha1");

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
jsjac.crypto.hex_sha1 = function(s){return jsjac.crypto.binb2hex(jsjac.crypto.core_sha1(jsjac.crypto.str2binb(s),s.length * jsjac.crypto.chrsz));};
jsjac.crypto.b64_sha1 = function(s){return jsjac.crypto.binb2b64(jsjac.crypto.core_sha1(jsjac.crypto.str2binb(s),s.length * jsjac.crypto.chrsz));};
jsjac.crypto.str_sha1 = function(s){return jsjac.crypto.binb2str(jsjac.crypto.core_sha1(jsjac.crypto.str2binb(s),s.length * jsjac.crypto.chrsz));};
jsjac.crypto.hex_hmac_sha1 = function(key, data){ return jsjac.crypto.binb2hex(cjsjac.crypto.ore_hmac_sha1(key, data));};
jsjac.crypto.b64_hmac_sha1 = function(key, data){ return jsjac.crypto.binb2b64(jsjac.crypto.core_hmac_sha1(key, data));};
jsjac.crypto.str_hmac_sha1 = function(key, data){ return jsjac.crypto.binb2str(jsjac.crypto.core_hmac_sha1(key, data));};

/*
 * Perform a simple self-test to see if the VM is working
 */
jsjac.crypto.sha1_vm_test = function()
{
  return jsjac.crypto.hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
};

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
jsjac.crypto.core_sha1 = function(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
    {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;
      var olde = e;

      for(var j = 0; j < 80; j++)
        {
          if(j < 16) w[j] = x[i + j];
          else w[j] = jsjac.crypto.rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
          var t = jsjac.crypto.safe_add(jsjac.crypto.safe_add(jsjac.crypto.rol(a, 5), jsjac.crypto.sha1_ft(j, b, c, d)),
                           jsjac.crypto.safe_add(jsjac.crypto.safe_add(e, w[j]), jsjac.crypto.sha1_kt(j)));
          e = d;
          d = c;
          c = jsjac.crypto.rol(b, 30);
          b = a;
          a = t;
        }

      a = jsjac.crypto.safe_add(a, olda);
      b = jsjac.crypto.safe_add(b, oldb);
      c = jsjac.crypto.safe_add(c, oldc);
      d = jsjac.crypto.safe_add(d, oldd);
      e = jsjac.crypto.safe_add(e, olde);
    }
  return Array(a, b, c, d, e);

};

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
jsjac.crypto.sha1_ft = function(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
};

/*
 * Determine the appropriate additive constant for the current iteration
 */
jsjac.crypto.sha1_kt = function(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
    (t < 60) ? -1894007588 : -899497514;
};

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
jsjac.crypto.core_hmac_sha1 = function(key, data)
{
  var bkey = jsjac.crypto.str2binb(key);
  if(bkey.length > 16) bkey = jsjac.crypto.core_sha1(bkey, key.length * jsjac.crypto.chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
    {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }

  var hash = jsjac.crypto.core_sha1(ipad.concat(jsjac.crypto.str2binb(data)), 512 + data.length * jsjac.crypto.chrsz);
  return jsjac.crypto.core_sha1(opad.concat(hash), 512 + 160);
};

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
jsjac.crypto.safe_add = function (x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

/*
 * Bitwise rotate a 32-bit number to the left.
 */
jsjac.crypto.rol = function(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
jsjac.crypto.str2binb = function(str)
{
  var bin = Array();
  var mask = (1 << jsjac.crypto.chrsz) - 1;
  for(var i = 0; i < str.length * jsjac.crypto.chrsz; i += jsjac.crypto.chrsz)
    bin[i>>5] |= (str.charCodeAt(i / jsjac.crypto.chrsz) & mask) << (32 - jsjac.crypto.chrsz - i%32);
  return bin;
};

/*
 * Convert an array of big-endian words to a string
 */
jsjac.crypto.binb2str = function(bin)
{
  var str = "";
  var mask = (1 << jsjac.crypto.chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += jsjac.crypto.chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - jsjac.crypto.chrsz - i%32)) & mask);
  return str;
};

/*
 * Convert an array of big-endian words to a hex string.
 */
jsjac.crypto.binb2hex = function(binarray)
{
  var hex_tab = jsjac.crypto.hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
    {
      str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
        hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
    }
  return str;
};

/*
 * Convert an array of big-endian words to a base-64 string
 */
jsjac.crypto.binb2b64 = function(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
    {
      var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
        | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
        |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
      for(var j = 0; j < 4; j++)
        {
          if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
          else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
        }
    }
  return str;
};
