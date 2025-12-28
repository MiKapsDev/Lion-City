(function () {
  const STORAGE_KEY = 'loyaltyPoints';
  const TRANSACTIONS_KEY = 'loyaltyTransactions';
  const rewardListEl = document.getElementById('rewardList');
  const balanceEl = document.getElementById('pointsBalance');
  const messageEl = document.getElementById('pointsMessage');

  const rewards = [
    { id: 'coffee', name: 'Gratis Kaffee', cost: 15 },
    { id: 'delivery', name: 'Versandkostenfrei', cost: 25 },
    { id: 'voucher', name: '10 EUR Gutschein', cost: 50 },
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

  function loadTransactions() {
    try {
      return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveTransactions(items) {
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Konnte Transaktionen nicht speichern', error);
    }
  }

  function generateKey() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const blocks = Array.from({ length: 3 }, () => {
      return Array.from({ length: 4 }, () => {
        return alphabet[Math.floor(Math.random() * alphabet.length)];
      }).join('');
    });
    return `LC-${blocks.join('-')}`;
  }

  function addTransaction({ type, amount, reason, key }) {
    const transactions = loadTransactions();
    const entry = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      amount,
      reason,
      key: key || null,
      timestamp: new Date().toISOString(),
    };
    transactions.unshift(entry);
    saveTransactions(transactions.slice(0, 24));
    renderTransactions();
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderTransactions() {
    const transactionListEl = document.getElementById('transactionList');
    if (!transactionListEl) return;
    const transactions = loadTransactions();
    transactionListEl.innerHTML = '';
    if (transactions.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'transaction-item transaction-empty';
      empty.textContent = 'Noch keine Transaktionen.';
      transactionListEl.appendChild(empty);
      return;
    }
    transactions.forEach((entry) => {
      const reasonText =
        entry.reason || (entry.type === 'spend' ? 'Einlösen' : 'QR-Scan');
      const li = document.createElement('li');
      li.className = `transaction-item transaction-${entry.type}`;
      const sign = entry.type === 'spend' ? '-' : '+';
      const keyLine = entry.key ? `<span class="transaction-key">Key: ${entry.key}</span>` : '';
      li.innerHTML = `
        <div class="transaction-main">
          <span class="transaction-reason">${reasonText}</span>
          ${keyLine}
        </div>
        <div class="transaction-meta">
          <span class="transaction-amount">${sign}${entry.amount} Punkte</span>
          <span class="transaction-time">${formatTimestamp(entry.timestamp)}</span>
        </div>
      `;
      transactionListEl.appendChild(li);
    });
  }

  function addPoints(amount, reason = 'Punkte hinzugefuegt') {
    const safeReason = reason || 'QR-Scan';
    addTransaction({
      type: 'earn',
      amount,
      reason: safeReason,
    });
    const newBalance = getBalance() + amount;
    setBalance(newBalance);
    if (safeReason) {
      showMessage(`${safeReason}: +${amount} Punkte`, 'success');
      return;
    }
    showMessage(`+${amount} Punkte`, 'success');
  }

  function deductPoints(amount, reason = 'Punkte eingeloest', options = {}) {
    const current = getBalance();
    if (current < amount) {
      showMessage('Nicht genuegend Punkte verfuegbar.', 'warning');
      return { success: false, key: null };
    }
    const newBalance = current - amount;
    const key = options.includeKey ? generateKey() : null;
    const safeReason = reason || 'Einlösen';
    addTransaction({
      type: 'spend',
      amount,
      reason: safeReason,
      key,
    });
    setBalance(newBalance);
    if (key) {
      showMessage(`${safeReason}: -${amount} Punkte | Key: ${key}`, 'info');
    } else {
      showMessage(`${safeReason}: -${amount} Punkte`, 'info');
    }
    return { success: true, key };
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
    renderTransactions();
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
        const result = deductPoints(reward.cost, reward.name, { includeKey: true });
        if (result.success) {
          const keySuffix = result.key ? ` Key: ${result.key}` : '';
          showMessage(`${reward.name} eingeloest!${keySuffix}`, 'success');
        }
      });
      li.appendChild(redeemButton);
      rewardListEl.appendChild(li);
    });
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem('loyaltyDiscountUses');
    localStorage.removeItem('loyaltyGroups');
    saveTransactions([]);
    showMessage('Demo zurückgesetzt.', 'info');
    updateUI();
    renderTransactions();
    window.dispatchEvent(new Event('demo:reset'));
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.id === 'resetDemo') {
      handleReset();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateUI();
    });
  } else {
    updateUI();
  }

  window.PointsManager = {
    addPoints,
    deductPoints,
    getBalance,
    renderRewards,
    renderTransactions,
    resetDemo: handleReset,
  };
})();








