dojo.provide("jsjac.packet.Presence");
dojo.require("jsjac.packet.Packet");

jsjac.packet.Presence = function() {
  this.base = JSJaCPacket;
  this.base('presence');

  this.setStatus = function(/* string */status) {
    this._setChildNode("status", status);
    return this; 
  };
  this.setShow = function(/* string */show) {
    this._setChildNode("show",show);
    return this; 
  };
  this.setPriority = function(/* integer */prio) {
    this._setChildNode("priority", prio);
    return this; 
  };
  this.setPresence = function(/* string */show,/* string */status,/* integer */prio) {
    if (show)
      this.setShow(show);
    if (status)
      this.setStatus(status);
    if (prio)
      this.setPriority(prio);
    return this; 
  };

  this.getStatus = function() {	return this._childElVal('status'); };
  this.getShow = function() { return this._childElVal('show'); };
  this.getPriority = function() { return this._childElVal('priority'); };
};
