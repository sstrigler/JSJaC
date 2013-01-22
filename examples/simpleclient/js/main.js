
var app = new SimpleClient(Config);

$(window).load(function() {
    if (!app.resume()) {
        app.signin.show();
    } else {
        app.signedin.show();
    }
});

window.onbeforeunload = function() {
    app.suspend();
};

