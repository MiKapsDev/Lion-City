(function () {
  const startBtn = document.getElementById('startScan');
  const stopBtn = document.getElementById('stopScan');
  const uploadBtn = document.getElementById('uploadScan');
  const uploadInput = document.getElementById('uploadInput');
  const videoEl = document.getElementById('cameraPreview');
  const canvasEl = document.getElementById('scanCanvas');
  const resultEl = document.getElementById('scanResult');
  const statusEl = document.getElementById('scanStatus');
  const scanPreviewEl = document.querySelector('.scan-frame');
  let scanLoop;
  let stream;
  let scanning = false;
  const decodeScales = [1, 0.75, 0.5, 0.35];
  const previewMaxHeight = 320;
  const decodeCanvas = document.createElement('canvas');
  const decodeContext = decodeCanvas.getContext('2d');
  const qrDetector =
    typeof BarcodeDetector !== 'undefined' ? new BarcodeDetector({ formats: ['qr_code'] }) : null;

  function setStatus(text, tone = 'info') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `status-pill status-${tone}`;
  }

  async function startScan() {
    if (scanning) {
      stopScan();
    }
    const mediaPromise = getUserMediaStream();
    if (!mediaPromise) {
      setStatus('Kamera kann hier nicht gestartet werden. Bitte Seite ueber HTTPS oeffnen.', 'warning');
      return;
    }

    try {
      setButtons(true);
      stream = await mediaPromise;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('muted', 'true');
      if (canvasEl) canvasEl.style.display = 'block';
      scanPreviewEl?.classList.add('is-static');
      showVideoPreview();
      if (videoEl) {
        videoEl.style.opacity = '0';
        videoEl.addEventListener(
          'loadeddata',
          () => {
            if (canvasEl) canvasEl.style.display = 'none';
            scanPreviewEl?.classList.remove('is-static');
            videoEl.style.opacity = '1';
          },
          { once: true }
        );
      }
      await videoEl.play().catch(() => {});
      scanning = true;
      if (resultEl) resultEl.textContent = 'Suche nach QR-Code ...';
      setStatus('Kamera aktiv - auf QR-Code richten.', 'success');
      scanLoop = requestAnimationFrame(tick);
    } catch (error) {
      setButtons(false);
      setStatus('Zugriff auf Kamera verweigert oder fehlgeschlagen.', 'danger');
    }
  }

  function stopScan() {
    freezeFrame();
    if (scanLoop) cancelAnimationFrame(scanLoop);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
    scanning = false;
    setButtons(false);
    setStatus('Scan gestoppt.', 'info');
  }

  function resetScanPanel() {
    stopScan();
    if (resultEl) resultEl.textContent = 'Noch kein Scan gestartet.';
    setStatus('Bereit', 'info');
    if (canvasEl) {
      const context = canvasEl.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
      canvasEl.style.display = 'none';
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.style.display = 'block';
      videoEl.style.opacity = '1';
    }
    scanPreviewEl?.classList.remove('is-static');
    if (uploadInput) {
      uploadInput.value = '';
    }
  }

  function setButtons(isScanning) {
    if (startBtn) startBtn.disabled = isScanning;
    if (stopBtn) stopBtn.disabled = !isScanning;
  }

  function tick() {
    if (!videoEl || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
      scanLoop = requestAnimationFrame(tick);
      return;
    }

    const canvas = canvasEl;
    const context = canvas.getContext('2d');
    canvas.height = videoEl.videoHeight;
    canvas.width = videoEl.videoWidth;
    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR?.(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      handleScanResult(code.data);
      stopScan();
      return;
    }

    scanLoop = requestAnimationFrame(tick);
  }

  function handleScanResult(data) {
    const numericValue = parseNumericValue(data);
    if (Number.isFinite(numericValue)) {
      if (resultEl) resultEl.textContent = `${numericValue}`;
      window.PointsManager?.addPoints(numericValue, '');
      setStatus('QR-Code erkannt und Punkte gebucht.', 'success');
      return;
    }
    if (resultEl) resultEl.textContent = data;
    setStatus('QR-Code erkannt, aber keine Zahl gefunden.', 'warning');
  }

  function parseNumericValue(value) {
    if (!value) return null;
    const match = String(value).match(/-?\d+/);
    if (!match) return null;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function handleUpload() {
    if (!uploadInput) return;
    uploadInput.click();
  }

  function decodeImageFile(file) {
    if (window.createImageBitmap) {
      decodeWithBitmap(file);
      return;
    }
    decodeWithImageElement(file);
  }

  async function decodeWithBitmap(file) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      renderPreview(bitmap.width, bitmap.height, (context, width, height) => {
        context.drawImage(bitmap, 0, 0, width, height);
      });
      const result = await decodeFromSource(bitmap.width, bitmap.height, (context, width, height) => {
        context.drawImage(bitmap, 0, 0, width, height);
      });
      bitmap.close?.();
      if (result) {
        handleScanResult(result);
        return;
      }
      setStatus('Kein QR-Code im Bild gefunden.', 'warning');
    } catch (error) {
      decodeWithImageElement(file);
    }
  }

  function decodeWithImageElement(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = async () => {
        renderPreview(image.naturalWidth, image.naturalHeight, (context, width, height) => {
          context.drawImage(image, 0, 0, width, height);
        });
        const result = await decodeFromSource(
          image.naturalWidth,
          image.naturalHeight,
          (context, width, height) => {
            context.drawImage(image, 0, 0, width, height);
          }
        );
        if (result) {
          handleScanResult(result);
        } else {
          setStatus('Kein QR-Code im Bild gefunden.', 'warning');
        }
      };
      image.onerror = () => {
        setStatus('Bild konnte nicht geladen werden.', 'danger');
      };
      image.src = reader.result;
    };
    reader.onerror = () => {
      setStatus('Datei konnte nicht gelesen werden.', 'danger');
    };
    reader.readAsDataURL(file);
  }

  async function decodeFromSource(width, height, draw) {
    if (!decodeContext) return null;
    const maxSize = 1200;
    const baseScale = Math.min(1, maxSize / Math.max(width, height));
    const baseWidth = Math.max(1, Math.floor(width * baseScale));
    const baseHeight = Math.max(1, Math.floor(height * baseScale));

    for (const scale of decodeScales) {
      const targetWidth = Math.max(1, Math.floor(baseWidth * scale));
      const targetHeight = Math.max(1, Math.floor(baseHeight * scale));
      decodeCanvas.width = targetWidth;
      decodeCanvas.height = targetHeight;
      decodeContext.clearRect(0, 0, targetWidth, targetHeight);
      draw(decodeContext, targetWidth, targetHeight);
      const detectorValue = await detectWithBarcodeDetector(decodeCanvas);
      if (detectorValue) {
        return detectorValue;
      }
      const imageData = decodeContext.getImageData(0, 0, targetWidth, targetHeight);
      const code = window.jsQR?.(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code?.data) {
        return code.data;
      }
    }
    return null;
  }

  async function detectWithBarcodeDetector(canvas) {
    if (!qrDetector) return null;
    try {
      const results = await qrDetector.detect(canvas);
      const value = results?.[0]?.rawValue;
      return value || null;
    } catch (error) {
      return null;
    }
  }

  function showVideoPreview() {
    if (videoEl) videoEl.style.display = 'block';
    if (canvasEl) canvasEl.style.display = 'none';
    scanPreviewEl?.classList.remove('is-static');
  }

  function showImagePreview() {
    if (videoEl) videoEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = 'block';
    scanPreviewEl?.classList.add('is-static');
  }

  function freezeFrame() {
    if (!canvasEl || !videoEl) return;
    if (videoEl.readyState < videoEl.HAVE_CURRENT_DATA) return;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    canvasEl.width = videoEl.videoWidth || canvasEl.width;
    canvasEl.height = videoEl.videoHeight || canvasEl.height;
    context.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
    showImagePreview();
  }

  function renderPreview(width, height, draw) {
    if (!canvasEl) return;
    showImagePreview();
    const previewWidth = canvasEl.parentElement?.clientWidth || 320;
    const scale = Math.min(1, previewWidth / width, previewMaxHeight / height);
    const targetWidth = Math.max(1, Math.floor(width * scale));
    const targetHeight = Math.max(1, Math.floor(height * scale));
    canvasEl.width = targetWidth;
    canvasEl.height = targetHeight;
    const context = canvasEl.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, targetWidth, targetHeight);
    draw(context, targetWidth, targetHeight);
  }

  function handleUploadChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('Bild wird gescannt ...', 'info');
    decodeImageFile(file);
    event.target.value = '';
  }

  function getUserMediaStream() {
    const constraints = { video: { facingMode: 'environment' } };
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    const legacy =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;
    if (!legacy) return null;
    return new Promise((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setButtons(false);
    startBtn?.addEventListener('click', startScan);
    stopBtn?.addEventListener('click', stopScan);
    uploadBtn?.addEventListener('click', handleUpload);
    uploadInput?.addEventListener('change', handleUploadChange);
  });

  window.addEventListener('demo:reset', resetScanPanel);
})();
