const board = document.getElementById('board');
const statusMessage = document.getElementById('statusMessage');
const refreshBtn = document.getElementById('refreshBtn');

const statAvailable = document.getElementById('statAvailable');
const statTaken = document.getElementById('statTaken');
const statTotal = document.getElementById('statTotal');
const statPaid = document.getElementById('statPaid');

const modalOverlay = document.getElementById('modalOverlay');
const modalNumber = document.getElementById('modalNumber');
const modalClose = document.getElementById('modalClose');
const cancelBtn = document.getElementById('cancelBtn');
const registerForm = document.getElementById('registerForm');
const modalError = document.getElementById('modalError');
const confirmBtn = document.getElementById('confirmBtn');

const paymentOverlay = document.getElementById('paymentOverlay');
const paymentNumber = document.getElementById('paymentNumber');
const paymentClose = document.getElementById('paymentClose');
const paymentDoneBtn = document.getElementById('paymentDoneBtn');
const paymentTitle = document.getElementById('paymentTitle');

const sellerBanner = document.getElementById('sellerBanner');
const sellerName = document.getElementById('sellerName');

const SELLER_STORAGE_KEY = 'rifaSellerCode';
let activeSellerCode = '';

let selectedNumber = null;
let numbersCache = [];

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#a83832' : '';
}

function renderStats(numbers) {
  const taken = numbers.filter((n) => n.taken).length;
  const paid = numbers.filter((n) => n.paid).length;
  statAvailable.textContent = numbers.length - taken;
  statTaken.textContent = taken;
  statTotal.textContent = numbers.length;
  if (statPaid) statPaid.textContent = paid;
}

function renderBoard(numbers) {
  board.innerHTML = '';
  numbers.forEach((n) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ticket' + (n.taken ? ' ticket--taken' : '') + (n.paid ? ' ticket--paid' : '');
    btn.dataset.number = n.number;

    const label = document.createElement('span');
    label.className = 'ticket__number';
    label.textContent = String(n.number).padStart(3, '0');
    btn.appendChild(label);

    if (n.taken) {
      const stamp = document.createElement('span');
      stamp.className = 'ticket__stamp';
      stamp.textContent = n.paid ? 'PAGADO' : 'APARTADO';
      btn.appendChild(stamp);
      btn.setAttribute(
        'aria-label',
        `Número ${n.number}, ${n.paid ? 'pagado' : 'apartado'}. Toca para ver las instrucciones de pago.`
      );
    } else {
      btn.setAttribute('aria-label', `Número ${n.number}, disponible`);
    }

    btn.addEventListener('click', () => handleTicketClick(n));
    board.appendChild(btn);
  });
}

