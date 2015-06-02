if (window.XDomainRequest) {
    window.ieXDRToXHR = function(window) {
        "use strict";
        var XHR = window.XMLHttpRequest;

        window.XMLHttpRequest = function() {
            this.onreadystatechange = Object;

            this.xhr = null;
            this.xdr = null;

            this.readyState = 0;
            this.status = '';
            this.statusText = null;
            this.responseText = null;

            this.getResponseHeader = null;
            this.getAllResponseHeaders = null;

            this.setRequestHeader = null;

            this.abort = null;
            this.send = null;
            this.isxdr = false;

            // static binding
            var self = this;

            self.xdrLoadedBinded = function() {
                self.xdrLoaded();
            };
            self.xdrErrorBinded = function() {
                self.xdrError();
            };
            self.xdrProgressBinded = function() {
                self.xdrProgress();
            };
            self.xhrReadyStateChangedBinded = function() {
                self.xhrReadyStateChanged();
            };
        };

        XMLHttpRequest.prototype.open = function(method, url, asynch, user, pwd) {
            //improve CORS deteciton (chat.example.net exemple.net), remove hardcoded http-bind
            var parser = document.createElement('a');
            parser.href = url;
            if (parser.hostname!=document.domain) {
                if (this.xdr === null){
                    this.xdr = new window.XDomainRequest();
                }

                this.isxdr = true;
                this.setXDRActive();
                this.xdr.open(method, url);
            } else {
                if (this.xhr === null){
                    this.xhr = new XHR();
                }

                this.isxdr = false;
                this.setXHRActive();
                this.xhr.open(method, url, asynch, user, pwd);
            }
        };

        XMLHttpRequest.prototype.xdrGetResponseHeader = function(name) {
            if (name === 'Content-Type' && this.xdr.contentType > ''){
                return this.xdr.contentType;
            }

            return '';
        };
        
        XMLHttpRequest.prototype.xdrGetAllResponseHeaders = function() {
            return (this.xdr.contentType > '') ? 'Content-Type: ' + this.xdr.contentType : '';
        };
        
        XMLHttpRequest.prototype.xdrSetRequestHeader = function(name, value) {
            //throw new Error('Request headers not supported');
        };
        
        XMLHttpRequest.prototype.xdrLoaded = function() {
            if (this.onreadystatechange !== null) {
                this.readyState = 4;
                this.status = 200;
                this.statusText = 'OK';
                this.responseText = this.xdr.responseText;
                if (window.ActiveXObject){
                    var doc = new ActiveXObject('Microsoft.XMLDOM');
                    doc.async='false';
                    doc.loadXML(this.responseText);
                    this.responseXML = doc;
                }
                this.onreadystatechange();
            }
        };
        
        XMLHttpRequest.prototype.xdrError = function() {
            if (this.onreadystatechange !== null) {
                this.readyState = 4;
                this.status = 0;
                this.statusText = '';
                // ???
                this.responseText = '';
                this.onreadystatechange();
            }
        };
        
        XMLHttpRequest.prototype.xdrProgress = function() {
            if (this.onreadystatechange !== null && this.status !== 3) {
                this.readyState = 3;
                this.status = 3;
                this.statusText = '';
                this.onreadystatechange();
            }
        };
        
        XMLHttpRequest.prototype.finalXDRRequest = function() {
            var xdr = this.xdr;
            delete xdr.onload;
            delete xdr.onerror;
            delete xdr.onprogress;
        };
        
        XMLHttpRequest.prototype.sendXDR = function(data) {
            var xdr = this.xdr;

            xdr.onload = this.xdrLoadedBinded;
            xdr.onerror = this.xdr.ontimeout = this.xdrErrorBinded;
            xdr.onprogress = this.xdrProgressBinded;
            this.responseText = null;

            this.xdr.send(data);
        };
        
        XMLHttpRequest.prototype.abortXDR = function() {
            this.finalXDRRequest();
            this.xdr.abort();
        };
        
        XMLHttpRequest.prototype.setXDRActive = function() {
            this.send = this.sendXDR;
            this.abort = this.abortXDR;
            this.getResponseHeader = this.xdrGetResponseHeader;
            this.getAllResponseHeaders = this.xdrGetAllResponseHeaders;
            this.setRequestHeader = this.xdrSetRequestHeader;
        };

        XMLHttpRequest.prototype.xhrGetResponseHeader = function(name) {
            return this.xhr.getResponseHeader(name);
        };
        
        XMLHttpRequest.prototype.xhrGetAllResponseHeaders = function() {
            return this.xhr.getAllResponseHeaders();
        };
        
        XMLHttpRequest.prototype.xhrSetRequestHeader = function(name, value) {
            return this.xhr.setRequestHeader(name, value);
        };
        
        XMLHttpRequest.prototype.xhrReadyStateChanged = function() {
            if (this.onreadystatechange !== null && this.readyState !== this.xhr.readyState) {
                var xhr = this.xhr;

                this.readyState = xhr.readyState;
                if (this.readyState === 4) {
                    this.status = xhr.status;
                    this.statusText = xhr.statusText;
                    this.responseText = xhr.responseText;
                    this.responseXML = xhr.responseXML;
                    this.responseBody = xhr.responseBody;
                }

                this.onreadystatechange();
            }
        };
        
        XMLHttpRequest.prototype.finalXHRRequest = function() {
            delete this.xhr.onreadystatechange;
        };
        XMLHttpRequest.prototype.abortXHR = function() {
            this.finalXHRRequest();
            this.xhr.abort();
        };
        XMLHttpRequest.prototype.sendXHR = function(data) {
            this.xhr.onreadystatechange = this.xhrReadyStateChangedBinded;

            this.xhr.send(data);
        };
        XMLHttpRequest.prototype.setXHRActive = function() {
            this.send = this.sendXHR;
            this.abort = this.abortXHR;
            this.getResponseHeader = this.xhrGetResponseHeader;
            this.getAllResponseHeaders = this.xhrGetAllResponseHeaders;
            this.setRequestHeader = this.xhrSetRequestHeader;
        };

        window.ieXDRToXHR = undefined;
    };
    window.ieXDRToXHR(window);
}
