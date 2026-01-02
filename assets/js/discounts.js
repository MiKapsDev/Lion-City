(function () {
  const discounts = [
    {
      id: 'smoothie',
      title: '20% auf Smoothies',
      description: 'Frische Bowls & Smoothies im City Store.',
      minGroupMembers: 2,
      cost: 12,
      uses: 3,
    },
    {
      id: 'gear',
      title: '5€ Rabatt auf Bike-Gear',
      description: 'Perfekt fuer das naechste Abenteuer.',
      minGroupMembers: 3,
      cost: 18,
      uses: 2,
    },
    {
      id: 'tickets',
      title: 'ÖPNV Tageskarte Ermäßigung',
      description: '30% Rabatt auf eine Tageskarte im Stadtgebiet.',
      minGroupMembers: 4,
      cost: 30,
      uses: 1,
    },
  ];

  const STORAGE_KEY = 'loyaltyDiscountUses';
  const GROUPS_KEY = 'loyaltyGroups';
  const container = document.getElementById('discountContainer');
  let lastRedeem = null;

  function hasQualifiedGroup(minMembers) {
    try {
      const groups = JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]');
      return groups.some((group) => Array.isArray(group.members) && group.members.length >= minMembers);
    } catch (error) {
      return false;
    }
  }

  function loadUses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveUses(uses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uses));
  }

  function getRemainingUses(uses, item) {
    if (typeof uses[item.id] === 'number') return uses[item.id];
    return item.uses;
  }

  function renderDiscounts() {
    if (!container) return;
    const uses = loadUses();
    const balance = window.PointsManager?.getBalance?.() ?? 0;
    container.innerHTML = '';
    discounts.forEach((item) => {
      const remaining = getRemainingUses(uses, item);
      const meetsGroupRequirement = item.minGroupMembers
        ? hasQualifiedGroup(item.minGroupMembers)
        : true;
      const card = document.createElement('article');
      card.className = 'discount-card';
      const requirementNote = item.minGroupMembers
        ? `<p class="muted">Nur mit Gruppe (${item.minGroupMembers}+ Mitglieder).</p>`
        : '';
      const hasRedeem = lastRedeem && lastRedeem.id === item.id && lastRedeem.key;
      const redeemMarkup = hasRedeem
        ? `
          <div class="redeem-code" data-key="${lastRedeem.key}">
            <span class="redeem-code__label">Code</span>
            <span class="redeem-code__value">${lastRedeem.key}</span>
            <button class="redeem-copy" type="button" aria-label="Code kopieren">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 8V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4v-2h4V4h-8v4H8zM4 8h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zm0 2v10h8V10H4z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        `
        : `<button class="btn btn-primary" data-id="${item.id}">Einlösen</button>`;
      card.innerHTML = `
        <div>
          <p class="label">Shop mit Points</p>
          <h4>${item.title}</h4>
          <p class="muted">${item.description}</p>
          ${requirementNote}
        </div>
        <div class="discount-meta">
          <span class="discount-cost">${item.cost} Punkte</span>
        <span class="discount-uses">${remaining}x verfügbar</span>
        </div>
        ${redeemMarkup}
      `;
      const redeemButton = card.querySelector('button.btn');
      const copyButton = card.querySelector('.redeem-copy');
      if (redeemButton) {
        redeemButton.disabled = remaining <= 0 || !meetsGroupRequirement || balance < item.cost;
        if (!meetsGroupRequirement) {
          redeemButton.textContent = 'Gruppe erforderlich';
          redeemButton.classList.remove('btn-primary');
          redeemButton.classList.add('btn-ghost');
        } else if (remaining <= 0) {
          redeemButton.textContent = 'Ausverkauft';
          redeemButton.classList.remove('btn-primary');
          redeemButton.classList.add('btn-ghost');
          redeemButton.classList.add('btn-soldout');
        } else if (balance < item.cost) {
          redeemButton.textContent = 'Nicht genug Punkte';
          redeemButton.classList.remove('btn-primary');
          redeemButton.classList.add('btn-ghost');
        }
        redeemButton.addEventListener('click', () => handleRedeem(item, card));
      }
      if (copyButton) {
        copyButton.addEventListener('click', async () => {
          const wrap = copyButton.closest('.redeem-code');
          const key = wrap ? wrap.dataset.key : '';
          if (!key) return;
          try {
            await navigator.clipboard?.writeText(key);
            lastRedeem = null;
            renderDiscounts();
        } catch (error) {
          copyButton.classList.add('is-error');
          setTimeout(() => {
            copyButton.classList.remove('is-error');
          }, 1200);
        }
      });
    }
      container.appendChild(card);
    });
  }

  function handleRedeem(item, card) {
    const uses = loadUses();
    const remaining = getRemainingUses(uses, item);
    if (item.minGroupMembers && !hasQualifiedGroup(item.minGroupMembers)) return;
    if (remaining <= 0) return;
    const balance = window.PointsManager?.getBalance?.() ?? 0;
    if (balance < item.cost) return;
    const result = window.PointsManager?.deductPoints(item.cost, item.title, {
      includeKey: true,
    });
    if (result?.success) {
      uses[item.id] = remaining - 1;
      saveUses(uses);
      animateRedeem(card);
      lastRedeem = { id: item.id, key: result.key || '' };
      renderDiscounts();
    }
  }

  function animateRedeem(card) {
    if (!card) return;
    card.classList.remove('is-claiming');
    void card.offsetWidth;
    card.classList.add('is-claiming');
  }

  document.addEventListener('DOMContentLoaded', renderDiscounts);
  window.addEventListener('demo:reset', renderDiscounts);
  window.addEventListener('groups:updated', renderDiscounts);
})();



