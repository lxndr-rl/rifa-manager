const rifaId = window.location.pathname.split('/').pop();
const API = `/api/public/rifas/${rifaId}`;

// Tema
document.getElementById('btn-theme').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('arimar-theme', isDark ? 'light' : 'dark');
});

let lastUpdated = null;
let statsData = { total: 0, vendidos: 0, disponibles: 0, ganadores: 0 };
let currentRifaTotal = 100;

function padNum(n) {
  const digits = String(currentRifaTotal).length;
  return String(n).padStart(digits, '0');
}

// ===== Utils =====
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 10) return 'justo ahora';
  if (secs < 60) return `hace ${secs}s`;
  return `hace ${Math.floor(secs / 60)} min`;
}

function updateTimestamp() {
  if (!lastUpdated) return;
  const el = document.getElementById('update-text');
  if (el) el.textContent = `Actualizado ${timeAgo(lastUpdated)}`;
}

// ===== Live badge =====
function setLiveStatus(status) {
  const dot  = document.getElementById('live-dot');
  const text = document.getElementById('live-text');
  if (!dot || !text) return;

  if (status === 'connected') {
    dot.style.background  = '#a3e635';
    dot.style.animation   = 'livePulse 2s ease-in-out infinite';
    text.textContent = 'En vivo';
  } else {
    dot.style.background  = '#94a3b8';
    dot.style.animation   = 'none';
    text.textContent = status === 'reconnecting' ? 'Reconectando…' : 'Sin conexión';
  }
}

// ===== Carga inicial =====
async function loadSorteo() {
  const btn = document.getElementById('btn-refresh');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(API);
    if (res.status === 404) throw new Error('not_found');
    if (!res.ok) throw new Error('error');
    const data = await res.json();

    statsData = {
      total: data.totalNumeros,
      vendidos: data.vendidos,
      disponibles: data.disponibles,
      ganadores: data.ganadores || 0,
    };
    currentRifaTotal = data.totalNumeros;
    renderContent(data);
    lastUpdated = Date.now();
    updateTimestamp();

    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-error').classList.add('hidden');
    document.getElementById('state-content').classList.remove('hidden');
    return data;
  } catch (_) {
    document.getElementById('state-loading').classList.add('hidden');
    if (document.getElementById('state-content').classList.contains('hidden')) {
      document.getElementById('state-error').classList.remove('hidden');
    }
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderContent(data) {
  document.title = `${data.nombre} – Rifa Manager`;

  document.getElementById('pub-hero').innerHTML = `
    <h2>${esc(data.nombre)}</h2>
    <div class="rifa-hero-meta">
      <div class="rifa-hero-meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
        </svg>
        ${esc(data.premio)}
      </div>
      <div class="rifa-hero-meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        ${formatDate(data.fecha)}
      </div>
    </div>`;

  const imagesEl = document.getElementById('pub-images');
  if (data.images && data.images.length > 0) {
    imagesEl.innerHTML = `
      <div class="prize-gallery">
        ${data.images.map((url, idx) => `
          <div class="gallery-item" data-image-idx="${idx}">
            <img src="${esc(url)}" alt="Premio" class="gallery-img">
          </div>
        `).join('')}
      </div>`;
    imagesEl.style.display = '';
    window._sorteoImages = data.images;
  } else {
    imagesEl.innerHTML = '';
    imagesEl.style.display = 'none';
    window._sorteoImages = [];
  }

  renderStats();

  const winnersEl = document.getElementById('pub-winners');
  const winnerTickets = (data.tickets || []).filter(t => t.ganador);
  if (winnerTickets.length > 0) {
    winnersEl.classList.remove('hidden');
    winnersEl.innerHTML = `
      <div class="winners-banner-inner pub-winners-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
        <div>
          <strong>¡Ganador${winnerTickets.length > 1 ? 'es' : ''} del sorteo!</strong>
          <div class="winners-list">
            ${winnerTickets.map(t => `
              <span class="winner-chip pub-winner-chip">
                #${padNum(t.numero)}${t.comprador ? ' – ' + esc(t.comprador) : ''}
              </span>
            `).join('')}
          </div>
        </div>
      </div>`;
  } else {
    winnersEl.classList.add('hidden');
    winnersEl.innerHTML = '';
  }

  document.getElementById('pub-tickets').innerHTML = data.tickets.map(t => {
    if (t.ganador) {
      return `
        <div class="ticket pub-ticket winner"
             data-numero="${t.numero}"
             data-comprador="${esc(t.comprador || '')}"
             data-ganador="true">
          <span class="pub-num">${padNum(t.numero)}</span>
          <span class="winner-star">★</span>
          ${t.comprador ? `<span class="pub-owner">${esc(t.comprador)}</span>` : ''}
        </div>`;
    }
    if (t.vendido) {
      return `
        <div class="ticket pub-ticket sold"
             data-numero="${t.numero}"
             data-comprador="${esc(t.comprador || '')}">
          <span class="pub-num">${padNum(t.numero)}</span>
          ${t.comprador ? `<span class="pub-owner">${esc(t.comprador)}</span>` : ''}
        </div>`;
    }
    return `<div class="ticket pub-ticket available" data-numero="${t.numero}"><span class="pub-num">${padNum(t.numero)}</span></div>`;
  }).join('');
}

function renderStats() {
  const pct = statsData.total > 0 ? Math.round((statsData.vendidos / statsData.total) * 100) : 0;
  document.getElementById('pub-stats').innerHTML = `
    <div class="stat-card stat-total">
      <div class="stat-number">${statsData.total}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card stat-sold">
      <div class="stat-number">${statsData.vendidos}</div>
      <div class="stat-label">Vendidos</div>
      <div style="font-size:.7rem;color:var(--text-muted);margin-top:.2rem;">${pct}%</div>
    </div>
    <div class="stat-card stat-available">
      <div class="stat-number">${statsData.disponibles}</div>
      <div class="stat-label">Disponibles</div>
    </div>
    ${statsData.ganadores > 0 ? `
    <div class="stat-card stat-winner">
      <div class="stat-number">${statsData.ganadores}</div>
      <div class="stat-label">Ganador${statsData.ganadores > 1 ? 'es' : ''}</div>
    </div>` : ''}`;
}

// ===== SSE =====
function connectSSE() {
  const source = new EventSource(`/api/public/rifas/${rifaId}/stream`);

  source.onopen = () => setLiveStatus('connected');

  source.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (data.type === 'connected') {
      setLiveStatus('connected');
      return;
    }

    if (data.type === 'refresh') {
      loadSorteo();
      return;
    }

    if (data.type === 'ticket') {
      const el = document.querySelector(`[data-numero="${data.numero}"]`);
      const wasWinner = el && el.dataset.ganador === 'true';
      const isWinner = !!data.ganador;

      if (isWinner || wasWinner !== isWinner) {
        loadSorteo();
        lastUpdated = Date.now();
        updateTimestamp();
        return;
      }

      if (el) {
        const wasSold = el.classList.contains('sold');
        const isSold  = data.vendido;

        if (wasSold !== isSold) {
          if (isSold) {
            el.className = 'ticket pub-ticket sold';
            el.innerHTML = `
              <span class="pub-num">${padNum(data.numero)}</span>
              ${data.comprador ? `<span class="pub-owner">${esc(data.comprador)}</span>` : ''}`;
            el.dataset.comprador = data.comprador || '';
          } else {
            el.className = 'ticket pub-ticket available';
            el.innerHTML = `<span class="pub-num">${padNum(data.numero)}</span>`;
            el.dataset.comprador = '';
          }

          if (isSold) { statsData.vendidos++; statsData.disponibles--; }
          else        { statsData.vendidos--; statsData.disponibles++; }
          renderStats();
        }

        el.style.transform = 'scale(1.15)';
        setTimeout(() => { el.style.transform = ''; }, 250);
      }

      lastUpdated = Date.now();
      updateTimestamp();
    }
  };

  source.onerror = () => {
    setLiveStatus('reconnecting');
    source.addEventListener('open', () => {
      setLiveStatus('connected');
      loadSorteo();
    }, { once: true });
  };

  return source;
}

