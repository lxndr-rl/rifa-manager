const rifaId = window.location.pathname.split('/').pop();
const API = `/api/public/rifas/${rifaId}`;

// Tema
document.getElementById('btn-theme').addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('arimar-theme', isDark ? 'light' : 'dark');
});

let lastUpdated = null;
let statsData = { total: 0, vendidos: 0, disponibles: 0 };

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

    statsData = { total: data.totalNumeros, vendidos: data.vendidos, disponibles: data.disponibles };
    renderContent(data);
    lastUpdated = Date.now();
    updateTimestamp();

    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-error').classList.add('hidden');
    document.getElementById('state-content').classList.remove('hidden');
  } catch (_) {
    document.getElementById('state-loading').classList.add('hidden');
    if (document.getElementById('state-content').classList.contains('hidden')) {
      document.getElementById('state-error').classList.remove('hidden');
    }
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

  renderStats();

  document.getElementById('pub-tickets').innerHTML = data.tickets.map(t => {
    if (t.vendido) {
      return `
        <div class="ticket pub-ticket sold${t.pagado ? ' pagado' : ''}"
             data-numero="${t.numero}"
             data-comprador="${esc(t.comprador || '')}"
             data-pagado="${t.pagado}">
          <span class="pub-num">${t.numero}</span>
          ${t.comprador ? `<span class="pub-owner">${esc(t.comprador)}</span>` : ''}
          <span class="pub-status-dot ${t.pagado ? 'pagado' : 'pendiente'}" title="${t.pagado ? 'Pagado' : 'Pendiente'}"></span>
        </div>`;
    }
    return `<div class="ticket pub-ticket available" data-numero="${t.numero}"><span class="pub-num">${t.numero}</span></div>`;
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
    </div>`;
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
      if (el) {
        const wasSold   = el.classList.contains('sold');
        const isSold    = data.vendido;
        const isPagado  = !!data.pagado;
        const prevPagado = el.dataset.pagado === 'true';

        if (wasSold !== isSold || (isSold && prevPagado !== isPagado)) {
          if (isSold) {
            el.className = `ticket pub-ticket sold${isPagado ? ' pagado' : ''}`;
            el.innerHTML = `
              <span class="pub-num">${data.numero}</span>
              ${data.comprador ? `<span class="pub-owner">${esc(data.comprador)}</span>` : ''}
              <span class="pub-status-dot ${isPagado ? 'pagado' : 'pendiente'}" title="${isPagado ? 'Pagado' : 'Pendiente'}"></span>`;
            el.dataset.pagado = isPagado;
            el.dataset.comprador = data.comprador || '';
          } else {
            el.className = 'ticket pub-ticket available';
            el.innerHTML = `<span class="pub-num">${data.numero}</span>`;
            el.dataset.pagado = 'false';
            el.dataset.comprador = '';
          }
        }

        if (wasSold !== isSold) {
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
    // EventSource reconecta automáticamente; cuando vuelva a abrir, recargamos
    source.addEventListener('open', () => {
      setLiveStatus('connected');
      loadSorteo(); // Sincronizar estado tras reconexión
    }, { once: true });
  };

  return source;
}

// ===== Init =====
document.getElementById('btn-refresh').addEventListener('click', loadSorteo);
setInterval(updateTimestamp, 15_000);

loadSorteo().then(() => connectSSE());
