(function () {
  const overlayEl = document.getElementById('menuOverlay');
  const toggleEl = document.getElementById('menuToggle');
  const closeEl = document.getElementById('menuClose');
  const loginTrigger = document.getElementById('loginTrigger');
  const links = document.querySelectorAll('.menu-list a');

  function setOverlayVisible(visible) {
    if (!overlayEl) return;
    overlayEl.classList.toggle('is-visible', visible);
    overlayEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  toggleEl?.addEventListener('click', () => setOverlayVisible(true));
  closeEl?.addEventListener('click', () => setOverlayVisible(false));
  loginTrigger?.addEventListener('click', () => setOverlayVisible(false));
  overlayEl?.addEventListener('click', (event) => {
    if (event.target === overlayEl) {
      setOverlayVisible(false);
    }
  });
  links.forEach((link) => {
    link.addEventListener('click', () => setOverlayVisible(false));
  });
})();
