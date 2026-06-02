require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const prisma = require('./db/prisma');

const authRouter = require('./routes/auth');
const rifasRouter = require('./routes/rifas');
const ticketsRouter = require('./routes/tickets');
const publicRouter = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.use('/api/auth', authRouter);
app.use('/api/rifas', rifasRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/public', publicRouter);

app.get('/sorteo/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sorteo.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Rifa Manager running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
