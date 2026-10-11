// ============================================================================
//  server/schema.mjs
//  Esquema y utilidades de base SIN dependencias de Node: lo usan el servidor
//  (node:sqlite) y la demo en el navegador (sql.js) con la misma API mínima:
//  db.exec(sql) y db.prepare(sql).get/all/run(...args).
//  Las migraciones se aplican en orden según PRAGMA user_version; para cambiar
//  el esquema, agregar una entrada nueva al final de MIGRATIONS (nunca editar
//  una ya publicada).
// ============================================================================

import { SERVICE_DEFAULTS } from '../shared/catalog.js';

export const MIGRATIONS = [
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
  // 2 · El compromiso de 72 h corre desde que el proyecto entra en curso/revisión, no desde su creación.
  `
  ALTER TABLE projects ADD COLUMN sla_started_at TEXT;
  UPDATE projects SET sla_started_at = COALESCE(last_update_at, updated_at) WHERE status IN ('en_curso','en_revision');
  `,
  // 3 · Clientes, líneas de servicio con líder y equipo, y equipo por proyecto (ver docs/v2-contrato.md).
  `
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('prospecto','activo','inactivo')),
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes TEXT,
    owner_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  ALTER TABLE projects ADD COLUMN client_id INTEGER REFERENCES clients(id);
  ALTER TABLE appointments ADD COLUMN client_id INTEGER REFERENCES clients(id);
  CREATE INDEX projects_client ON projects(client_id);
  CREATE INDEX appointments_client ON appointments(client_id);

  CREATE TABLE service_lines (
    key TEXT PRIMARY KEY,
    lead_id INTEGER REFERENCES users(id),
    price_from_usd INTEGER,
    unit TEXT,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT
  );

  CREATE TABLE service_members (
    service_key TEXT NOT NULL REFERENCES service_lines(key) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    PRIMARY KEY (service_key, user_id)
  );
  CREATE INDEX service_members_user ON service_members(user_id);

  CREATE TABLE project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'equipo',
    PRIMARY KEY (project_id, user_id)
  );
  CREATE INDEX project_members_user ON project_members(user_id);

  -- Relleno: un cliente por cada projects.client distinto (sin distinguir mayúsculas ni espacios).
  -- Prospecto si todos sus proyectos lo son; inactivo si ya no tiene proyectos vivos; si no, activo.
  INSERT INTO clients (name, status, created_at, updated_at)
    SELECT TRIM(client),
      CASE WHEN SUM(CASE WHEN status = 'prospecto' THEN 1 ELSE 0 END) = COUNT(*) THEN 'prospecto'
           WHEN SUM(CASE WHEN status <> 'cerrado' AND archived = 0 THEN 1 ELSE 0 END) = 0 THEN 'inactivo'
           ELSE 'activo' END,
      MIN(created_at), MAX(updated_at)
    FROM projects WHERE client IS NOT NULL AND TRIM(client) <> ''
    GROUP BY LOWER(TRIM(client)) ORDER BY MIN(created_at);
  UPDATE projects SET client_id = (SELECT c.id FROM clients c WHERE LOWER(c.name) = LOWER(TRIM(projects.client)) ORDER BY c.id LIMIT 1)
    WHERE client IS NOT NULL AND TRIM(client) <> '';
  UPDATE clients SET
    owner_id = (SELECT p.owner_id FROM projects p WHERE p.client_id = clients.id AND p.owner_id IS NOT NULL ORDER BY p.updated_at DESC LIMIT 1),
    contact_name = (SELECT p.contact_name FROM projects p WHERE p.client_id = clients.id AND p.contact_name IS NOT NULL ORDER BY p.updated_at DESC LIMIT 1),
    contact_phone = (SELECT p.contact_phone FROM projects p WHERE p.client_id = clients.id AND p.contact_phone IS NOT NULL ORDER BY p.updated_at DESC LIMIT 1),
    created_by = (SELECT p.created_by FROM projects p WHERE p.client_id = clients.id ORDER BY p.created_at LIMIT 1);
  -- Las citas ligadas a un proyecto heredan su cliente.
  UPDATE appointments SET client_id = (SELECT p.client_id FROM projects p WHERE p.id = appointments.project_id)
    WHERE project_id IS NOT NULL;
  -- El responsable de cada proyecto entra como miembro con rol 'responsable'.
  INSERT OR IGNORE INTO project_members (project_id, user_id, role)
    SELECT id, owner_id, 'responsable' FROM projects WHERE owner_id IS NOT NULL;
  `,
];

export const DEFAULT_SETTINGS = {
  fx_usd_crc: '515',          // ₡ por US$1. Actualizar con el tipo de cambio BCCR.
  update_sla_hours: '72',     // Compromiso público: avances cada 72 h.
  wip_en_progreso: '6',       // Límite WIP (Lean) de la columna "En progreso".
  wip_revision: '4',
};

/** Aplica migraciones pendientes y valores por defecto. */
export function migrate(db) {
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
  // Una fila por línea de servicio del catálogo; las ediciones del admin no se pisan.
  const service = db.prepare('INSERT OR IGNORE INTO service_lines (key, price_from_usd, unit) VALUES (?, ?, ?)');
  for (const [key, d] of Object.entries(SERVICE_DEFAULTS)) service.run(key, d.price_from_usd ?? null, d.unit ?? null);
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
