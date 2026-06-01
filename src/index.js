const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const rifasRouter = require('./routes/rifas');
const ticketsRouter = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/rifas', rifasRouter);
app.use('/api/tickets', ticketsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rifa Manager running on http://0.0.0.0:${PORT}`);
});
