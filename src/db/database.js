const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/rifas.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS rifas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    premio TEXT NOT NULL,
    fecha TEXT NOT NULL,
    total_numeros INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rifa_id INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    comprador TEXT,
    telefono TEXT,
    vendido INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rifa_id) REFERENCES rifas(id) ON DELETE CASCADE,
    UNIQUE(rifa_id, numero)
  );
`);

try {
  db.exec('ALTER TABLE tickets ALTER COLUMN comprador DROP NOT NULL');
} catch (e) {
  const hasOldSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='tickets'").get();
  if (hasOldSchema && hasOldSchema.sql.includes('comprador TEXT NOT NULL')) {
    db.exec(`
      CREATE TABLE tickets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rifa_id INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        comprador TEXT,
        telefono TEXT,
        vendido INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rifa_id) REFERENCES rifas(id) ON DELETE CASCADE,
        UNIQUE(rifa_id, numero)
      );
      INSERT INTO tickets_new SELECT * FROM tickets;
      DROP TABLE tickets;
      ALTER TABLE tickets_new RENAME TO tickets;
    `);
  }
}

module.exports = db;
