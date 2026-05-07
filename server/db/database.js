const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Render, mount a persistent disk at /var/data and set DB_PATH=/var/data/bank.db
// so the SQLite file survives deploys/restarts. Falls back to a local file in dev.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'bank.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
