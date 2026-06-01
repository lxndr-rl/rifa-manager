const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const rifas = db.prepare('SELECT * FROM rifas ORDER BY created_at DESC').all();
  res.json(rifas);
});

router.get('/:id', (req, res) => {
  const rifa = db.prepare('SELECT * FROM rifas WHERE id = ?').get(req.params.id);
  if (!rifa) return res.status(404).json({ error: 'Rifa no encontrada' });
  res.json(rifa);
});

router.post('/', (req, res) => {
  const { nombre, premio, fecha, total_numeros } = req.body;
  if (!nombre || !premio || !fecha) {
    return res.status(400).json({ error: 'nombre, premio y fecha son requeridos' });
  }
  const total = total_numeros || 100;
  const result = db.prepare(
    'INSERT INTO rifas (nombre, premio, fecha, total_numeros) VALUES (?, ?, ?, ?)'
  ).run(nombre, premio, fecha, total);

  for (let i = 1; i <= total; i++) {
    db.prepare('INSERT INTO tickets (rifa_id, numero) VALUES (?, ?)').run(result.lastInsertRowid, i);
  }

  res.status(201).json({ id: result.lastInsertRowid, nombre, premio, fecha, total_numeros: total });
});

router.put('/:id', (req, res) => {
  const { nombre, premio, fecha, total_numeros } = req.body;
  const existing = db.prepare('SELECT * FROM rifas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rifa no encontrada' });

  db.prepare(
    'UPDATE rifas SET nombre = COALESCE(?, nombre), premio = COALESCE(?, premio), fecha = COALESCE(?, fecha), total_numeros = COALESCE(?, total_numeros) WHERE id = ?'
  ).run(nombre, premio, fecha, total_numeros, req.params.id);

  res.json({ id: parseInt(req.params.id), nombre: nombre || existing.nombre, premio: premio || existing.premio, fecha: fecha || existing.fecha });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM rifas WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Rifa no encontrada' });
  res.json({ message: 'Rifa eliminada' });
});

module.exports = router;
