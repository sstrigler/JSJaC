function SimpleClient(config) {
    /**
     * this 'class' resembles what someone might call a controller
     */

    // connect some logger for debugging
    if (config.debug) {
        this.logger = new JSJaCConsoleLogger(4);
    } else {
        this.logger =  {log: function() {}};
    }

    this.config = config;

    // connect views
    this.signin = new SignIn();
    this.signedin = new SignedIn();

    // functions
    this.handleMessage = function(msg) {
        this.signedin.handleMessage(msg.getFrom(), msg.getBody());
    };

    this.login = function(jid, password, success_cb, error_cb) {
        var e = '';
        if (!jid || jid === '')
            e += 'JID missing! ';
        else if (jid.indexOf('@') == -1)
            e += 'JID malformed!';
        if (!password || password === '')
            e += 'Password missing!';
        if (e !== '') return error_cb(e);

        this.conn = new JSJaCWebSocketConnection(_.extend(config, {oDbg: this.logger}));
        this.setupConn();
        this.conn.registerHandler('onconnect', JSJaC.bind(function() {
            success_cb();
            this.conn.send(new JSJaCPresence());
        }, this));
        this.conn.registerHandler('onerror', JSJaC.bind(function(e) {
            this.logger.log(e,1);
            error_cb('Login failed!');
        }, this));
        var domain = jid.substring(jid.indexOf('@')+1);
        var username = jid.substring(0,jid.indexOf('@'));
        var args = _.extend(config, {domain: domain, username: username, password: password});
        this.conn.connect(args);
    };

    this.logout = function() {
        if (this.conn && this.conn.connected()) {
            this.conn.disconnect();
        } else {
            this.logger.log("logout called but not connected");
        }
    };

    this.resume = function() {
        this.conn = new JSJaCWebSocketConnection(_.extend(this.config, {oDbg: this.logger}));
        this.setupConn();
        
        if (!this.conn.resume()) {
            this.logger.log("resume failed");
            this.conn.disconnect();
            this.conn = null;
            return false;
        } else {
            this.logger.log("resumed");
            return true;
        }
    };

    this.sendMessage = function(to, body) {
        var msg = new JSJaCMessage();
        msg.setTo(to);
        msg.setType('chat');
        msg.setBody(body);
        this.conn.send(msg);
    };

    this.setupConn = function() {
        this.conn.registerHandler('message', JSJaC.bind(this.handleMessage, this));
    };

    this.suspend = function() {
        if (this.conn && this.conn.connected() && this.conn.suspend())
            this.logger.log("suspended");
        else 
            this.logger.log("failed to suspend");
    };
}