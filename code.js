// Google Apps Script: paste this into script.google.com (NOT into your website folder).
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var name = String(data.name || '').slice(0, 200);
    var email = String(data.email || '').slice(0, 200);
    var msg = String(data.msg || '').slice(0, 5000);
    if (!name || !email || !msg) throw new Error('missing fields');

    MailApp.sendEmail({
      to: 'ridahassan.work@gmail.com',
      replyTo: email,
      subject: 'CV website message from ' + name,
      body: 'Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + msg
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}