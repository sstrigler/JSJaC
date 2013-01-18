function SimpleClient(config) {
    this.signin = new SignIn();
    this.logger = new JSJaCConsoleLogger(4);

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

    this.setupConn = function() {
    };
}