$('#signin_form').submit(function() {
    $('#error').hide();
    app.login($('#jid').val(), $('#password').val(), app.signin._successHandler, app.signin._errorHandler);
    return false;
});

function SignIn() {
    this.show = function() {
        $('#signin_form').show();
        document.title = 'Login · '+document.title;
    };

    this.fadeIn = function(cb) {
        $('#signin_form').fadeIn(cb);
        document.title = 'Login · '+document.title;
    };

    this.fadeOut = function(cb) {
        document.title = document.title.substring(8);
        $('#signin_form').fadeOut(cb);
    };

    this._errorHandler = function(error_msg) {
        $('#error').text(error_msg).show();
    }; 

    this._successHandler = _.bind(function() {
        this.fadeOut(function() { 
            app.signedin.show();
        });
    }, this);
}