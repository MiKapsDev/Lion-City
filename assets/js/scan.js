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
  const confettiLayer = document.getElementById('confettiLayer');
  const pointsBurstEl = document.getElementById('pointsBurst');
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

  function triggerRedeemCelebration(points) {
    if (!Number.isFinite(points) || points <= 0) return;
    showPointsBurst(points);
    launchConfetti();
  }

  function showPointsBurst(points) {
    if (!pointsBurstEl) return;
    const target = Math.max(0, Math.round(points));
    const duration = 1200;
    const start = performance.now();
    pointsBurstEl.classList.remove('is-visible');
    pointsBurstEl.textContent = '+0 Punkte';
    void pointsBurstEl.offsetWidth;
    pointsBurstEl.classList.add('is-visible');
    if (pointsBurstEl._burstTimer) {
      clearTimeout(pointsBurstEl._burstTimer);
    }
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = Math.round(target * easeOutCubic(progress));
      pointsBurstEl.textContent = `+${current} Punkte`;
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
    pointsBurstEl._burstTimer = setTimeout(() => {
      pointsBurstEl.classList.remove('is-visible');
    }, 2700);
  }

  function launchConfetti() {
    if (!confettiLayer) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#a855f7', '#f472b6', '#e2e8f0'];
    const fragment = document.createDocumentFragment();
    const bursts = [
      { left: '0%', xMin: 18, xMax: 50, yMin: -40, yMax: -70 },
      { left: '100%', xMin: -50, xMax: -18, yMin: -40, yMax: -70 },
    ];
    bursts.forEach((burst) => {
      for (let i = 0; i < 40; i += 1) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        const x = randomBetween(burst.xMin, burst.xMax);
        const y = randomBetween(burst.yMin, burst.yMax);
        const rotation = randomBetween(-220, 220);
        const delay = randomBetween(0, 160);
        const duration = randomBetween(1600, 2400);
        const width = randomBetween(6, 12);
        const height = randomBetween(10, 18);
        piece.style.left = burst.left;
        piece.style.bottom = '0';
        piece.style.width = `${width}px`;
        piece.style.height = `${height}px`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--x', `${x}vw`);
        piece.style.setProperty('--y', `${y}vh`);
        piece.style.setProperty('--rot', `${rotation}deg`);
        piece.style.setProperty('--delay', `${delay}ms`);
        piece.style.setProperty('--duration', `${duration}ms`);
        fragment.appendChild(piece);
        setTimeout(() => {
          piece.remove();
        }, duration + delay + 200);
      }
    });
    confettiLayer.appendChild(fragment);
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  async function startScan() {
    if (scanning) {
      stopScan();
    }
    const mediaPromise = getUserMediaStream();
    if (!mediaPromise) {
      setStatus('Kamera kann hier nicht gestartet werden. Bitte Seite über HTTPS öffnen.', 'warning');
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
    const gamePayload = parseGamePayload(data);
    if (gamePayload) {
      const launched = window.GameManager?.launchGame?.(gamePayload);
      if (launched) {
        if (resultEl) {
          resultEl.textContent = `Game: ${gamePayload.game} | Basis ${gamePayload.points} Punkte`;
        }
        setStatus('Spiel erkannt - starte Challenge.', 'success');
        return;
      }
      if (resultEl) {
        resultEl.textContent = `Game: ${gamePayload.game} | Basis ${gamePayload.points} Punkte`;
      }
      setStatus('Spiel erkannt, aber nicht unterstützt.', 'warning');
      return;
    }
    const numericValue = parseNumericValue(data);
    if (Number.isFinite(numericValue)) {
      if (resultEl) resultEl.textContent = `${numericValue}`;
      window.PointsManager?.addPoints(numericValue, '');
      triggerRedeemCelebration(numericValue);
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

  function parseGamePayload(raw) {
    if (!raw) return null;
    const text = String(raw).trim();
    if (!text) return null;
    const jsonPayload = parseJsonPayload(text);
    if (jsonPayload) return jsonPayload;
    const queryPayload = parseQueryPayload(text);
    if (queryPayload) return queryPayload;
    const keyValuePayload = parseKeyValuePayload(text);
    if (keyValuePayload) return keyValuePayload;
    const simplePayload = parseSimplePayload(text);
    if (simplePayload) return simplePayload;
    return null;
  }

  function parseJsonPayload(text) {
    if (!text.startsWith('{') || !text.endsWith('}')) return null;
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') return null;
      const game = String(parsed.game || parsed.title || '').trim();
      const points = Number.parseInt(parsed.points, 10);
      if (!game || !Number.isFinite(points)) return null;
      return { game, points };
    } catch (error) {
      return null;
    }
  }

  function parseQueryPayload(text) {
    if (!text.includes('game=') && !text.includes('points=')) return null;
    const params = new URLSearchParams(text.replace(/;/g, '&'));
    const game = String(params.get('game') || '').trim();
    const points = Number.parseInt(params.get('points'), 10);
    if (!game || !Number.isFinite(points)) return null;
    return { game, points };
  }

  function parseKeyValuePayload(text) {
    if (!text.includes(':') && !text.includes('=')) return null;
    const parts = text.split(/[;&,]/);
    let game = '';
    let points = null;
    parts.forEach((part) => {
      const [key, rawValue] = part.split(/[:=]/).map((entry) => entry.trim());
      if (!key || !rawValue) return;
      if (key.toLowerCase() === 'game') game = rawValue;
      if (key.toLowerCase() === 'points') points = Number.parseInt(rawValue, 10);
    });
    if (!game || !Number.isFinite(points)) return null;
    return { game, points };
  }

  function parseSimplePayload(text) {
    const match = text.match(/^([a-z0-9_-]{3,})\s*[:|]\s*(-?\d+)/i);
    if (!match) return null;
    const game = match[1];
    const points = Number.parseInt(match[2], 10);
    if (!game || !Number.isFinite(points)) return null;
    return { game, points };
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
