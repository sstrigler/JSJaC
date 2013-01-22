
var app = new SimpleClient(Config);

$(window).load(function() {
    app.signin.show();
});

$(window).unload(function() {
    app.logout();
});

