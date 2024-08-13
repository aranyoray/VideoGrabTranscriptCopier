chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "takeScreenshot") {
    takeScreenshotAndTranscript(request.settings, sendResponse);
    sendResponse({dataUrl: "Successful!"});
  }
  return true;
});

function takeScreenshotAndTranscript(settings, sendResponse) {
  const video = document.querySelector('video');
  if (!video) {
    sendResponse({error: 'No video found on this page.'});
    return;
  }

  video.pause();
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  const transcript = extractTranscript(video, settings.extractionTime);

  sendResponse({dataUrl, transcript});
}

function extractTranscript(video, extractionTime) {
  const currentTime = video.currentTime;
  const start = Math.max(currentTime - extractionTime, 0);
  const end = currentTime + extractionTime;
  let transcript = '';

  const tracks = video.textTracks;
  for (let track of tracks) {
    if (track.mode === 'showing') {
      for (let cue of track.cues) {
        if (cue.startTime >= start && cue.endTime <= end) {
          transcript += cue.text + ' ';
        }
      }
      break;
    }
  }
  return transcript.trim();
}

function performOCR(canvas) {
  const dataUrl = canvas.toDataURL('image/png');
  Tesseract.createWorker()
    .then(worker => worker.load()
      .then(() => worker.loadLanguage('eng'))
      .then(() => worker.initialize('eng'))
      .then(() => worker.recognize(dataUrl))
      .then(({ data: { text } }) => {
        navigator.clipboard.writeText(text);
        alert('Extracted Text: ' + text);
      })
      .finally(() => worker.terminate()))
    .catch(error => {
      console.error('OCR error:', error);
      alert('An error occurred during OCR. Please try again.');
    });
}

function captureVideo(video, duration) {
  const stream = video.captureStream();
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'video.mp4' });
  };

  recorder.start();
  setTimeout(() => recorder.stop(), duration * 1000);
}
console.log("Content script loaded");