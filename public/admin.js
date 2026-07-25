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

const tabParticipants = document.getElementById('tabParticipants');
const tabCollaborators = document.getElementById('tabCollaborators');
const participantsView = document.getElementById('participantsView');
const collaboratorsView = document.getElementById('collaboratorsView');
const panelTitle = document.getElementById('panelTitle');

const newCollaboratorForm = document.getElementById('newCollaboratorForm');
const newCollaboratorName = document.getElementById('newCollaboratorName');
const collaboratorsStatus = document.getElementById('collaboratorsStatus');
const collaboratorsBody = document.getElementById('collaboratorsBody');

const SESSION_KEY = 'rifaAdminKey';
let participantsCache = [];
let collaboratorsCache = [];

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Pestanas ----------
function switchTab(tab) {
  const isParticipants = tab === 'participants';
  tabParticipants.classList.toggle('is-active', isParticipants);
  tabCollaborators.classList.toggle('is-active', !isParticipants);
  participantsView.hidden = !isParticipants;
  collaboratorsView.hidden = isParticipants;
  panelTitle.textContent = isParticipants ? 'Participantes' : 'Colaboradores';

  if (!isParticipants && collaboratorsCache.length === 0) {
    loadCollaborators();
  }
}

tabParticipants.addEventListener('click', () => switchTab('participants'));
tabCollaborators.addEventListener('click', () => switchTab('collaborators'));

// ---------- Participantes ----------
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
          (p.phone || '').toLowerCase().includes(term) ||
          (p.soldBy || '').toLowerCase().includes(term)
        );
      })
    : participants;

  if (filtered.length === 0) {
    participantsBody.innerHTML = `<tr><td colspan="7"><div class="admin-empty">No hay resultados.</div></td></tr>`;
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
          <td>${escapeHtml(p.soldBy || '—')}</td>
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

// ---------- Colaboradores ----------
function buildSellerUrl(code) {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.search = `?v=${code}`;
  url.hash = '';
  return url.toString();
}

async function loadCollaborators() {
  collaboratorsStatus.textContent = 'Cargando...';
  try {
    const res = await apiFetch('/api/admin/collaborators');
    if (res.status === 401) {
      clearStoredKey();
      showLogin('Clave incorrecta o vencida. Intenta de nuevo.');
      return;
    }
    if (!res.ok) throw new Error('Error al obtener los colaboradores.');

    collaboratorsCache = await res.json();
    renderCollaborators(collaboratorsCache);
    collaboratorsStatus.textContent = '';
  } catch (err) {
    console.error(err);
    collaboratorsStatus.textContent = 'Error al conectar con el servidor.';
    collaboratorsStatus.style.color = '#a83832';
  }
}

function renderCollaborators(collaborators) {
  if (collaborators.length === 0) {
    collaboratorsBody.innerHTML = `<tr><td colspan="4"><div class="admin-empty">Todavía no has agregado colaboradores.</div></td></tr>`;
    return;
  }

  collaboratorsBody.innerHTML = collaborators
    .map((c) => {
      const sellerUrl = buildSellerUrl(c.code);
      const statusPill = c.active
        ? '<span class="status-pill status-pill--paid">Activo</span>'
        : '<span class="status-pill status-pill--pending">Inactivo</span>';
      const toggleLabel = c.active ? 'Desactivar' : 'Activar';

      return `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>
            <span class="seller-link">
              <button type="button" class="seller-link__copy" data-url="${escapeHtml(sellerUrl)}">Copiar enlace</button>
            </span>
          </td>
          <td>${statusPill}</td>
          <td>
            <button type="button" class="toggle-paid-btn" data-id="${c._id}" data-action="toggle" data-active="${c.active}">${toggleLabel}</button>
            <button type="button" class="toggle-paid-btn toggle-paid-btn--unmark" data-id="${c._id}" data-action="delete">Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join('');

  collaboratorsBody.querySelectorAll('.seller-link__copy').forEach((btn) => {
    btn.addEventListener('click', () => copySellerLink(btn));
  });

  collaboratorsBody.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
    btn.addEventListener('click', () => toggleCollaborator(btn));
  });

  collaboratorsBody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteCollaborator(btn));
  });
}

async function copySellerLink(button) {
  const url = button.dataset.url;
  const originalText = button.textContent;
  try {
    await navigator.clipboard.writeText(url);
  } catch (err) {
    console.error('No se pudo copiar el enlace:', err);
  }
  button.textContent = '¡Copiado!';
  button.classList.add('is-copied');
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('is-copied');
  }, 1800);
}

async function toggleCollaborator(button) {
  const id = button.dataset.id;
  const nextActive = button.dataset.active !== 'true';

  button.disabled = true;
  try {
    const res = await apiFetch(`/api/admin/collaborators/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nextActive }),
    });
    if (!res.ok) throw new Error('No se pudo actualizar.');
    await loadCollaborators();
  } catch (err) {
    console.error(err);
    collaboratorsStatus.textContent = 'No se pudo actualizar el colaborador.';
    collaboratorsStatus.style.color = '#a83832';
    button.disabled = false;
  }
}

async function deleteCollaborator(button) {
  const id = button.dataset.id;
  const confirmed = window.confirm(
    'Esto elimina el colaborador y su enlace de venta dejara de funcionar. Las ventas ya registradas con su nombre no se borran. Continuar?'
  );
  if (!confirmed) return;

  button.disabled = true;
  try {
    const res = await apiFetch(`/api/admin/collaborators/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('No se pudo eliminar.');
    await loadCollaborators();
  } catch (err) {
    console.error(err);
    collaboratorsStatus.textContent = 'No se pudo eliminar el colaborador.';
    collaboratorsStatus.style.color = '#a83832';
    button.disabled = false;
  }
}

newCollaboratorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = newCollaboratorName.value.trim();
  if (!name) return;

  try {
    const res = await apiFetch('/api/admin/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo crear el colaborador.');
    }
    newCollaboratorName.value = '';
    await loadCollaborators();
  } catch (err) {
    console.error(err);
    collaboratorsStatus.textContent = err.message || 'Error al crear el colaborador.';
    collaboratorsStatus.style.color = '#a83832';
  }
});

// ---------- Login ----------
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

refreshAdminBtn.addEventListener('click', () => {
  loadParticipants();
  if (!collaboratorsView.hidden) loadCollaborators();
});

searchInput.addEventListener('input', () => renderTable(participantsCache));

// Si ya habia una clave guardada en esta sesion del navegador, entra directo.
if (getStoredKey()) {
  showPanel();
  loadParticipants();
} else {
  showLogin();
}
