$('#send_form').submit(function() {
    if ($('#send_form_body').val() !== '')
        app.sendMessage($('#send_form_to').val(), $('#send_form_body').val());
    $('#send_form_body').val('');
    return false;
});

$('#logout_button').click(function() {
    app.logout();
    app.signedin.hide();
    app.signin.fadeIn();
});

function SignedIn() {
    this.handleMessage = function(from, body) {
        $('#signed_in_panel .message_panel').prepend('<div class="msg_from">Message received from '+from+':</div><div class="msg_body">'+body+'</div>');
    };

    this.hide = function(cb) {
        $('#signed_in_panel').hide(cb);
    };

    this.show = function(fun) {
        $('#signed_in_panel').show(fun);
    };
}
