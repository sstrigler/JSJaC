$('#signin_form').submit(function() {
    $('#error').hide();
    app.login($('#jid').val(), $('#password').val(), app.signin._successHandler, app.signin._errorHandler);
    return false;
});

function SignIn() {
    this._errorHandler = function(error_msg) {
        $('#error').text(error_msg).show();
    }; 

    this._successHandler = function() {
        $('#signin_form').fadeOut(function() { 
            $('#signed_in_panel').show();
        });
    };
}