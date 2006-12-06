dojo.provide("jsjac.packet.Message");
dojo.require("jsjac.packet.Packet");

jsjac.packet.Message = function() {
  this.base = jsjac.packet.Packet;
  this.base('message');

  this.setBody = function(/* string */body) {
    this._setChildNode("body",body);
    return this; 
  };
  this.setSubject = function(/* string */subject) {
    this._setChildNode("subject",subject);
    return this; 
  };
  this.setThread = function(/* string */thread) {
    this._setChildNode("thread", thread);
    return this; 
  };

  this.getThread = function() { return this._childElVal('thread'); };
  this.getBody = function() { return this._childElVal('body'); };
  this.getSubject = function() { return this._childElVal('subject') };
};
