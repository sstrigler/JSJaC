JSJaC - JavaScript Jabber Client Library
========================================

JSJaC is a Jabber/XMPP client library written in JavaScript to ease
implementation of web based Jabber/XMPP clients. For communication
with a jabber server it needs to support either [HTTP Polling][1] or
[XMPP Over BOSH][2] (formerly known as HTTP Binding) or [XMPP Over
WebSocket][3].
JSJaC has an object oriented interface which should be quite easy to
use.
Communication is done by using the HTTPRequest object (also refered to
as AJAX technology) or WebSocket. Your browser must support this.
JSJaC is fully compatible with all major AJAX/JavaScript frameworks
like prototype, mootools, jQuery, dojo and YUI!.

**Note**: As security restrictions of most modern browsers prevent
  HTTP Polling from being usable anymore this module is disabled by
  default now. If you want to compile it in use
  'make polling'.

License
-------

JSJaC is licensed under the terms of the Mozilla Public License
version 1.1 or, at your option, under the terms of the GNU General
Public License version 2 or subsequent, or the terms of the GNU Lesser
General Public License version 2.1 or subsequent.

The complete text of each of these license can be found in the same
directory as this file. See

* MPL-1.1.txt - for version 1.1  of the Mozille Public License
* gpl-2.0.txt - for version 2 of the GNU General Public License
* lgpl-2.1.txt - for version 2.1 of the GNU Lesser General Public License

Hints on Usage
--------------

### Service Address

Let's say your JSJaC based web application is located at
http://example.com/. Your Jabber server is at jabber-example.com and
it's HTTP Binding service is located at
http://jabber-example.org:5280/ or https://jabber-example.org:5281/.


* You could use mod\_proxy and mod\_rewrite to connect to jabber server:

```apacheconf
    <VirtualHost *>
      Servername example.com
      DocumentRoot /var/www
      AddDefaultCharset UTF-8
      RewriteEngine On
      RewriteRule ^/http-bind/ http://jabber-example.com:5280/http-bind/ [P]
    </VirtualHost>
```

With this you'd end up having access to the Jabber server's service at
http://example.com/http-bind/ (the httpbase address).

* You could use cross domain requests directly to jabber server without any
proxy server:

```js
    var oDbg = new JSJaCConsoleLogger(3);
        
    var connector = new JSJaCHttpBindingConnection({
        oDbg: oDbg,
        httpbase: 'http://jabber-example.org:5280/http-bind/',
        timerval: 500
    });
```
More information: http://en.wikipedia.org/wiki/Cross-origin_resource_sharing

### Debug Logger

JSJaCConnection supports use of [JSDebugger][4] which is available
separately.

JSJaC also ships with a class 'JSJaCConsoleLogger' which lets you log to
Firebug's and Safari's console.

### Example

For an example on how to use this library within your web application
please have to look at 'examples/simpleclient.html' or 'examples/simpleCrossDomainClient.html'.

Supported Browsers and Platforms
--------------------------------

The following browsers are known to work with HTTP Binding. Let me
know about others!

 * Microsoft Internet Explorer 6/7/8/9
 * Firefox 2.0.x and newer (and probably most other Gecko based browsers)
 * Opera 9 and newer
 * Chrome/Safari (and probably most other Webkit based browsers)
 
The following browsers are known to work with cross domain requests.

 * Internet Explorer 8 and newer
 * Opera 12 and newer
 * Firefox 3.5 and newer
 * Google Chrome 3 and newer

The following browsers are known to work with WebSocket.

 * Microsoft Internet Explorer 10
 * Firefox 11 and newer
 * Chrome 16 and newer

Documentation
-------------

Documentation is provided by JSDoc under the docs/ subdirectory if
you've downloaded JSJaC as a tarball. Otherwise you can generate it on
your own by `make doc`.

There's also an online version available at http://sstrigler.github.com/JSJaC/.

[1]: http://xmpp.org/extensions/xep-0025.html
[2]: http://xmpp.org/extensions/xep-0206.html
[3]: http://tools.ietf.org/html/draft-moffitt-xmpp-over-websocket-00
[4]: http://stefan-strigler.de/javascript-debug-logger/
