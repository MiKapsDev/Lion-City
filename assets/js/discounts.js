(function () {
  const discounts = [
    {
      id: 'smoothie',
      title: '20% auf Smoothies',
      description: 'Frische Bowls & Smoothies im City Store.',
      cost: 12,
      uses: 3,
    },
    {
      id: 'gear',
      title: '5 EUR Rabatt auf Bike-Gear',
      description: 'Perfekt fuer das naechste Abenteuer.',
      cost: 18,
      uses: 2,
    },
    {
      id: 'tickets',
      title: '2-for-1 Kinotickets',
      description: 'Nur donnerstags einloesbar.',
      minGroupMembers: 3,
      cost: 30,
      uses: 1,
    },
  ];

  const STORAGE_KEY = 'loyaltyDiscountUses';
  const GROUPS_KEY = 'loyaltyGroups';
  const container = document.getElementById('discountContainer');

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
      card.innerHTML = `
        <div>
          <p class="label">Shop mit Points</p>
          <h4>${item.title}</h4>
          <p class="muted">${item.description}</p>
          ${requirementNote}
        </div>
        <div class="discount-meta">
          <span class="discount-cost">${item.cost} Punkte</span>
        <span class="discount-uses">${remaining}x verfuegbar</span>
        </div>
        <button class="btn btn-primary" data-id="${item.id}">Einlösen</button>
      `;
      const redeemButton = card.querySelector('button');
      redeemButton.disabled = remaining <= 0 || !meetsGroupRequirement;
      if (!meetsGroupRequirement) {
        redeemButton.textContent = 'Gruppe erforderlich';
        redeemButton.classList.remove('btn-primary');
        redeemButton.classList.add('btn-ghost');
      } else if (remaining <= 0) {
        redeemButton.textContent = 'Ausverkauft';
        redeemButton.classList.remove('btn-primary');
        redeemButton.classList.add('btn-ghost');
        redeemButton.classList.add('btn-soldout');
      }
      redeemButton?.addEventListener('click', () => handleRedeem(item, card));
      container.appendChild(card);
    });
  }

  function handleRedeem(item, card) {
    const uses = loadUses();
    const remaining = getRemainingUses(uses, item);
    if (item.minGroupMembers && !hasQualifiedGroup(item.minGroupMembers)) return;
    if (remaining <= 0) return;
    const result = window.PointsManager?.deductPoints(item.cost, item.title, {
      includeKey: true,
    });
    if (result?.success) {
      uses[item.id] = remaining - 1;
      saveUses(uses);
      animateRedeem(card);
      renderDiscounts();
      const keySuffix = result.key ? ` Key: ${result.key}` : '';
      alert(`${item.title} gesichert!${keySuffix}`);
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
