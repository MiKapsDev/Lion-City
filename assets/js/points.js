(function () {
  const STORAGE_KEY = 'loyaltyPoints';
  const TRANSACTIONS_KEY = 'loyaltyTransactions';
  const DOUBLE_POINTS_KEY = 'loyaltyDoublePointsUntil';
  const DAILY_REWARD_KEY = 'loyaltyDailyRewards';
  const rewardListEl = document.getElementById('rewardList');
  const balanceEl = document.getElementById('pointsBalance');
  const messageEl = document.getElementById('pointsMessage');
  let lastRedeem = null;

  const rewards = [
    { id: 'coffee', name: 'Gratis Kaffee', cost: 15 },
    { id: 'voucher', name: 'Gutschein 5€ für teilnehmde Shops', cost: 25 },
    { id: 'double-points', name: 'Doppelte Punkte 1 std.', cost: 500 },
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
    const value = Array.from({ length: 6 }, () => {
      return alphabet[Math.floor(Math.random() * alphabet.length)];
    }).join('');
    return `LC-${value}`;
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

  function addPoints(amount, reason = 'Punkte hinzugefügt') {
    const safeReason = reason || 'QR-Scan';
    const boostedAmount = applyDoublePoints(amount, safeReason);
    addTransaction({
      type: 'earn',
      amount: boostedAmount,
      reason: safeReason,
    });
    const newBalance = getBalance() + boostedAmount;
    setBalance(newBalance);
    if (safeReason) {
      const suffix = boostedAmount !== amount ? ' (2x aktiv)' : '';
      showMessage(`${safeReason}: +${boostedAmount} Punkte${suffix}`, 'success');
      return;
    }
    showMessage(`+${boostedAmount} Punkte`, 'success');
  }

  function deductPoints(amount, reason = 'Punkte eingelöst', options = {}) {
    const current = getBalance();
    if (current < amount) {
      showMessage('Nicht genügend Punkte verfügbar.', 'warning');
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

  function getTodayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadDailyRewards() {
    try {
      return JSON.parse(localStorage.getItem(DAILY_REWARD_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function getDailyState() {
    const stored = loadDailyRewards();
    const today = getTodayStamp();
    if (stored.date !== today) {
      return { date: today, claims: {} };
    }
    return { date: stored.date, claims: stored.claims || {} };
  }

  function saveDailyState(state) {
    try {
      localStorage.setItem(DAILY_REWARD_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Konnte Daily-Rewards nicht speichern', error);
    }
  }

  function hasClaimedToday(rewardId) {
    const state = getDailyState();
    return Boolean(state.claims && state.claims[rewardId]);
  }

  function markClaimedToday(rewardId) {
    const state = getDailyState();
    state.claims[rewardId] = true;
    saveDailyState(state);
  }

  function getDoublePointsUntil() {
    try {
      const value = Number.parseInt(localStorage.getItem(DOUBLE_POINTS_KEY) || '0', 10);
      return Number.isNaN(value) ? 0 : value;
    } catch (error) {
      return 0;
    }
  }

  function isDoublePointsActive() {
    return Date.now() < getDoublePointsUntil();
  }

  function activateDoublePoints(durationMs = 60 * 60 * 1000) {
    try {
      localStorage.setItem(DOUBLE_POINTS_KEY, String(Date.now() + durationMs));
      showMessage('Doppelte Punkte für 1 Stunde aktiviert.', 'success');
    } catch (error) {
      console.error('Konnte Double-Points nicht speichern', error);
    }
  }

  function applyDoublePoints(amount, reason) {
    if (reason !== 'QR-Scan') return amount;
    if (!isDoublePointsActive()) return amount;
    return amount * 2;
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
    const balance = getBalance();
    rewardListEl.innerHTML = '';
    rewards.forEach((reward) => {
      const li = document.createElement('li');
      li.dataset.rewardId = reward.id;
      const claimedToday = hasClaimedToday(reward.id);
      const hasRedeem = lastRedeem && lastRedeem.id === reward.id && lastRedeem.key;
      if (hasRedeem) {
        li.classList.add('reward-redeem');
      }
      li.innerHTML = `
        <span>${reward.name}</span>
        <span class="muted">${reward.cost} Punkte</span>
      `;
      if (hasRedeem) {
        const codeWrap = document.createElement('div');
        codeWrap.className = 'redeem-code';
        codeWrap.dataset.key = lastRedeem.key;
        codeWrap.innerHTML = `
          <span class="redeem-code__label">Code</span>
          <span class="redeem-code__value">${lastRedeem.key}</span>
          <button class="redeem-copy" type="button" aria-label="Code kopieren">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4v-2h4V4h-8v4H8zM4 8h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zm0 2v10h8V10H4z" fill="currentColor"/>
            </svg>
          </button>
        `;
        const copyButton = codeWrap.querySelector('.redeem-copy');
        copyButton.addEventListener('click', async () => {
          const key = codeWrap.dataset.key;
          if (!key) return;
          try {
            await navigator.clipboard?.writeText(key);
            lastRedeem = null;
            renderRewards();
          } catch (error) {
            copyButton.classList.add('is-error');
            setTimeout(() => {
              copyButton.classList.remove('is-error');
            }, 1200);
          }
        });
        li.appendChild(codeWrap);
      } else {
        const redeemButton = document.createElement('button');
        redeemButton.textContent = claimedToday ? 'Heute eingelöst' : 'Einlösen';
        redeemButton.className = 'btn btn-secondary';
        if (claimedToday) {
          redeemButton.disabled = true;
          redeemButton.classList.add('btn-ghost');
        } else if (balance < reward.cost) {
          redeemButton.textContent = 'Nicht genug Punkte';
          redeemButton.disabled = true;
          redeemButton.classList.add('btn-ghost');
        }
        redeemButton.addEventListener('click', () => {
          if (hasClaimedToday(reward.id)) return;
          if (balance < reward.cost) return;
          const result = deductPoints(reward.cost, reward.name, { includeKey: true });
          if (result.success) {
            if (reward.id === 'double-points') {
              activateDoublePoints();
            }
            markClaimedToday(reward.id);
            lastRedeem = { id: reward.id, key: result.key || '' };
            renderRewards();
            const keySuffix = result.key ? ` Key: ${result.key}` : '';
            showMessage(`${reward.name} eingelöst!${keySuffix}`, 'success');
          }
        });
        li.appendChild(redeemButton);
      }
      rewardListEl.appendChild(li);
    });
  }
function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(DOUBLE_POINTS_KEY);
    localStorage.removeItem(DAILY_REWARD_KEY);
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







