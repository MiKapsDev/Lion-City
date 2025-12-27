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
      cost: 30,
      uses: 1,
    },
  ];

  const STORAGE_KEY = 'loyaltyDiscountUses';
  const container = document.getElementById('discountContainer');

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
      const card = document.createElement('article');
      card.className = 'discount-card';
      card.innerHTML = `
        <div>
          <p class="label">Shop mit Points</p>
          <h4>${item.title}</h4>
          <p class="muted">${item.description}</p>
        </div>
        <div class="discount-meta">
          <span class="discount-cost">${item.cost} Punkte</span>
        <span class="discount-uses">${remaining}x verfuegbar</span>
        </div>
        <button class="btn btn-primary" data-id="${item.id}">Einlösen</button>
      `;
      const redeemButton = card.querySelector('button');
      redeemButton.disabled = remaining <= 0;
      if (remaining <= 0) {
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
    if (remaining <= 0) return;
    if (window.PointsManager?.deductPoints(item.cost, item.title)) {
      uses[item.id] = remaining - 1;
      saveUses(uses);
      animateRedeem(card);
      renderDiscounts();
      alert(`${item.title} gesichert!`);
    }
  }

  function animateRedeem(card) {
    if (!card) return;
    card.classList.remove('is-claiming');
    void card.offsetWidth;
    card.classList.add('is-claiming');
  }

  document.addEventListener('DOMContentLoaded', renderDiscounts);
})();
