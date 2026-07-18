const loginSection = document.getElementById('loginSection');
const panelSection = document.getElementById('panelSection');
const loginForm = document.getElementById('loginForm');
const adminKeyInput = document.getElementById('adminKeyInput');
const loginError = document.getElementById('loginError');

const refreshAdminBtn = document.getElementById('refreshAdminBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminStats = document.getElementById('adminStats');
const adminStatus = document.getElementById('adminStatus');
const searchInput = document.getElementById('searchInput');
const participantsBody = document.getElementById('participantsBody');

const SESSION_KEY = 'rifaAdminKey';
let participantsCache = [];

function getStoredKey() {
  return sessionStorage.getItem(SESSION_KEY) || '';
}

function setStoredKey(key) {
  sessionStorage.setItem(SESSION_KEY, key);
}

function clearStoredKey() {
  sessionStorage.removeItem(SESSION_KEY);
}

function showLogin(message) {
  loginSection.hidden = false;
  panelSection.hidden = true;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  } else {
    loginError.hidden = true;
  }
}

function showPanel() {
  loginSection.hidden = true;
  panelSection.hidden = false;
}

async function apiFetch(path, options = {}) {
  const key = getStoredKey();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'x-admin-key': key,
    },
  });
  return res;
}

async function loadParticipants({ silent } = {}) {
  if (!silent) adminStatus.textContent = 'Cargando...';
  try {
    const res = await apiFetch('/api/admin/participants');
    if (res.status === 401) {
      clearStoredKey();
      showLogin('Clave incorrecta o vencida. Intenta de nuevo.');
      return;
    }
    if (!res.ok) throw new Error('Error al obtener los participantes.');

    participantsCache = await res.json();
    renderStats(participantsCache);
    renderTable(participantsCache);
    adminStatus.textContent = '';
  } catch (err) {
    console.error(err);
    adminStatus.textContent = 'Error al conectar con el servidor.';
    adminStatus.style.color = '#a83832';
  }
}

function renderStats(participants) {
  const paid = participants.filter((p) => p.paid).length;
  const pending = participants.length - paid;
  adminStats.innerHTML = `
    <span><strong>${participants.length}</strong> apartados</span>
    <span><strong>${paid}</strong> pagados</span>
    <span><strong>${pending}</strong> pendientes</span>
  `;
}

function renderTable(participants) {
  const term = (searchInput.value || '').trim().toLowerCase();
  const filtered = term
    ? participants.filter((p) => {
        const num = String(p.number).padStart(3, '0');
        return (
          num.includes(term) ||
          (p.name || '').toLowerCase().includes(term) ||
          (p.phone || '').toLowerCase().includes(term)
        );
      })
    : participants;

  if (filtered.length === 0) {
    participantsBody.innerHTML = `<tr><td colspan="6"><div class="admin-empty">No hay resultados.</div></td></tr>`;
    return;
  }

  participantsBody.innerHTML = filtered
    .map((p) => {
      const takenDate = p.takenAt ? new Date(p.takenAt).toLocaleString('es-CO') : '—';
      const statusPill = p.paid
        ? '<span class="status-pill status-pill--paid">Pagado</span>'
        : '<span class="status-pill status-pill--pending">Pendiente</span>';
      const toggleBtn = p.paid
        ? `<button type="button" class="toggle-paid-btn toggle-paid-btn--unmark" data-number="${p.number}" data-paid="false">Desmarcar</button>`
        : `<button type="button" class="toggle-paid-btn toggle-paid-btn--mark" data-number="${p.number}" data-paid="true">Marcar pagado</button>`;

      return `
        <tr>
          <td class="admin-table__number">${String(p.number).padStart(3, '0')}</td>
          <td>${escapeHtml(p.name || '—')}</td>
          <td>${escapeHtml(p.phone || '—')}</td>
          <td>${takenDate}</td>
          <td>${statusPill}</td>
          <td>${toggleBtn}</td>
        </tr>
      `;
    })
    .join('');

  participantsBody.querySelectorAll('.toggle-paid-btn').forEach((btn) => {
    btn.addEventListener('click', () => togglePaid(btn));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function togglePaid(button) {
  const number = button.dataset.number;
  const paid = button.dataset.paid === 'true';

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Guardando...';

  try {
    const res = await apiFetch(`/api/admin/numbers/${number}/paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid }),
    });

    if (res.status === 401) {
      clearStoredKey();
      showLogin('Clave incorrecta o vencida. Intenta de nuevo.');
      return;
    }
    if (!res.ok) throw new Error('No se pudo actualizar.');

    await loadParticipants({ silent: true });
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = originalText;
    adminStatus.textContent = 'No se pudo actualizar ese número. Intenta de nuevo.';
    adminStatus.style.color = '#a83832';
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = adminKeyInput.value.trim();
  if (!key) return;

  setStoredKey(key);
  loginError.hidden = true;

  const res = await apiFetch('/api/admin/participants');
  if (res.status === 401) {
    clearStoredKey();
    showLogin('Clave incorrecta.');
    return;
  }
  if (!res.ok) {
    showLogin('Error al conectar con el servidor.');
    return;
  }

  participantsCache = await res.json();
  showPanel();
  renderStats(participantsCache);
  renderTable(participantsCache);
});

logoutBtn.addEventListener('click', () => {
  clearStoredKey();
  adminKeyInput.value = '';
  showLogin();
});

refreshAdminBtn.addEventListener('click', () => loadParticipants());

searchInput.addEventListener('input', () => renderTable(participantsCache));

// Si ya habia una clave guardada en esta sesion del navegador, entra directo.
if (getStoredKey()) {
  showPanel();
  loadParticipants();
} else {
  showLogin();
}
