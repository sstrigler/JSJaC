/**
 * @fileoverview Magic dependency loading. Taken from script.aculo.us
 * and modified to break it.  
 * @author Stefan Strigler steve@zeank.in-berlin.de 
 * @version $Revision$
 */

var JSJaC = {
  Version: '$Rev$',
  require: function(libraryName) {
    // inserting via DOM fails in Safari 2.0, so brute force approach
    document.write('<script type="text/javascript" src="'+libraryName+'"></script>');
  },
  load: function() {
    var includes = 
    ['xmlextras',
     'jsextras',
     'crypt',
     'json',
     'JSJaCCookie',
     'JSJaCJID',
     'JSJaCBuilder',
     'JSJaCPacket',
     'JSJaCConnection',
     'JSJaCHttpPollingConnection',
     'JSJaCHttpBindingConnection',
     'JSJaCConsoleLogger'
     ];
    var scripts = document.getElementsByTagName("script");
    var path = './';
    for (var i=0; i<scripts.length; i++) {
      if (scripts.item(i).src && scripts.item(i).src.match(/JSJaC\.js$/)) {
        path = scripts.item(i).src.replace(/JSJaC.js$/,'');
        break;
      }
    }
    for (var i=0; i<includes.length; i++)
      this.require(path+includes[i]+'.js');
  }
}

JSJaC.load();
