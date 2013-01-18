$('#signin_form').submit(function() {
    $('#error').hide();
    app.login($('#jid').val(), $('#password').val(), app.signin.success_handler, app.signin.error_handler);
    return false;
});

function SignIn() {
    this.error_handler = function(error_msg) {
        $('#error').text(error_msg).show();
    }; 

    this.success_handler = function() {
        $('#signin_form').fadeOut(function() { 
            $('#signed_in_panel').show();
        });
    };
}