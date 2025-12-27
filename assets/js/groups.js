(function () {
  const form = document.getElementById('groupForm');
  const nameInput = document.getElementById('groupName');
  const membersInput = document.getElementById('groupMembers');
  const statusEl = document.getElementById('groupStatus');
  const listEl = document.getElementById('groupList');
  const STORAGE_KEY = 'loyaltyGroups';
  const ID_PREFIX = 'group-';

  function loadGroups() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveGroups(groups) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  }

  function updateGroup(id, updater) {
    const groups = loadGroups();
    const index = groups.findIndex((group) => group.id === id);
    if (index === -1) return;
    const updated = updater(groups[index]);
    if (updated) {
      groups[index] = updated;
      saveGroups(groups);
      renderGroups();
    }
  }

  function renderGroups() {
    if (!listEl) return;
    const groups = loadGroups();
    listEl.innerHTML = '';
    if (!groups.length) {
      listEl.innerHTML = '<li class="muted">Keine Gruppen gespeichert.</li>';
      return;
    }
    groups.forEach((group) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <strong>${group.name}</strong><br />
        <span class="muted">${group.members.join(', ')}</span>
        <div class="group-inline">
          <input type="email" class="group-input" placeholder="Neue E-Mail hinzufuegen" />
          <button class="btn btn-secondary" data-group="${group.id}">Hinzufuegen</button>
        </div>
      `;
      const addButton = item.querySelector('button');
      const input = item.querySelector('input');
      addButton?.addEventListener('click', () => {
        const email = input.value.trim();
        if (!email) {
          setStatus('Bitte eine E-Mail-Adresse eintragen.', 'warning');
          return;
        }
        if (!validateEmails([email])) {
          setStatus('E-Mail-Adresse ist ungueltig.', 'warning');
          return;
        }
        updateGroup(group.id, (current) => {
          if (current.members.includes(email)) {
            setStatus('Mitglied ist bereits vorhanden.', 'info');
            return null;
          }
          return {
            ...current,
            members: [...current.members, email],
          };
        });
        input.value = '';
        setStatus('Mitglied hinzugefuegt.', 'success');
      });
      listEl.appendChild(item);
    });
  }

  function validateEmails(emailList) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailList.every((email) => emailPattern.test(email));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const name = nameInput.value.trim();
    const members = membersInput.value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!name) {
      return setStatus('Bitte einen Gruppenname angeben.', 'warning');
    }
    if (!members.length || !validateEmails(members)) {
      return setStatus('Mindestens eine gueltige E-Mail-Adresse eintragen.', 'warning');
    }

    const groups = loadGroups();
    groups.push({ id: `${ID_PREFIX}${Date.now()}`, name, members });
    saveGroups(groups);
    renderGroups();
    form.reset();
    setStatus('Gruppe gespeichert.', 'success');
  }

  function setStatus(message, type = 'info') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `status-pill status-${type}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderGroups();
    form?.addEventListener('submit', handleSubmit);
  });
})();
