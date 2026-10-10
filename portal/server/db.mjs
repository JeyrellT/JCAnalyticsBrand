// ============================================================================
//  server/db.mjs
//  Base de datos SQLite (módulo nativo node:sqlite, sin dependencias).
//  Un archivo, una réplica: suficiente y robusto para un equipo de 5 personas.
//  Las migraciones se aplican en orden según PRAGMA user_version; para cambiar
//  el esquema, agregar una entrada nueva al final de MIGRATIONS (nunca editar
//  una ya publicada).
// ============================================================================

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MIGRATIONS = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','socio','colaborador')),
    color TEXT NOT NULL DEFAULT '#0065df',
    phone TEXT,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT,
    kind TEXT NOT NULL,
    service TEXT,
    status TEXT NOT NULL,
    owner_id INTEGER REFERENCES users(id),
    start_date TEXT,
    due_date TEXT,
    delivered_at TEXT,
    value_amount INTEGER,
    currency TEXT NOT NULL DEFAULT 'CRC',
    description TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    url TEXT,
    last_update_at TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE project_updates (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    channel TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX project_updates_project ON project_updates(project_id, created_at);

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'media',
    assignee_id INTEGER REFERENCES users(id),
    due_date TEXT,
    position REAL NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX tasks_status ON tasks(status, position);
  CREATE INDEX tasks_project ON tasks(project_id);

  CREATE TABLE task_comments (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE appointments (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'programada',
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    location TEXT,
    meeting_url TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    contact_name TEXT,
    contact_phone TEXT,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX appointments_start ON appointments(starts_at);

  CREATE TABLE appointment_attendees (
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (appointment_id, user_id)
  );

  CREATE TABLE investments (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'activa',
    currency TEXT NOT NULL CHECK (currency IN ('CRC','USD')),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    target_amount INTEGER,
    expected_return_pct REAL,
    expected_date TEXT,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE movements (
    id INTEGER PRIMARY KEY,
    investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('aporte','retorno')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('CRC','USD')),
    fx_rate REAL,
    date TEXT NOT NULL,
    message TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmado','objetado','anulado')),
    batch_id TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TEXT
  );
  CREATE INDEX movements_investment ON movements(investment_id, date);
  CREATE INDEX movements_partner ON movements(partner_id, status);

  CREATE TABLE movement_messages (
    id INTEGER PRIMARY KEY,
    movement_id INTEGER NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL DEFAULT 'mensaje',
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX movement_messages_movement ON movement_messages(movement_id, created_at);

  CREATE TABLE investment_notes (
    id INTEGER PRIMARY KEY,
    investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX notifications_user ON notifications(user_id, read_at, created_at);

  CREATE TABLE activity (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    entity TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    sensitive INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX activity_created ON activity(created_at);
  `,
];

export const DEFAULT_SETTINGS = {
  fx_usd_crc: '515',          // ₡ por US$1. Actualizar con el tipo de cambio BCCR.
  update_sla_hours: '72',     // Compromiso público: avances cada 72 h.
  wip_en_progreso: '6',       // Límite WIP (Lean) de la columna "En progreso".
  wip_revision: '4',
};

export function openDatabase(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  for (let i = version; i < MIGRATIONS.length; i += 1) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, value);
  return db;
}

/** Ejecuta fn dentro de una transacción; revierte si lanza. */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
