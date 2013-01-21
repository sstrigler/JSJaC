$('#send_form').submit(function() {
    if ($('#send_form_body').val() !== '')
        app.sendMessage($('#send_form_to').val(), $('#send_form_body').val());
    $('#send_form_body').val('');
    return false;
});

$(window).unload(function() {
    app.logout();
});

function SignedIn() {
    this.handleMessage = function(from, body) {
        $('#signed_in_panel .message_panel').prepend('<div class="msg_from">Message received from '+from+':</div><div class="msg_body">'+body+'</div>');
    };
}
