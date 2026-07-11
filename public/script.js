const board = document.getElementById('board');
const statusMessage = document.getElementById('statusMessage');
const refreshBtn = document.getElementById('refreshBtn');

const statAvailable = document.getElementById('statAvailable');
const statTaken = document.getElementById('statTaken');
const statTotal = document.getElementById('statTotal');

const modalOverlay = document.getElementById('modalOverlay');
const modalNumber = document.getElementById('modalNumber');
const modalClose = document.getElementById('modalClose');
const cancelBtn = document.getElementById('cancelBtn');
const registerForm = document.getElementById('registerForm');
const modalError = document.getElementById('modalError');
const confirmBtn = document.getElementById('confirmBtn');

let selectedNumber = null;
let numbersCache = [];

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#b7443f' : '';
}

function renderStats(numbers) {
  const taken = numbers.filter((n) => n.taken).length;
  statAvailable.textContent = numbers.length - taken;
  statTaken.textContent = taken;
  statTotal.textContent = numbers.length;
}

function renderBoard(numbers) {
  board.innerHTML = '';
  numbers.forEach((n) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ticket' + (n.taken ? ' ticket--taken' : '');
    btn.dataset.number = n.number;

    const label = document.createElement('span');
    label.textContent = String(n.number).padStart(2, '0');
    btn.appendChild(label);

    if (n.taken) {
      const stamp = document.createElement('span');
      stamp.className = 'ticket__stamp';
      stamp.textContent = 'APARTADO';
      btn.appendChild(stamp);
      btn.setAttribute('aria-label', `Número ${n.number}, apartado`);
      btn.disabled = false; // sigue siendo clicable para mostrar mensaje, pero no abre el modal
    } else {
      btn.setAttribute('aria-label', `Número ${n.number}, disponible`);
    }

    btn.addEventListener('click', () => handleTicketClick(n));
    board.appendChild(btn);
  });
}

function handleTicketClick(numberData) {
  if (numberData.taken) {
    setStatus(`El número ${numberData.number} ya está apartado.`, true);
    return;
  }
  openModal(numberData.number);
}

async function loadNumbers({ silent } = {}) {
  if (!silent) setStatus('Cargando números...');
  try {
    const res = await fetch('/api/numbers');
    if (!res.ok) throw new Error('No se pudo cargar la lista de números.');
    const numbers = await res.json();
    numbersCache = numbers;
    renderBoard(numbers);
    renderStats(numbers);
    if (!silent) setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('Error al conectar con el servidor. Intenta actualizar.', true);
  }
}

function openModal(number) {
  selectedNumber = number;
  modalNumber.textContent = String(number).padStart(2, '0');
  modalError.hidden = true;
  registerForm.reset();
  modalOverlay.hidden = false;
  document.getElementById('fieldName').focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  selectedNumber = null;
}

modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (selectedNumber === null) return;

  modalError.hidden = true;
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Guardando...';

  const payload = {
    name: document.getElementById('fieldName').value.trim(),
    email: document.getElementById('fieldEmail').value.trim(),
    phone: document.getElementById('fieldPhone').value.trim(),
    notes: document.getElementById('fieldNotes').value.trim(),
  };

  try {
    const res = await fetch(`/api/numbers/${selectedNumber}/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      modalError.textContent = data.error || 'No se pudo apartar el número.';
      modalError.hidden = false;
      // Si ya estaba tomado por otra persona, refrescamos el tablero para reflejarlo
      if (res.status === 409) {
        await loadNumbers({ silent: true });
      }
      return;
    }

    setStatus(`¡Número ${selectedNumber} apartado con éxito!`);
    closeModal();
    await loadNumbers({ silent: true });
  } catch (err) {
    console.error(err);
    modalError.textContent = 'Error de conexión. Intenta de nuevo.';
    modalError.hidden = false;
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmar y apartar';
  }
});

refreshBtn.addEventListener('click', () => loadNumbers());

loadNumbers();
