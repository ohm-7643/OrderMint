import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDatabase(dbPath = null) {
  let targetPath = dbPath;
  if (!targetPath) {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    targetPath = path.join(dataDir, 'ordermint.db');
  }

  const db = new Database(targetPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  initSchema(db);
  return db;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      unit_price_paise INTEGER NOT NULL,
      unit TEXT NOT NULL DEFAULT 'piece',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS catalog_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
      alias TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      raw_text_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      customer_label TEXT NOT NULL,
      sent_at TEXT,
      raw_text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_label TEXT NOT NULL,
      delivery_note TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      is_demo INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT,
      reopened_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      source_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
      raw_text TEXT,
      item_id INTEGER REFERENCES catalog_items(id) ON DELETE SET NULL,
      custom_item_name TEXT,
      quantity INTEGER NOT NULL,
      unit_price_paise INTEGER NOT NULL,
      unit_price_override_paise INTEGER,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      flags TEXT NOT NULL DEFAULT '[]',
      origin TEXT NOT NULL DEFAULT 'rule',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_catalog_active ON catalog_items(active);
    CREATE INDEX IF NOT EXISTS idx_aliases_item ON catalog_aliases(item_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);
  `);

  // Initialize default business settings if missing
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  insertSetting.run('business_name', 'Mint Bakery & Cloud Kitchen');
  insertSetting.run('business_phone', '+91 98765 43210');
  insertSetting.run('business_address', '12 Baker Street, Bandra West, Mumbai 400050');
  insertSetting.run('bill_prefix', 'OM-');
}

let defaultDbInstance = null;
export function getDb() {
  if (!defaultDbInstance) {
    defaultDbInstance = createDatabase();
  }
  return defaultDbInstance;
}

export function closeDb() {
  if (defaultDbInstance) {
    defaultDbInstance.close();
    defaultDbInstance = null;
  }
}
