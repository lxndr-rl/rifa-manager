const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const { subscribe, unsubscribe } = require('../sse');

router.get('/rifas/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const rifa = await prisma.rifa.findUnique({ where: { id } });
  if (!rifa) return res.status(404).json({ error: 'Rifa no encontrada' });

  const tickets = await prisma.ticket.findMany({
    where: { rifaId: id },
    orderBy: { numero: 'asc' },
    select: { numero: true, vendido: true },
  });

  const vendidos = tickets.filter(t => t.vendido).length;

  res.json({
    nombre: rifa.nombre,
    premio: rifa.premio,
    fecha: rifa.fecha,
    totalNumeros: rifa.totalNumeros,
    vendidos,
    disponibles: rifa.totalNumeros - vendidos,
    tickets,
  });
});

router.get('/rifas/:id/stream', (req, res) => {
  const rifaId = parseInt(req.params.id);
  if (isNaN(rifaId)) return res.status(400).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('data: {"type":"connected"}\n\n');

  // Heartbeat cada 20 s para mantener la conexión viva
  const heartbeat = setInterval(() => res.write(':\n\n'), 20000);

  subscribe(rifaId, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe(rifaId, res);
  });
});

module.exports = router;
