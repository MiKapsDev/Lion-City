(function () {
  const overlayEl = document.getElementById('loginOverlay');
  const triggerEl = document.getElementById('loginTrigger');
  const closeEl = document.getElementById('loginClose');
  const formEl = document.getElementById('loginForm');
  const statusEl = document.getElementById('loginStatus');

  function setOverlayVisible(visible) {
    if (!overlayEl) return;
    overlayEl.classList.toggle('is-visible', visible);
    overlayEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!formEl) return;
    const data = new FormData(formEl);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '').trim();
    if (!email || !password) {
      if (statusEl) {
        statusEl.textContent = 'Bitte E-Mail und Passwort ausfüllen.';
        statusEl.className = 'status-pill status-warning';
      }
      return;
    }
    if (statusEl) {
      statusEl.textContent = `Dummy Login gespeichert: ${email}`;
      statusEl.className = 'status-pill status-success';
    }
    formEl.reset();
  }

  triggerEl?.addEventListener('click', () => setOverlayVisible(true));
  closeEl?.addEventListener('click', () => setOverlayVisible(false));
  overlayEl?.addEventListener('click', (event) => {
    if (event.target === overlayEl) {
      setOverlayVisible(false);
    }
  });
  formEl?.addEventListener('submit', handleSubmit);
})();
