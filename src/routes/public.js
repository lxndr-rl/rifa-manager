const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const { subscribe, unsubscribe } = require('../sse');

function maskName(name) {
  if (!name) return null;
  return name.trim().split(/\s+/).map((p, i) =>
    i === 0 ? p : p[0] + 'x'.repeat(Math.max(0, p.length - 1))
  ).join(' ');
}

router.get('/rifas/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const rifa = await prisma.rifa.findUnique({
    where: { id },
    include: { images: { orderBy: { orden: 'asc' } } },
  });
  if (!rifa) return res.status(404).json({ error: 'Rifa no encontrada' });

  const tickets = await prisma.ticket.findMany({
    where: { rifaId: id },
    orderBy: { numero: 'asc' },
    select: { numero: true, vendido: true, comprador: true, ganador: true },
  });

  const vendidos = tickets.filter(t => t.vendido).length;
  const ganadores = tickets.filter(t => t.ganador).length;

  res.json({
    nombre: rifa.nombre,
    premio: rifa.premio,
    fecha: rifa.fecha,
    totalNumeros: rifa.totalNumeros,
    vendidos,
    disponibles: rifa.totalNumeros - vendidos,
    ganadores,
    images: rifa.images.map(img => img.url),
    tickets: tickets.map(t => ({
      numero: t.numero,
      vendido: t.vendido,
      ganador: t.ganador,
      comprador: t.vendido ? maskName(t.comprador) : null,
    })),
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

  const heartbeat = setInterval(() => res.write(':\n\n'), 20000);

  subscribe(rifaId, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe(rifaId, res);
  });
});

module.exports = router;
