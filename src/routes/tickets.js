const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/rifa/:rifaId', (req, res) => {
  const tickets = db.prepare(
    'SELECT * FROM tickets WHERE rifa_id = ? ORDER BY numero'
  ).all(req.params.rifaId);
  res.json(tickets);
});

router.get('/rifa/:rifaId/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN vendido = 1 THEN 1 ELSE 0 END) as vendidos,
      SUM(CASE WHEN vendido = 0 THEN 1 ELSE 0 END) as disponibles
    FROM tickets WHERE rifa_id = ?
  `).get(req.params.rifaId);
  res.json(stats);
});

router.put('/:id', (req, res) => {
  const { comprador, telefono, vendido } = req.body;
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket no encontrado' });

  db.prepare(
    'UPDATE tickets SET comprador = COALESCE(?, comprador), telefono = COALESCE(?, telefono), vendido = COALESCE(?, vendido) WHERE id = ?'
  ).run(comprador, telefono, vendido, req.params.id);

  res.json({ id: parseInt(req.params.id), rifa_id: existing.rifa_id, numero: existing.numero, comprador: comprador || existing.comprador, telefono: telefono || existing.telefono, vendido: vendido !== undefined ? vendido : existing.vendido });
});

router.post('/rifa/:rifaId/bulk', (req, res) => {
  const { tickets: ticketList } = req.body;
  if (!Array.isArray(ticketList)) {
    return res.status(400).json({ error: 'Se requiere un array de tickets' });
  }

  const updateStmt = db.prepare(
    'UPDATE tickets SET comprador = ?, telefono = ?, vendido = 1 WHERE rifa_id = ? AND numero = ?'
  );

  const updateMany = db.transaction((tickets) => {
    for (const t of tickets) {
      updateStmt.run(t.comprador, t.telefono || null, req.params.rifaId, t.numero);
    }
  });

  updateMany(ticketList);
  res.json({ message: 'Tickets actualizados', count: ticketList.length });
});

module.exports = router;
