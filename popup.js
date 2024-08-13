document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['useGoogleDrive', 'gdocLink', 'extractionTime'], (data) => {
    document.getElementById('useGoogleDrive').checked = data.useGoogleDrive || false;
    document.getElementById('gdocLink').value = data.gdocLink || '';
    document.getElementById('extractionTime').value = data.extractionTime || 10;
  });

  document.getElementById('saveSettings').addEventListener('click', () => {
    const useGoogleDrive = document.getElementById('useGoogleDrive').checked;
    const gdocLink = document.getElementById('gdocLink').value;
    const extractionTime = parseInt(document.getElementById('extractionTime').value, 10);

    chrome.storage.sync.set({ useGoogleDrive, gdocLink, extractionTime }, () => {
      alert('Settings saved!');
    });
  });

  document.getElementById('screenshotBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "takeScreenshot",
          settings: {
            useGoogleDrive: document.getElementById('useGoogleDrive').checked,
            extractionTime: parseInt(document.getElementById('extractionTime').value, 10)
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
          }
          if (response && response.dataUrl) {
            if (document.getElementById('useGoogleDrive').checked) {
              saveToGoogleDrive(response.dataUrl, 'screenshot.png', response.transcript);
            } else {
              chrome.downloads.download({
                url: response.dataUrl,
                filename: 'screenshot.png',
                saveAs: true
              });
              const docx = createDocx(response.transcript);
              const docxBlob = new Blob([docx], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
              chrome.downloads.download({ 
                url: URL.createObjectURL(docxBlob), 
                filename: 'transcript.docx',
                saveAs: true
              });
            }
          }
        });
      } else {
        console.error("No active tab found");
      }
    });
  });
  
  function createDocx(content) {
    const docx = new window.docx.Document({
      sections: [{
        properties: {},
        children: [
          new window.docx.Paragraph({
            children: [new window.docx.TextRun(content)],
          }),
        ],
      }],
    });
    return window.docx.Packer.toBlob(docx);
  }

  document.getElementById('ocrBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "performOCR"});
      } else {
        console.error("No active tab found");
      }
    });
  });

  document.getElementById('captureVideoBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "captureVideo",
          duration: parseInt(document.getElementById('extractionTime').value, 10)
        });
      } else {
        console.error("No active tab found");
      }
    });
  });
});

function saveToGoogleDrive(dataUrl, filename, content) {
  chrome.runtime.sendMessage({action: "saveToGoogleDrive", dataUrl, filename, content}, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      alert('File saved to Google Drive!');
    } else {
      alert('Error saving to Google Drive. Check console for details.');
    }
  });
}