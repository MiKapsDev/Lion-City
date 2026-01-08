(function () {
  const overlayEl = document.getElementById('gameOverlay');
  const titleEl = document.getElementById('gameTitle');
  const subtitleEl = document.getElementById('gameSubtitle');
  const canvasEl = document.getElementById('snakeCanvas');
  const scoreEl = document.getElementById('gameScore');
  const multiplierEl = document.getElementById('gameMultiplier');
  const basePointsEl = document.getElementById('gameBasePoints');
  const finalPointsEl = document.getElementById('gameFinalPoints');
  const statusEl = document.getElementById('gameStatus');
  const startBtn = document.getElementById('gameStart');
  const giveUpBtn = document.getElementById('gameGiveUp');
  const closeBtn = document.getElementById('gameClose');
  const dpadButtons = document.querySelectorAll('.dpad-btn');

  const gridSize = 18;
  let gameState = null;
  let tickHandle = null;
  let countdownTimer = null;
  let lastDir = { x: 1, y: 0 };
  let queuedDir = null;

  function setStatus(text, tone = 'info') {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `status-pill status-${tone}`;
  }

  function setOverlayVisible(visible) {
    if (!overlayEl) return;
    overlayEl.classList.toggle('is-visible', visible);
    overlayEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    document.body.style.overflow = visible ? 'hidden' : '';
  }

  function initState(basePoints) {
    gameState = {
      basePoints: Math.max(0, Number.parseInt(basePoints, 10) || 0),
      score: 0,
      snake: [
        { x: 7, y: 9 },
        { x: 6, y: 9 },
        { x: 5, y: 9 },
      ],
      dir: { x: 1, y: 0 },
      food: spawnFood([]),
      status: 'ready',
      awarded: false,
    };
    lastDir = { x: 1, y: 0 };
    queuedDir = null;
    updateHud();
  }

  function spawnFood(occupied) {
    const taken = new Set(occupied.map((cell) => `${cell.x},${cell.y}`));
    let x = 0;
    let y = 0;
    do {
      x = Math.floor(Math.random() * gridSize);
      y = Math.floor(Math.random() * gridSize);
    } while (taken.has(`${x},${y}`));
    return { x, y };
  }

  function getMultiplier(score) {
    const raw = 1 + score * 0.15;
    return Math.min(2.5, Math.max(1, Math.round(raw * 10) / 10));
  }

  function getTickMs(multiplier) {
    const minMs = 90;
    const maxMs = 190;
    const normalized = (multiplier - 1) / 1.5;
    const clamped = Math.min(1, Math.max(0, normalized));
    return Math.round(maxMs - (maxMs - minMs) * clamped);
  }

  function scheduleNextTick() {
    if (!gameState || gameState.status !== 'running') return;
    const delay = getTickMs(getMultiplier(gameState.score));
    tickHandle = window.setTimeout(() => {
      tick();
    }, delay);
  }

  function updateHud() {
    if (!gameState) return;
    const multiplier = getMultiplier(gameState.score);
    const finalPoints = Math.max(0, Math.round(gameState.basePoints * multiplier));
    if (scoreEl) scoreEl.textContent = String(gameState.score);
    if (multiplierEl) multiplierEl.textContent = `${multiplier.toFixed(1)}x`;
    if (basePointsEl) basePointsEl.textContent = String(gameState.basePoints);
    if (finalPointsEl) finalPointsEl.textContent = String(finalPoints);
  }

  function startGame() {
    if (!gameState) return;
    if (gameState.status !== 'ready') return;
    if (countdownTimer) window.clearInterval(countdownTimer);
    let remaining = 5;
    gameState.status = 'countdown';
    if (startBtn) startBtn.disabled = true;
    setStatus(`Start in ${remaining} Sekunden ...`, 'info');
    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
        gameState.status = 'running';
        setStatus('Läuft - sammle Futter für einen Höheren Multiplikator.', 'success');
        if (tickHandle) window.clearTimeout(tickHandle);
        scheduleNextTick();
        return;
      }
      setStatus(`Start in ${remaining} Sekunden ...`, 'info');
    }, 1000);
  }

  function endGame({ canceled }) {
    if (!gameState) return;
    if (tickHandle) window.clearTimeout(tickHandle);
    tickHandle = null;
    gameState.status = 'over';
    if (startBtn) startBtn.disabled = false;
    if (canceled) {
      setStatus('Spiel abgebrochen. Keine Punkte gebucht.', 'warning');
      return;
    }
    if (!gameState.awarded) {
      const multiplier = getMultiplier(gameState.score);
      const finalPoints = Math.max(0, Math.round(gameState.basePoints * multiplier));
      const reason = `QR-Game Snake (${gameState.score} Score, ${multiplier.toFixed(1)}x)`;
      if (finalPoints > 0) {
        window.PointsManager?.addPoints(finalPoints, reason);
        setStatus(`Game beendet: +${finalPoints} Punkte gebucht.`, 'success');
      } else {
        setStatus('Game beendet: Keine Punkte erhalten.', 'warning');
      }
      gameState.awarded = true;
    }
  }

  function tick() {
    if (!gameState) return;
    const nextDir = queuedDir || gameState.dir;
    const head = gameState.snake[0];
    const next = { x: head.x + nextDir.x, y: head.y + nextDir.y };
    queuedDir = null;
    gameState.dir = nextDir;
    lastDir = nextDir;

    if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize) {
      endGame({ canceled: false });
      render();
      return;
    }

    if (gameState.snake.some((cell) => cell.x === next.x && cell.y === next.y)) {
      endGame({ canceled: false });
      render();
      return;
    }

    gameState.snake.unshift(next);
    if (next.x === gameState.food.x && next.y === gameState.food.y) {
      gameState.score += 1;
      gameState.food = spawnFood(gameState.snake);
      updateHud();
    } else {
      gameState.snake.pop();
    }
    render();
    if (gameState.status === 'running') {
      scheduleNextTick();
    }
  }

  function render() {
    if (!canvasEl || !gameState) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    const size = canvasEl.width;
    const cell = size / gridSize;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
      ctx.stroke();
    }

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(gameState.food.x * cell + 2, gameState.food.y * cell + 2, cell - 4, cell - 4);

    gameState.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.7)';
      ctx.fillRect(segment.x * cell + 2, segment.y * cell + 2, cell - 4, cell - 4);
    });
  }

  function canChangeDir(next) {
    if (!next) return false;
    if (next.x === -lastDir.x && next.y === -lastDir.y) return false;
    return true;
  }

  function queueDirection(next) {
    if (!gameState || gameState.status !== 'running') return;
    if (!canChangeDir(next)) return;
    queuedDir = next;
  }

  function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'w'].includes(key)) queueDirection({ x: 0, y: -1 });
    if (['arrowdown', 's'].includes(key)) queueDirection({ x: 0, y: 1 });
    if (['arrowleft', 'a'].includes(key)) queueDirection({ x: -1, y: 0 });
    if (['arrowright', 'd'].includes(key)) queueDirection({ x: 1, y: 0 });
  }

  function handleDpad(event) {
    const dir = event.currentTarget?.dataset?.dir;
    if (dir === 'up') queueDirection({ x: 0, y: -1 });
    if (dir === 'down') queueDirection({ x: 0, y: 1 });
    if (dir === 'left') queueDirection({ x: -1, y: 0 });
    if (dir === 'right') queueDirection({ x: 1, y: 0 });
  }

  function handleSwipe(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      queueDirection({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      queueDirection({ x: 0, y: dy > 0 ? 1 : -1 });
    }
  }

  function bindTouchControls() {
    if (!canvasEl) return;
    let startPoint = null;
    canvasEl.addEventListener(
      'touchstart',
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        if (gameState?.status === 'ready') {
          startGame();
        }
        startPoint = { x: touch.clientX, y: touch.clientY };
      },
      { passive: true }
    );
    canvasEl.addEventListener(
      'touchmove',
      (event) => {
        if (!startPoint) return;
        const touch = event.touches[0];
        if (!touch) return;
        handleSwipe(startPoint, { x: touch.clientX, y: touch.clientY });
        startPoint = { x: touch.clientX, y: touch.clientY };
      },
      { passive: true }
    );
    canvasEl.addEventListener(
      'touchend',
      () => {
        startPoint = null;
      },
      { passive: true }
    );
  }

  function resetCanvas() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  function launchGame(payload) {
    if (!payload || !canvasEl) return false;
    const normalized = String(payload.game || '').trim().toLowerCase();
    if (normalized !== 'snake') {
      return false;
    }
    if (titleEl) titleEl.textContent = 'Snake';
    if (subtitleEl) {
      subtitleEl.textContent = `Basispunkte: ${payload.points}. Sammle Futter für Multiplikator.`;
    }
    initState(payload.points);
    setStatus('Bereit für die Runde. Klick auf Start.', 'info');
    resetCanvas();
    render();
    setOverlayVisible(true);
    return true;
  }

  function closeOverlay() {
    if (gameState?.status === 'running') {
      endGame({ canceled: true });
    }
    if (tickHandle) {
      window.clearTimeout(tickHandle);
      tickHandle = null;
    }
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
    setOverlayVisible(false);
    gameState = null;
  }

  startBtn?.addEventListener('click', startGame);
  giveUpBtn?.addEventListener('click', () => {
    endGame({ canceled: true });
  });
  closeBtn?.addEventListener('click', closeOverlay);
  document.addEventListener('keydown', handleKeydown);
  dpadButtons.forEach((btn) => btn.addEventListener('click', handleDpad));
  canvasEl?.addEventListener('click', () => {
    if (gameState?.status === 'ready') {
      startGame();
    }
  });
  bindTouchControls();

  window.GameManager = {
    launchGame,
  };
})();
