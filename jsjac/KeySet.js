dojo.provide("jsjac.KeySet");

/* ***
 * set of sha1 hash keys for securing sessions
 */											
jsjac.KeySet = function(func,oDbg) {
  var seed = Math.random();

  this._k = new Array();
  this._k[0] = seed.toString();
  this.oDbg = oDbg;

  if (func) {
    for (var i=1; i<JSJaC_NKEYS; i++) {
      this._k[i] = func(this._k[i-1]);
      oDbg.log(i+": "+this._k[i],4);
    }
  }

  this._indexAt = JSJaC_NKEYS-1;
  this.getKey = function() { 
    return this._k[this._indexAt--]; 
  };
  this.lastKey = function() { return (this._indexAt == 0); };
  this.size = function() { return this._k.length; };

  this._getSuspendVars = function() {
    return ('_k,_indexAt').split(',');
  }
}
