const API = '/api';
let currentRifaId = null;

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

async function loadRifas() {
  const rifas = await fetchJSON(`${API}/rifas`);
  const grid = $('#rifas-grid');
  if (rifas.length === 0) {
    grid.innerHTML = '<p style="color:#64748b;grid-column:1/-1;text-align:center;padding:3rem;">No hay rifas creadas. ¡Crea la primera!</p>';
    return;
  }
  grid.innerHTML = rifas.map(r => `
    <div class="rifa-card" onclick="openRifa(${r.id})">
      <h3>${esc(r.nombre)}</h3>
      <p>Premio: ${esc(r.premio)}</p>
      <p>Fecha: ${formatDate(r.fecha)}</p>
      <p>Números: 1 - ${r.total_numeros}</p>
      <div class="card-actions">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editRifa(${r.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteRifa(${r.id})">Eliminar</button>
      </div>
    </div>
  `).join('');
}

async function openRifa(id) {
  currentRifaId = id;
  const rifa = await fetchJSON(`${API}/rifas/${id}`);
  const tickets = await fetchJSON(`${API}/tickets/rifa/${id}`);
  const stats = await fetchJSON(`${API}/tickets/rifa/${id}/stats`);

  $('#rifa-list').classList.add('hidden');
  $('#rifa-detail').classList.remove('hidden');

  $('#rifa-info').innerHTML = `
    <h2>${esc(rifa.nombre)}</h2>
    <p>Premio: ${esc(rifa.premio)}</p>
    <p>Fecha: ${formatDate(rifa.fecha)}</p>
  `;

  $('#stats').innerHTML = `
    <div class="stat-box"><div class="number">${stats.total}</div><div class="label">Total</div></div>
    <div class="stat-box"><div class="number">${stats.vendidos}</div><div class="label">Vendidos</div></div>
    <div class="stat-box"><div class="number">${stats.disponibles}</div><div class="label">Disponibles</div></div>
  `;

  $('#tickets-grid').innerHTML = tickets.map(t => `
    <div class="ticket ${t.vendido ? 'sold' : 'available'}" 
         onclick="openTicket(${t.id}, ${t.numero}, '${esc(t.comprador || '')}', '${esc(t.telefono || '')}')"
         title="${t.vendido ? esc(t.comprador) : 'Disponible'}">
      ${t.numero}
    </div>
  `).join('');
}

function openTicket(id, numero, comprador, telefono) {
  $('#ticket-id').value = id;
  $('#ticket-numero').textContent = numero;
  $('#ticket-comprador').value = comprador;
  $('#ticket-telefono').value = telefono;
  $('#modal-ticket').classList.remove('hidden');
}

function closeTicketModal() {
  $('#modal-ticket').classList.add('hidden');
}

$('#form-ticket').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#ticket-id').value;
  const comprador = $('#ticket-comprador').value.trim();
  const telefono = $('#ticket-telefono').value.trim();

  if (!comprador) return;

  await fetchJSON(`${API}/tickets/${id}`, {
    method: 'PUT',
    body: { comprador, telefono, vendido: 1 }
  });

  closeTicketModal();
  openRifa(currentRifaId);
});

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

$('#btn-back').addEventListener('click', () => {
  $('#rifa-detail').classList.add('hidden');
  $('#rifa-list').classList.remove('hidden');
  currentRifaId = null;
  loadRifas();
});

$('#btn-new-rifa').addEventListener('click', () => {
  $('#modal-title').textContent = 'Nueva Rifa';
  $('#rifa-id').value = '';
  $('#form-rifa').reset();
  $('#rifa-total').value = 100;
  $('#modal-rifa').classList.remove('hidden');
});

function closeModal() {
  $('#modal-rifa').classList.add('hidden');
}

async function editRifa(id) {
  const rifa = await fetchJSON(`${API}/rifas/${id}`);
  $('#modal-title').textContent = 'Editar Rifa';
  $('#rifa-id').value = rifa.id;
  $('#rifa-nombre').value = rifa.nombre;
  $('#rifa-premio').value = rifa.premio;
  $('#rifa-fecha').value = rifa.fecha;
  $('#rifa-total').value = rifa.total_numeros;
  $('#modal-rifa').classList.remove('hidden');
}

async function deleteRifa(id) {
  if (!confirm('¿Eliminar esta rifa y todos sus tickets?')) return;
  await fetchJSON(`${API}/rifas/${id}`, { method: 'DELETE' });
  loadRifas();
}

$('#form-rifa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#rifa-id').value;
  const body = {
    nombre: $('#rifa-nombre').value.trim(),
    premio: $('#rifa-premio').value.trim(),
    fecha: $('#rifa-fecha').value,
    total_numeros: parseInt($('#rifa-total').value) || 100
  };

  if (id) {
    await fetchJSON(`${API}/rifas/${id}`, { method: 'PUT', body });
  } else {
    await fetchJSON(`${API}/rifas`, { method: 'POST', body });
  }

  closeModal();
  loadRifas();
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

loadRifas();
