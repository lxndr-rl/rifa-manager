const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../db/prisma');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const rifas = await prisma.rifa.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tickets: true } } },
  });

  const soldCounts = await prisma.ticket.groupBy({
    by: ['rifaId'],
    where: { rifaId: { in: rifas.map(r => r.id) }, vendido: true },
    _count: { _all: true },
  });

  const soldMap = Object.fromEntries(soldCounts.map(s => [s.rifaId, s._count._all]));
  res.json(rifas.map(r => ({ ...r, vendidos: soldMap[r.id] || 0 })));
});

router.get('/:id', async (req, res) => {
  const rifa = await prisma.rifa.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { _count: { select: { tickets: true } } },
  });
  if (!rifa) return res.status(404).json({ error: 'Rifa no encontrada' });
  res.json(rifa);
});

router.post('/', async (req, res) => {
  const { nombre, premio, fecha, totalNumeros } = req.body;
  if (!nombre || !premio || !fecha) {
    return res.status(400).json({ error: 'nombre, premio y fecha son requeridos' });
  }

  const total = totalNumeros || 100;

  const rifa = await prisma.rifa.create({
    data: {
      nombre,
      premio,
      fecha: new Date(fecha),
      totalNumeros: total,
    },
  });

  const tickets = [];
  for (let i = 1; i <= total; i++) {
    tickets.push({ rifaId: rifa.id, numero: i });
  }
  await prisma.ticket.createMany({ data: tickets });

  res.status(201).json(rifa);
});

router.put('/:id', async (req, res) => {
  const { nombre, premio, fecha, totalNumeros } = req.body;
  const id = parseInt(req.params.id);

  const existing = await prisma.rifa.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Rifa no encontrada' });

  const updated = await prisma.rifa.update({
    where: { id },
    data: {
      nombre: nombre || existing.nombre,
      premio: premio || existing.premio,
      fecha: fecha ? new Date(fecha) : existing.fecha,
      totalNumeros: totalNumeros || existing.totalNumeros,
    },
  });

  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.rifa.delete({ where: { id } });
    res.json({ message: 'Rifa eliminada' });
  } catch (e) {
    res.status(404).json({ error: 'Rifa no encontrada' });
  }
});

module.exports = router;
