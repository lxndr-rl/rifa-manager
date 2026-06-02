// In-memory SSE client registry: rifaId -> Set<Response>
const clients = new Map();

function subscribe(rifaId, res) {
  if (!clients.has(rifaId)) clients.set(rifaId, new Set());
  clients.get(rifaId).add(res);
}

function unsubscribe(rifaId, res) {
  clients.get(rifaId)?.delete(res);
  if (clients.get(rifaId)?.size === 0) clients.delete(rifaId);
}

function broadcast(rifaId, payload) {
  const set = clients.get(rifaId);
  if (!set || set.size === 0) return;
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try { res.write(msg); } catch (_) { unsubscribe(rifaId, res); }
  }
}

module.exports = { subscribe, unsubscribe, broadcast };