// ===== SUSPENSE ANIMATION =====
let suspensePlayed = false;

function createConfetti() {
  const container = document.getElementById('suspense-confetti');
  if (!container) return;
  container.innerHTML = '';

  const colors = ['#f59e0b', '#f97316', '#fbbf24', '#ef4444', '#10b981', '#6366f1', '#ec4899'];
  const pieces = 60;

  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (Math.random() * 10 + 5) + 'px';
    piece.style.height = (Math.random() * 10 + 5) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    piece.style.animation = `confettiFall ${Math.random() * 2 + 2}s linear ${Math.random() * 0.5}s forwards`;
    container.appendChild(piece);
  }
}

function showSuspensePhase(phaseId) {
  document.querySelectorAll('.suspense-phase').forEach(el => el.classList.add('hidden'));
  const phase = document.getElementById(phaseId);
  if (phase) phase.classList.remove('hidden');
}

function playCountdown(number, callback) {
  const numEl = document.getElementById('suspense-number');
  if (!numEl) return;

  numEl.textContent = number;
  numEl.style.animation = 'none';
  void numEl.offsetWidth;
  numEl.style.animation = 'suspenseCountPulse 1s ease-in-out';

  setTimeout(callback, 1000);
}

async function playSuspenseAnimation(winners) {
  if (suspensePlayed) return;
  suspensePlayed = true;

  const overlay = document.getElementById('suspense-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');

  showSuspensePhase('suspense-phase-intro');
  await new Promise(r => setTimeout(r, 2500));

  showSuspensePhase('suspense-phase-countdown');
  await new Promise(r => playCountdown(3, r));
  await new Promise(r => playCountdown(2, r));
  await new Promise(r => playCountdown(1, r));

  showSuspensePhase('suspense-phase-reveal');

  const winnersEl = document.getElementById('suspense-winners');
  if (winnersEl && winners.length > 0) {
    winnersEl.innerHTML = winners.map((w, i) =>
      `<span class="suspense-winner-chip" style="animation-delay:${i * 0.15}s">#${padNum(w.numero)}</span>`
    ).join('');
  }

  createConfetti();
  await new Promise(r => setTimeout(r, 3500));

  overlay.classList.add('fade-out');
  await new Promise(r => setTimeout(r, 800));
  overlay.classList.add('hidden');
  overlay.classList.remove('fade-out');
}

// ===== LIGHTBOX =====
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(index) {
  lightboxImages = window._sorteoImages || [];
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

// ===== Init =====
document.getElementById('btn-refresh').addEventListener('click', loadSorteo);
setInterval(updateTimestamp, 15_000);

loadSorteo().then((data) => {
  if (data && data.ganadores > 0 && !suspensePlayed) {
    const winnerTickets = (data.tickets || []).filter(t => t.ganador);
    playSuspenseAnimation(winnerTickets);
  }
  connectSSE();
});
