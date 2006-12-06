dojo.provide("jsjac.cookie");

// taken from http://www.quirksmode.org/js/cookies.html
// modified slightly

jsjac.cookie.create = function(/* string */name,/* string */ value,/* integer? */secs)
{
  if (secs)
    {
      var date = new Date();
      date.setTime(date.getTime()+(secs*1000));
      var expires = "; expires="+date.toGMTString();
    }
  else var expires = "";
  document.cookie = name+"="+value+expires+"; path=/";
};

jsjac.cookie.read = function(/* string */name)
{
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++)
    {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
  return null;
};

jsjac.cookie.erase = function(/* string */name)
{
  createCookie(name,"",-1);
};
