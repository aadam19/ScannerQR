# Overview

This project is a simple web application with two main pages:

1. **Login Page**  
   - Accessible only to a single super user.  
   - Credentials must be stored securely in the project’s secrets.  

2. **Scanner Page**  
   - The main functionality of the app.  

---

## QR Code Generation & Registration Flow

- **Registration** is handled through **Google Forms**.  
- A **GCP Cloud Function** retrieves form submissions and sends QR codes via email.  

---

## Backend & Database

- An **API endpoint** is deployed within the same GCP project.  
- The frontend communicates with this endpoint to update the database.  
- For this project’s scope, the “database” is simply an **Excel file**.  

---

## Cloud Functions

Here are the two GCP Cloud Functions used.  
You can use them as inspiration when building your own:

```javascript
/*
This function generates QR codes based on the ID of the Google Form response
  - Sends it via eMail
  - Stores user information in a table of the form  NAME | EMAIL | NUMBER | ID | VERIFIED?
Verification happens manually, since only business owners can use the TWINT API
*/
function generateQR(e) {
  var response = e.response;
  var itemResponses = response.getItemResponses();

  var name = itemResponses[0].getResponse();
  var email = itemResponses[1].getResponse();
  var twintNumber = itemResponses[2].getResponse();
  var numTickets = parseInt(itemResponses[3].getResponse(), 10);

  // Store number as string
  twintNumber = "'" + twintNumber;

  // Create QR data
  var qrData = response.getId();

  // Generate QR code
  var url = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qrData);
  var qrBlob = UrlFetchApp.fetch(url).getBlob().setName("qr.png");

  // Convert QR blob to base64 for inline embedding
  var qrBase64 = Utilities.base64Encode(qrBlob.getBytes());
  var qrDataUri = "data:image/png;base64," + qrBase64;

  // Compose HTML email
  var subject = "Your event Ticket";

  var htmlBody = `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f0f0f5; padding: 20px; border-radius: 10px;">
      <h1 style="color: #d6336c;">&#127881; My wonderful event &#127881;</h1>
      <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 16px;">Thank you for registering for our event!</p>
      <p style="font-size: 16px;">You have purchased <strong>${numTickets}</strong> ticket(s).<br>
      Your QR code below is valid for <strong>${numTickets}</strong> entry(s).</p>
      <img src="${qrDataUri}" alt="QR Code" style="margin: 20px 0; width: 300px; height: 300px; border: 5px solid #d6336c; border-radius: 10px;">
      <p style="font-size: 14px; color: #555;">Please show this QR code at the entrance. Do not share it with others.</p>
      <hr style="margin: 20px 0;">
      <p style="font-size: 14px; color: #777;">See you at the event! &#129395;</p>
    </div>
  `;

  GmailApp.sendEmail(
    email,
    subject,
    "Hi " + name + ",\nPlease check the HTML version of this email for your QR code.",
    {htmlBody: htmlBody}
  );

  // Store in sheet: track allowed scans and used scans
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  sheet.appendRow([name, email, twintNumber, numTickets, qrData, false]);
}
```


And this is how the API endpoint looks like, basically does some error checking and then updates the sheet:
```javascript
function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var qrID = params.id;
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    // Get header row
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idIndex = headers.indexOf("ID") + 1;         // +1 because getRange is 1-based
    var verifiedIndex = headers.indexOf("VERIFIED?") + 1;
    var ticketsIndex = headers.indexOf("NO. TICKETS") + 1;

    if (idIndex === 0 || verifiedIndex === 0 || ticketsIndex === 0) {
      throw new Error("One or more required columns not found in header row");
    }

    // Search only in ID column
    var idColumn = sheet.getRange(2, idIndex, sheet.getLastRow() - 1); // exclude header
    var finder = idColumn.createTextFinder(qrID).findNext();

    if (finder) {
      var rowIndex = finder.getRow();

      var verified = sheet.getRange(rowIndex, verifiedIndex).getValue();
      var tickets = sheet.getRange(rowIndex, ticketsIndex).getValue();

      if ((verified === true || verified === "TRUE") && tickets > 0) {
        sheet.getRange(rowIndex, ticketsIndex).setValue(tickets - 1);

        return ContentService
          .createTextOutput(JSON.stringify({ success: true, remaining: tickets - 1 }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService
          .createTextOutput(JSON.stringify({ success: false, message: "Not verified or no tickets left" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: "QR not found" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
