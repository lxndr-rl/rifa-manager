const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../db/prisma');

router.use(authMiddleware);

router.get('/rifa/:rifaId', async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { rifaId: parseInt(req.params.rifaId) },
    orderBy: { numero: 'asc' },
  });
  res.json(tickets);
});

router.get('/rifa/:rifaId/stats', async (req, res) => {
  const rifaId = parseInt(req.params.rifaId);
  const total = await prisma.ticket.count({ where: { rifaId } });
  const vendidos = await prisma.ticket.count({ where: { rifaId, vendido: true } });

  res.json({ total, vendidos, disponibles: total - vendidos });
});

router.put('/:id', async (req, res) => {
  const { comprador, telefono, vendido } = req.body;
  const id = parseInt(req.params.id);

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Ticket no encontrado' });

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      comprador: comprador !== undefined ? comprador : existing.comprador,
      telefono: telefono !== undefined ? telefono : existing.telefono,
      vendido: vendido !== undefined ? vendido : existing.vendido,
    },
  });

  res.json(updated);
});

router.post('/rifa/:rifaId/bulk', async (req, res) => {
  const { tickets: ticketList } = req.body;
  if (!Array.isArray(ticketList)) {
    return res.status(400).json({ error: 'Se requiere un array de tickets' });
  }

  const rifaId = parseInt(req.params.rifaId);

  for (const t of ticketList) {
    await prisma.ticket.updateMany({
      where: { rifaId, numero: t.numero },
      data: { comprador: t.comprador, telefono: t.telefono || null, vendido: true },
    });
  }

  res.json({ message: 'Tickets actualizados', count: ticketList.length });
});

module.exports = router;
