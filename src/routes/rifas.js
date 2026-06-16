const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../db/prisma');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomUUID() + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const rifas = await prisma.rifa.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { tickets: true } },
      images: { orderBy: { orden: 'asc' } },
    },
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
    include: {
      _count: { select: { tickets: true } },
      images: { orderBy: { orden: 'asc' } },
    },
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
    const images = await prisma.rifaImage.findMany({ where: { rifaId: id } });
    for (const img of images) {
      const filePath = path.join(uploadDir, path.basename(img.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await prisma.rifa.delete({ where: { id } });
    res.json({ message: 'Rifa eliminada' });
  } catch (e) {
    res.status(404).json({ error: 'Rifa no encontrada' });
  }
});

router.post('/:id/images', upload.array('images', 10), async (req, res) => {
  const rifaId = parseInt(req.params.id);
  const existing = await prisma.rifa.findUnique({ where: { id: rifaId } });
  if (!existing) return res.status(404).json({ error: 'Rifa no encontrada' });

  const maxOrden = await prisma.rifaImage.aggregate({
    where: { rifaId },
    _max: { orden: true },
  });
  let nextOrden = (maxOrden._max.orden || 0) + 1;

  const created = [];
  for (const file of req.files) {
    const img = await prisma.rifaImage.create({
      data: {
        rifaId,
        url: `/uploads/${file.filename}`,
        orden: nextOrden++,
      },
    });
    created.push(img);
  }

  res.status(201).json(created);
});

router.delete('/:id/images/:imageId', async (req, res) => {
  const imageId = parseInt(req.params.imageId);
  const image = await prisma.rifaImage.findUnique({ where: { id: imageId } });
  if (!image) return res.status(404).json({ error: 'Imagen no encontrada' });

  const filePath = path.join(uploadDir, path.basename(image.url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await prisma.rifaImage.delete({ where: { id: imageId } });
  res.json({ message: 'Imagen eliminada' });
});

module.exports = router;
