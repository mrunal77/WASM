window.wasmGallery = {
  startCamera: async (videoId) => {
    const video = document.getElementById(videoId);
    if (!video || !navigator.mediaDevices) return 'no-video';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();
      return 'ok';
    } catch (e) {
      return e.message || 'camera-error';
    }
  },
  takePhoto: (videoId) => {
    const video = document.getElementById(videoId);
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }
};
