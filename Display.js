function loadProgram() {
    var selectedProg = $('#programLoader').val();
    if (selectedProg == 'none') {
        $('#codeBlock').text('');
    } else {
        var client = new XMLHttpRequest();
        client.open('GET', selectedProg + '.txt?t=' + new Date().getTime()); // param meant to prevent caching
        client.onreadystatechange = function () {
            $('#codeBlock').text(client.responseText);
        }
        client.send();
    }
}
