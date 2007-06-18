// functions to make live easier

// extends strings with htmlEnc
String.prototype.htmlEnc = function() {
  var str = this.replace(/&/g,"&amp;");
  str = str.replace(/</g,"&lt;");
  str = str.replace(/>/g,"&gt;");
  str = str.replace(/\"/g,"&quot;");
  str = str.replace(/\n/g,"<br />");
  return str;
};

/* Date.jab2date
 * converts from jabber timestamps to javascript date objects
 */
Date.jab2date = function(ts) {
  var date = new Date(Date.UTC(ts.substr(0,4),ts.substr(5,2)-1,ts.substr(8,2),ts.substr(11,2),ts.substr(14,2),ts.substr(17,2)));
  if (ts.substr(ts.length-6,1) != 'Z') { // there's an offset
    var offset = new Date();
    offset.setTime(0);
    offset.setUTCHours(ts.substr(ts.length-5,2));
    offset.setUTCMinutes(ts.substr(ts.length-2,2));
    if (ts.substr(ts.length-6,1) == '+')
      date.setTime(date.getTime() - offset.getTime());
    else if (ts.substr(ts.length-6,1) == '-')
      date.setTime(date.getTime() + offset.getTime());
  }
  return date;
};

/* hrTime - human readable Time
 * takes a timestamp in the form of 2004-08-13T12:07:04±02:00 as argument
 * and converts it to some sort of humane readable format
 */
Date.hrTime = function(ts) {
  return Date.jab2date(ts).toLocaleString();
};

/* jabberDate
 * somewhat opposit to hrTime (see above)
 * expects a javascript Date object as parameter and returns a jabber 
 * date string conforming to JEP-0082
 */
Date.prototype.jabberDate = function() {
  padZero = function(i) {
    if (i < 10) return "0" + i;
    return i;
  };

  var jDate = this.getUTCFullYear() + "-";
  jDate += padZero(this.getUTCMonth()+1) + "-";
  jDate += padZero(this.getUTCDate()) + "T";
  jDate += padZero(this.getUTCHours()) + ":";
  jDate += padZero(this.getUTCMinutes()) + ":";
  jDate += padZero(this.getUTCSeconds()) + "Z";

  return jDate;
}