function handleTicketClick(numberData) {
  if (numberData.taken) {
    // Un numero ya apartado reabre las instrucciones de pago,
    // sin volver a mostrar el formulario de registro.
    openPaymentModal(numberData.number, { justRegistered: false });
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

// ---------- Modal de registro ----------
function openModal(number) {
  selectedNumber = number;
  modalNumber.textContent = String(number).padStart(3, '0');
  modalError.hidden = true;
  registerForm.reset();
  modalOverlay.hidden = false;
  document.getElementById('fieldName').focus();
}

function closeModal() {
  modalOverlay.hidden = true;
}

modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (selectedNumber === null) return;

  modalError.hidden = true;

  const nameValue = document.getElementById('fieldName').value.trim();
  if (!nameValue) {
    modalError.textContent = 'El nombre es obligatorio.';
    modalError.hidden = false;
    document.getElementById('fieldName').focus();
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Guardando...';

  const payload = {
    name: nameValue,
    phone: document.getElementById('fieldPhone').value.trim(),
    sellerCode: activeSellerCode || undefined,
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

    const takenNumber = selectedNumber;
    closeModal();
    await loadNumbers({ silent: true });
    // Mostramos las instrucciones de pago justo despues de registrar.
    openPaymentModal(takenNumber, { justRegistered: true });
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

// ---------- Modal de pago (Nequi / DaviPlata) ----------
function openPaymentModal(number, { justRegistered } = {}) {
  paymentNumber.textContent = String(number).padStart(3, '0');
  paymentTitle.textContent = justRegistered ? '¡Número apartado!' : 'Instrucciones de pago';
  paymentOverlay.hidden = false;
}

function closePaymentModal() {
  paymentOverlay.hidden = true;
}

paymentClose.addEventListener('click', closePaymentModal);
paymentDoneBtn.addEventListener('click', closePaymentModal);
paymentOverlay.addEventListener('click', (e) => {
  if (e.target === paymentOverlay) closePaymentModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!paymentOverlay.hidden) closePaymentModal();
  else if (!modalOverlay.hidden) closeModal();
});

// ---------- Pago por Nequi / DaviPlata: copiar numero y abrir la app ----------
const PAYMENT_APPS = {
  nequi: {
    androidPackage: 'com.nequi.MobileApp',
    iosUrl: 'https://apps.apple.com/co/app/nequi-colombia/id1075378688',
    label: 'Nequi',
  },
  daviplata: {
    androidPackage: 'com.davivienda.daviplataapp',
    iosUrl: 'https://apps.apple.com/co/app/daviplata/id1100731780',
    label: 'DaviPlata',
  },
};

function getDeviceOS() {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'other';
}

function openPaymentApp(appKey) {
  const app = PAYMENT_APPS[appKey];
  if (!app) return;

  const os = getDeviceOS();
  if (os === 'android') {
    // Intenta abrir la app instalada; si no esta instalada, Android
    // redirige automaticamente a la tienda gracias a browser_fallback_url.
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${app.androidPackage}`;
    const fallback = encodeURIComponent(playStoreUrl);
    window.location.href = `intent://open#Intent;package=${app.androidPackage};S.browser_fallback_url=${fallback};end`;
  } else if (os === 'ios') {
    // No existe un esquema de enlace oficial documentado para abrir apps
    // bancarias directamente en iOS, asi que llevamos a la ficha del App Store.
    window.location.href = app.iosUrl;
  } else {
    setStatus(`Abre la app de ${app.label} desde tu celular para completar el pago.`);
  }
}

async function copyPhoneNumber(phone, button) {
  const originalHTML = button.innerHTML;
  try {
    await navigator.clipboard.writeText(phone);
  } catch (err) {
    // Respaldo para navegadores sin soporte de la Clipboard API
    const tempInput = document.createElement('input');
    tempInput.value = phone;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
    } catch (copyErr) {
      console.error('No se pudo copiar el numero:', copyErr);
    }
    document.body.removeChild(tempInput);
  }
  button.textContent = '¡Copiado!';
  button.classList.add('is-copied');
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.classList.remove('is-copied');
  }, 1800);
}

function setupPaymentButtons() {
  document.querySelectorAll('.pay-number__value').forEach((btn) => {
    btn.addEventListener('click', () => {
      copyPhoneNumber(btn.dataset.phone, btn);
    });
  });

  document.querySelectorAll('.app-btn').forEach((btn) => {
    btn.addEventListener('click', () => openPaymentApp(btn.dataset.app));
  });
}

setupPaymentButtons();

// ---------- Modo vendedor (colaboradores) ----------
// Si la pagina se abre con ?v=CODIGO, validamos el codigo contra el
// servidor y, si es valido, mostramos "Vendiendo como: Nombre" y
// adjuntamos ese codigo a cada numero que se registre desde este navegador.
async function initSellerMode() {
  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get('v');
  const storedCode = sessionStorage.getItem(SELLER_STORAGE_KEY);
  const codeToTry = urlCode || storedCode;

  if (!codeToTry) return;

  try {
    const res = await fetch(`/api/collaborators/${encodeURIComponent(codeToTry)}`);
    if (!res.ok) {
      // Codigo invalido o inactivo: no activamos el modo vendedor.
      sessionStorage.removeItem(SELLER_STORAGE_KEY);
      return;
    }
    const data = await res.json();
    activeSellerCode = codeToTry;
    sessionStorage.setItem(SELLER_STORAGE_KEY, codeToTry);
    sellerName.textContent = data.name;
    sellerBanner.hidden = false;

    // Limpiamos el codigo de la URL visible, sin recargar la pagina.
    if (urlCode) {
      const url = new URL(window.location.href);
      url.searchParams.delete('v');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (err) {
    console.error('No se pudo validar el codigo de vendedor:', err);
  }
}

initSellerMode();

loadNumbers();
