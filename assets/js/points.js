(function () {
  const STORAGE_KEY = 'loyaltyPoints';
  const rewardListEl = document.getElementById('rewardList');
  const balanceEl = document.getElementById('pointsBalance');
  const messageEl = document.getElementById('pointsMessage');
  const addBtn = document.getElementById('addPoints');
  const redeemBtn = document.getElementById('redeemPoints');
  const earnDemoBtn = document.getElementById('earnDemo');

  const rewards = [
    { id: 'coffee', name: 'Gratis Kaffee', cost: 15 },
    { id: 'delivery', name: 'Versandkostenfrei', cost: 25 },
    { id: 'voucher', name: '10€ Gutschein', cost: 50 },
  ];

  function getBalance() {
    try {
      return Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    } catch (error) {
      console.error('Konnte Punkte nicht laden', error);
      return 0;
    }
  }

  function setBalance(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.max(0, value)));
      updateUI();
    } catch (error) {
      console.error('Konnte Punkte nicht speichern', error);
      showMessage('Punkte konnten nicht gespeichert werden.', 'danger');
    }
  }

  function addPoints(amount, reason = 'Punkte hinzugefügt') {
    const newBalance = getBalance() + amount;
    setBalance(newBalance);
    showMessage(`${reason}: +${amount} Punkte`, 'success');
  }

  function deductPoints(amount, reason = 'Punkte eingelöst') {
    const current = getBalance();
    if (current < amount) {
      showMessage('Nicht genügend Punkte verfügbar.', 'warning');
      return false;
    }
    setBalance(current - amount);
    showMessage(`${reason}: -${amount} Punkte`, 'info');
    return true;
  }

  function showMessage(text, type = 'info') {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `status-pill status-${type}`;
  }

  function updateUI() {
    if (balanceEl) {
      balanceEl.textContent = getBalance();
    }
    renderRewards();
  }

  function renderRewards() {
    if (!rewardListEl) return;
    rewardListEl.innerHTML = '';
    rewards.forEach((reward) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${reward.name}</span>
        <span class="muted">${reward.cost} Punkte</span>
      `;
      const redeemButton = document.createElement('button');
      redeemButton.textContent = 'Einlösen';
      redeemButton.className = 'btn btn-secondary';
      redeemButton.addEventListener('click', () => {
        const success = deductPoints(reward.cost, reward.name);
        if (success) {
          showMessage(`${reward.name} eingelöst!`, 'success');
        }
      });
      li.appendChild(redeemButton);
      rewardListEl.appendChild(li);
    });
  }

  function bindButtons() {
    if (addBtn) {
      addBtn.addEventListener('click', () => addPoints(10));
    }
    if (redeemBtn) {
      redeemBtn.addEventListener('click', () => deductPoints(5));
    }
    if (earnDemoBtn) {
      earnDemoBtn.addEventListener('click', () => addPoints(8, 'Demo-Bonus'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    bindButtons();
  });

  window.PointsManager = {
    addPoints,
    deductPoints,
    getBalance,
    renderRewards,
  };
})();
