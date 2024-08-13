chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveToGoogleDrive") {
    saveToGoogleDrive(request.dataUrl, request.filename)
      .then(() => sendResponse({success: true}))
      .catch((error) => {
        console.error('Error saving to Google Drive:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;  // Indicates you wish to send a response asynchronously
  }
});

async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (!token) {
        reject(new Error('No token received'));
      } else {
        resolve(token);
      }
    });
  });
}

async function saveToGoogleDrive(dataUrl, filename) {
  try {
    const token = await getAuthToken();
    const blob = await (await fetch(dataUrl)).blob();
    
    const metadata = {
      name: filename,
      mimeType: blob.type
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const file = await response.json();
    console.log('File uploaded:', file);
    return file;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}