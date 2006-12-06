dojo.provide("jsjac.crypto.extras");

/* #############################################################################
   UTF-8 Decoder and Encoder
   base64 Encoder and Decoder
   written by Tobias Kieslich, justdreams
   Contact: tobias@justdreams.de				http://www.justdreams.de/
   ############################################################################# */

// returns an array of byterepresenting dezimal numbers which represent the
// plaintext in an UTF-8 encoded version. Expects a string.
// This function includes an exception management for those nasty browsers like
// NN401, which returns negative decimal numbers for chars>128. I hate it!!
// This handling is unfortunately limited to the user's charset. Anyway, it works
// in most of the cases! Special signs with an unicode>256 return numbers, which
// can not be converted to the actual unicode and so not to the valid utf-8
// representation. Anyway, this function does always return values which can not
// misinterpretd by RC4 or base64 en- or decoding, because every value is >0 and
// <255!!
// Arrays are faster and easier to handle in b64 encoding or encrypting....
jsjac.crypto.utf8t2d = function(t)
{
  t = t.replace(/\r\n/g,"\n");
  var d=new Array; var test=String.fromCharCode(237);
  if (test.charCodeAt(0) < 0) 
    for(var n=0; n<t.length; n++)
      {
        var c=t.charCodeAt(n);
        if (c>0)
          d[d.length]= c;
        else {
          d[d.length]= (((256+c)>>6)|192);
          d[d.length]= (((256+c)&63)|128);}
      }
  else
    for(var n=0; n<t.length; n++)
      {
        var c=t.charCodeAt(n);
        // all the signs of asci => 1byte
        if (c<128)
          d[d.length]= c;
        // all the signs between 127 and 2047 => 2byte
        else if((c>127) && (c<2048)) {
          d[d.length]= ((c>>6)|192);
          d[d.length]= ((c&63)|128);}
        // all the signs between 2048 and 66536 => 3byte
        else {
          d[d.length]= ((c>>12)|224);
          d[d.length]= (((c>>6)&63)|128);
          d[d.length]= ((c&63)|128);}
      }
  return d;
};
		
// returns plaintext from an array of bytesrepresenting dezimal numbers, which
// represent an UTF-8 encoded text; browser which does not understand unicode
// like NN401 will show "?"-signs instead
// expects an array of byterepresenting decimals; returns a string
jsjac.crypto.utf8d2t = function(d)
{
  var r=new Array; var i=0;
  while(i<d.length)
    {
      if (d[i]<128) {
        r[r.length]= String.fromCharCode(d[i]); i++;}
      else if((d[i]>191) && (d[i]<224)) {
        r[r.length]= String.fromCharCode(((d[i]&31)<<6) | (d[i+1]&63)); i+=2;}
      else {
        r[r.length]= String.fromCharCode(((d[i]&15)<<12) | ((d[i+1]&63)<<6) | (d[i+2]&63)); i+=3;}
    }
  return r.join("");
};

// included in <body onload="b64arrays"> it creates two arrays which makes base64
// en- and decoding faster
// this speed is noticeable especially when coding larger texts (>5k or so)
jsjac.crypto.b64arrays = function() {
  var b64s='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  jsjac.crypto.b64 = new Array();jsjac.crypto.f64 =new Array();
  for (var i=0; i<jsjac.crypto.b64s.length ;i++) {
    jsjac.crypto.b64[i] = jsjac.crypto.b64s.charAt(i);
    jsjac.crypto.f64[jsjac.crypto.b64s.charAt(i)] = i;
  }
}

// creates a base64 encoded text out of an array of byerepresenting dezimals
// it is really base64 :) this makes serversided handling easier
// expects an array; returns a string
jsjac.crypto.b64d2t = function(d) {
  var r=new Array; var i=0; var dl=d.length;
  // this is for the padding
  if ((dl%3) == 1) {
    d[d.length] = 0; d[d.length] = 0;}
  if ((dl%3) == 2)
    d[d.length] = 0;
  // from here conversion
  while (i<d.length)
    {
      r[r.length] = jsjac.crypto.b64[d[i]>>2];
      r[r.length] = jsjac.crypto.b64[((d[i]&3)<<4) | (d[i+1]>>4)];
      r[r.length] = jsjac.crypto.b64[((d[i+1]&15)<<2) | (d[i+2]>>6)];
      r[r.length] = jsjac.crypto.b64[d[i+2]&63];
      if ((i%57)==54)
        r[r.length] = "\n";
      i+=3;
    }
  // this is again for the padding
  if ((dl%3) == 1)
    r[r.length-1] = r[r.length-2] = "=";
  if ((dl%3) == 2)
    r[r.length-1] = "=";
  // we join the array to return a textstring
  var t=r.join("");
  return t;
};

// returns array of byterepresenting numbers created of an base64 encoded text
// it is still the slowest function in this modul I hope I can make it faster
// expects string; returns an array
jsjac.crypto.b64t2d = function(t) {
  var d=new Array; var i=0;
  // here we fix this CRLF sequenz created by MS-OS; arrrgh!!!
  t=t.replace(/\n|\r/g,""); t=t.replace(/=/g,"");
  while (i<t.length)
    {
      d[d.length] = (jsjac.crypto.f64[t.charAt(i)]<<2) | (jsjac.crypto.f64[t.charAt(i+1)]>>4);
      d[d.length] = (((jsjac.crypto.f64[t.charAt(i+1)]&15)<<4) | (jsjac.crypto.f64[t.charAt(i+2)]>>2));
      d[d.length] = (((jsjac.crypto.f64[t.charAt(i+2)]&3)<<6) | (jsjac.crypto.f64[t.charAt(i+3)]));
      i+=4;
    }
  if (t.length%4 == 2)
    d = d.slice(0, d.length-2);
  if (t.length%4 == 3)
    d = d.slice(0, d.length-1);
  return d;
};

jsjac.crypto.cnonce = function(/* integer */size) {
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var cnonce = '';
  for (var i=0; i<size; i++) {
    cnonce += tab.charAt(Math.round(Math.random(new Date().getTime())*(size-1)));
  }
  return cnonce;
};

/* ****
 * provide 'atob' and 'btoa' for all plattforms using methods from above
 * ***
 */

if (typeof(atob) == 'undefined' || typeof(btoa) == 'undefined')
  jsjac.crypto.b64arrays();

if (typeof(atob) == 'undefined') {
  atob = function(s) {
    return jsjac.crypto.utf8d2t(jsjac.crypto.b64t2d(s)); 
  }
}

if (typeof(btoa) == 'undefined') {
  btoa = function(s) { 
    return b64d2t(utf8t2d(s));
  }
}
