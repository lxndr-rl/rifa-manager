const API = '/api';
let token = localStorage.getItem('token');
let currentRifaId = null;
let currentRifaImages = [];

// ===== Tema =====
(function initTheme() {
  const saved = localStorage.getItem('arimar-theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light');
})();

document.getElementById('btn-theme').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('arimar-theme', isDark ? 'light' : 'dark');
});

// ===== Fetch =====
async function fetchJSON(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) { logout(); throw new Error('Sesión expirada'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function uploadImages(rifaId, files) {
  const formData = new FormData();
  for (const f of files) formData.append('images', f);

  const res = await fetch(`${API}/rifas/${rifaId}/images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) { logout(); throw new Error('Sesión expirada'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error subiendo imágenes' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===== Toast =====
function showToast(message, type = 'success') {
  const icons = { success: '✓', error: '✕', info: 'i' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<div class="toast-icon">${icons[type] || '•'}</div><span>${esc(message)}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ===== Utils =====
function $(sel) { return document.querySelector(sel); }

function showSection(id) {
  ['login-section', 'rifa-list', 'rifa-detail'].forEach(s =>
    document.getElementById(s).classList.add('hidden')
  );
  document.getElementById(id).classList.remove('hidden');
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.dataset.orig = btn.dataset.orig || btn.textContent;
  btn.textContent = loading ? 'Cargando…' : btn.dataset.orig;
}

// ===== Auth =====
function checkAuth() {
  const header = document.getElementById('main-header');
  if (token) {
    header.classList.remove('hidden');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      $('#username-display').textContent = payload.username;
      document.getElementById('user-avatar').textContent = payload.username.charAt(0).toUpperCase();
    } catch (_) {}
    showSection('rifa-list');
    loadRifas();
  } else {
    header.classList.add('hidden');
    showSection('login-section');
  }
}

function logout() {
  token = null;
  localStorage.removeItem('token');
  checkAuth();
}

document.getElementById('btn-logout').addEventListener('click', logout);

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  setLoading(btn, true);
  try {
    const res = await fetchJSON(`${API}/auth/login`, {
      method: 'POST',
      body: { username: $('#login-user').value.trim(), password: $('#login-pass').value },
    });
    token = res.token;
    localStorage.setItem('token', token);
    checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ===== Rifas =====
async function loadRifas() {
  try {
    const rifas = await fetchJSON(`${API}/rifas`);
    const grid = document.getElementById('rifas-grid');

    if (rifas.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎟️</div>
          <h3>Sin rifas todavía</h3>
          <p>Crea tu primera rifa y empieza a vender tickets</p>
        </div>`;
      return;
    }

    grid.innerHTML = rifas.map(r => {
      const pct = r.totalNumeros > 0 ? Math.round((r.vendidos / r.totalNumeros) * 100) : 0;
      const thumbHtml = r.images && r.images.length > 0
        ? `<div class="rifa-card-thumb"><img src="${esc(r.images[0].url)}" alt="Premio"></div>`
        : `<div class="rifa-card-banner"></div>`;
      return `
        <div class="rifa-card" data-id="${r.id}">
          ${thumbHtml}
          <div class="rifa-card-body">
            <h3 class="rifa-card-title">${esc(r.nombre)}</h3>
            <div class="rifa-card-meta">
              <div class="rifa-card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
                ${esc(r.premio)}
              </div>
              <div class="rifa-card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${formatDate(r.fecha)}
              </div>
              <div class="rifa-card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                ${r.totalNumeros} números (1 – ${r.totalNumeros})
              </div>
            </div>
            <div class="rifa-progress">
              <div class="rifa-progress-header">
                <span class="rifa-progress-label">${r.vendidos} de ${r.totalNumeros} vendidos</span>
                <span class="rifa-progress-value">${pct}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
            </div>
            <div class="rifa-card-actions">
              <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${r.id}">Editar</button>
              <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);" data-action="delete" data-id="${r.id}">Eliminar</button>
              <button class="btn btn-sm" style="background:var(--primary-light);color:var(--primary);margin-left:auto;" data-action="share" data-id="${r.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Compartir
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delegación de eventos en la grilla de rifas
document.getElementById('rifas-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    e.stopPropagation();
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'edit') editRifa(id);
    else if (btn.dataset.action === 'delete') deleteRifa(id);
    else if (btn.dataset.action === 'share') shareRifa(id);
    return;
  }
  const card = e.target.closest('.rifa-card');
  if (card) openRifa(parseInt(card.dataset.id));
});

async function openRifa(id) {
  currentRifaId = id;
  showSection('rifa-detail');

  document.getElementById('rifa-info').innerHTML = '<div style="color:#c7d2fe;padding:0.5rem 0;opacity:.7;font-size:.875rem;">Cargando…</div>';
  document.getElementById('stats').innerHTML = '';
  document.getElementById('tickets-grid').innerHTML = '';
  document.getElementById('winners-banner').classList.add('hidden');
  document.getElementById('winners-banner').innerHTML = '';
  document.getElementById('rifa-images-gallery').innerHTML = '';

  try {
    const [rifa, tickets, stats] = await Promise.all([
      fetchJSON(`${API}/rifas/${id}`),
      fetchJSON(`${API}/tickets/rifa/${id}`),
      fetchJSON(`${API}/tickets/rifa/${id}/stats`),
    ]);

    currentRifaImages = rifa.images || [];

    document.getElementById('rifa-info').innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.625rem;">
        <h2 style="margin:0;">${esc(rifa.nombre)}</h2>
        <button class="btn btn-sm" onclick="shareRifa(${rifa.id})"
          style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2);flex-shrink:0;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Compartir
        </button>
      </div>
      <div class="rifa-hero-meta">
        <div class="rifa-hero-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
          ${esc(rifa.premio)}
        </div>
        <div class="rifa-hero-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${formatDate(rifa.fecha)}
        </div>
      </div>`;

    if (currentRifaImages.length > 0) {
      window._adminImages = currentRifaImages.map(img => img.url);
      document.getElementById('rifa-images-gallery').innerHTML = `
        <div class="prize-gallery">
          ${currentRifaImages.map((img, idx) => `
            <div class="gallery-item" data-image-idx="${idx}">
              <img src="${esc(img.url)}" alt="Premio" class="gallery-img">
            </div>
          `).join('')}
        </div>`;
    } else {
      window._adminImages = [];
    }

    document.getElementById('stats').innerHTML = `
      <div class="stat-card stat-total"><div class="stat-number">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card stat-sold"><div class="stat-number">${stats.vendidos}</div><div class="stat-label">Vendidos</div></div>
      <div class="stat-card stat-available"><div class="stat-number">${stats.disponibles}</div><div class="stat-label">Disponibles</div></div>
      ${stats.pagados > 0 ? `<div class="stat-card stat-paid"><div class="stat-number">${stats.pagados}</div><div class="stat-label">Pagados</div></div>` : ''}
      ${stats.pendientes > 0 ? `<div class="stat-card stat-pending"><div class="stat-number">${stats.pendientes}</div><div class="stat-label">Pendientes</div></div>` : ''}
      ${stats.ganadores > 0 ? `<div class="stat-card stat-winner"><div class="stat-number">${stats.ganadores}</div><div class="stat-label">Ganadores</div></div>` : ''}`;

    const winnerTickets = tickets.filter(t => t.ganador);
    if (winnerTickets.length > 0) {
      const banner = document.getElementById('winners-banner');
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <div class="winners-banner-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
          <div>
            <strong>Ganador${winnerTickets.length > 1 ? 'es' : ''}:</strong>
            ${winnerTickets.map(t => `
              <span class="winner-chip">
                #${t.numero}${t.comprador ? ' – ' + esc(t.comprador) : ''}
              </span>
            `).join('')}
          </div>
        </div>`;
    }

    document.getElementById('tickets-grid').innerHTML = tickets.map(t => `
      <div class="ticket ${t.vendido ? 'sold' + (t.pagado ? ' pagado' : '') : 'available'}${t.ganador ? ' winner' : ''}"
           data-id="${t.id}" data-numero="${t.numero}"
           data-comprador="${esc(t.comprador || '')}" data-telefono="${esc(t.telefono || '')}"
           data-vendido="${t.vendido}" data-pagado="${t.pagado}" data-ganador="${t.ganador}"
           title="${t.ganador ? '¡GANADOR! ' : ''}${t.vendido ? esc(t.comprador) + (t.telefono ? ' · ' + esc(t.telefono) : '') + (t.pagado ? ' · ✓ Pagado' : ' · Pendiente') : 'Disponible'}">
        ${t.numero}
        ${t.ganador ? '<span class="winner-star">★</span>' : ''}
      </div>`).join('');
  } catch (err) {
    showToast(err.message, 'error');
    showSection('rifa-list');
  }
}

// Delegación en grilla de tickets
document.getElementById('tickets-grid').addEventListener('click', (e) => {
  const t = e.target.closest('.ticket');
  if (!t) return;
  const { id, numero, comprador, telefono, vendido, pagado, ganador } = t.dataset;
  openTicket(parseInt(id), parseInt(numero), comprador, telefono, vendido === 'true', pagado === 'true', ganador === 'true');
});

// ===== Tickets =====
function openTicket(id, numero, comprador, telefono, vendido, pagado, ganador) {
  document.getElementById('ticket-id').value = id;
  document.getElementById('ticket-numero').textContent = numero;
  document.getElementById('ticket-comprador').value = comprador;
  document.getElementById('ticket-telefono').value = telefono;
  document.getElementById('ticket-pagado').checked = !!pagado;
  document.getElementById('ticket-ganador').checked = !!ganador;

  const btnUnmark = document.getElementById('btn-unmark');
  const btnSave = document.getElementById('btn-save-ticket');
  btnUnmark.classList.toggle('hidden', !vendido && !ganador);
  btnSave.textContent = (vendido || ganador) ? 'Actualizar' : 'Guardar';

  document.getElementById('modal-ticket').classList.remove('hidden');
  document.getElementById('ticket-comprador').focus();
}

function closeTicketModal() {
  document.getElementById('modal-ticket').classList.add('hidden');
}

$('#form-ticket').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ticket-id').value;
  const comprador = document.getElementById('ticket-comprador').value.trim();
  const telefono = document.getElementById('ticket-telefono').value.trim();
  const pagado = document.getElementById('ticket-pagado').checked;
  const ganador = document.getElementById('ticket-ganador').checked;

  if (!comprador && !ganador) {
    showToast('Ingresa un comprador o marca como ganador', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-ticket');
  setLoading(btn, true);
  try {
    await fetchJSON(`${API}/tickets/${id}`, {
      method: 'PUT',
      body: {
        comprador: ganador ? (comprador || 'Ganador') : comprador,
        telefono,
        vendido: !!comprador || ganador ? true : false,
        pagado,
        ganador,
      },
    });
    showToast('Ticket guardado', 'success');
    closeTicketModal();
    openRifa(currentRifaId);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
});

document.getElementById('btn-unmark').addEventListener('click', async () => {
  const id = document.getElementById('ticket-id').value;
  const numero = document.getElementById('ticket-numero').textContent;
  if (!confirm(`¿Liberar el ticket #${numero}?`)) return;

  try {
    await fetchJSON(`${API}/tickets/${id}`, {
      method: 'PUT',
      body: { comprador: null, telefono: null, vendido: false, pagado: false, ganador: false },
    });
    showToast(`Ticket #${numero} liberado`, 'info');
    closeTicketModal();
    openRifa(currentRifaId);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ===== Back =====
$('#btn-back').addEventListener('click', () => {
  showSection('rifa-list');
  currentRifaId = null;
  currentRifaImages = [];
  loadRifas();
});

// ===== Modal Rifa =====
$('#btn-new-rifa').addEventListener('click', () => {
  document.getElementById('modal-title').textContent = 'Nueva Rifa';
  document.getElementById('rifa-id').value = '';
  document.getElementById('form-rifa').reset();
  document.getElementById('rifa-total').value = 100;
  document.getElementById('images-preview').innerHTML = '';
  currentRifaImages = [];
  document.getElementById('modal-rifa').classList.remove('hidden');
  document.getElementById('rifa-nombre').focus();
});

function closeModal() { document.getElementById('modal-rifa').classList.add('hidden'); }

async function editRifa(id) {
  try {
    const rifa = await fetchJSON(`${API}/rifas/${id}`);
    document.getElementById('modal-title').textContent = 'Editar Rifa';
    document.getElementById('rifa-id').value = rifa.id;
    document.getElementById('rifa-nombre').value = rifa.nombre;
    document.getElementById('rifa-premio').value = rifa.premio;
    document.getElementById('rifa-fecha').value = new Date(rifa.fecha).toISOString().split('T')[0];
    document.getElementById('rifa-total').value = rifa.totalNumeros;
    currentRifaImages = rifa.images || [];
    renderImagesPreview();
    document.getElementById('modal-rifa').classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderImagesPreview() {
  const container = document.getElementById('images-preview');
  if (currentRifaImages.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = currentRifaImages.map(img => `
    <div class="image-preview-item" data-id="${img.id}">
      <img src="${esc(img.url)}" alt="Premio">
      <button class="image-remove-btn" onclick="removeImage(${img.id})" title="Eliminar imagen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

async function removeImage(imageId) {
  const rifaId = document.getElementById('rifa-id').value;
  if (!rifaId) return;
  try {
    await fetchJSON(`${API}/rifas/${rifaId}/images/${imageId}`, { method: 'DELETE' });
    currentRifaImages = currentRifaImages.filter(img => img.id !== imageId);
    renderImagesPreview();
    showToast('Imagen eliminada', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('rifa-images-input').addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const rifaId = document.getElementById('rifa-id').value;
  if (!rifaId) {
    showToast('Guarda la rifa primero para agregar imágenes', 'info');
    e.target.value = '';
    return;
  }

  try {
    const newImages = await uploadImages(parseInt(rifaId), files);
    currentRifaImages = [...currentRifaImages, ...newImages];
    renderImagesPreview();
    showToast(`${newImages.length} imagen${newImages.length > 1 ? 'es' : ''} subida${newImages.length > 1 ? 's' : ''}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
  e.target.value = '';
});

async function deleteRifa(id) {
  if (!confirm('¿Eliminar esta rifa y todos sus tickets?')) return;
  try {
    await fetchJSON(`${API}/rifas/${id}`, { method: 'DELETE' });
    showToast('Rifa eliminada', 'info');
    loadRifas();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

$('#form-rifa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('rifa-id').value;
  const body = {
    nombre: document.getElementById('rifa-nombre').value.trim(),
    premio: document.getElementById('rifa-premio').value.trim(),
    fecha: document.getElementById('rifa-fecha').value,
    totalNumeros: parseInt(document.getElementById('rifa-total').value) || 100,
  };

  try {
    if (id) {
      await fetchJSON(`${API}/rifas/${id}`, { method: 'PUT', body });
      showToast('Rifa actualizada', 'success');
    } else {
      const rifa = await fetchJSON(`${API}/rifas`, { method: 'POST', body });
      currentRifaId = rifa.id;
      document.getElementById('rifa-id').value = rifa.id;
      showToast('¡Rifa creada! Ahora puedes agregar imágenes del premio', 'success');
    }
    closeModal();
    loadRifas();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Cerrar modales al hacer clic en el fondo
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

// Cerrar modales con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
  }
});

// ===== Compartir =====
async function shareRifa(id) {
  const url = `${window.location.origin}/sorteo/${id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Arimar – Mira los números disponibles', url });
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado al portapapeles', 'success');
    }
  } catch (_) {
    prompt('Copia este enlace para compartir:', url);
  }
}

// ===== LIGHTBOX =====
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(index) {
  lightboxImages = window._adminImages || [];
  if (lightboxImages.length === 0) return;

  lightboxIndex = index;
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const prev = document.getElementById('lightbox-prev');
  const next = document.getElementById('lightbox-next');
  const counter = document.getElementById('lightbox-counter');

  img.src = lightboxImages[lightboxIndex];
  lightbox.classList.remove('hidden');

  if (lightboxImages.length > 1) {
    prev.classList.remove('hidden');
    next.classList.remove('hidden');
    counter.classList.remove('hidden');
    counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
  } else {
    prev.classList.add('hidden');
    next.classList.add('hidden');
    counter.classList.add('hidden');
  }

  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('hidden');
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');

  img.style.animation = 'none';
  void img.offsetWidth;
  img.style.animation = 'lightboxZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
  img.src = lightboxImages[lightboxIndex];
  counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

// Delegación de eventos para gallery items
document.addEventListener('click', (e) => {
  const galleryItem = e.target.closest('.gallery-item');
  if (galleryItem && galleryItem.dataset.imageIdx !== undefined) {
    openLightbox(parseInt(galleryItem.dataset.imageIdx));
  }
});

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
document.getElementById('lightbox-next').addEventListener('click', () => navigateLightbox(1));

document.getElementById('lightbox').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox.classList.contains('hidden')) return;

  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

checkAuth();
