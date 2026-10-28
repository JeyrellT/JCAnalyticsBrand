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
import { SERVICE_PRICING } from '../shared/service-pricing.js';

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
  // 4 · Avisos push, preferencias, automatizaciones y tareas recurrentes (ver docs/v3-contrato.md).
  `
  CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    platform TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    last_success_at TEXT,
    last_error TEXT,
    failures INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX push_subscriptions_user ON push_subscriptions(user_id);

  CREATE TABLE notification_prefs (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_enabled INTEGER NOT NULL DEFAULT 1,
    categories TEXT NOT NULL DEFAULT '{}',
    quiet_start TEXT NOT NULL DEFAULT '21:00',
    quiet_end TEXT NOT NULL DEFAULT '07:00',
    digest_enabled INTEGER NOT NULL DEFAULT 1,
    digest_time TEXT NOT NULL DEFAULT '07:30',
    updated_at TEXT
  );

  CREATE TABLE automations (
    key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    config TEXT NOT NULL DEFAULT '{}',
    last_run_at TEXT,
    last_result TEXT,
    runs INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  );

  CREATE TABLE automation_log (
    id INTEGER PRIMARY KEY,
    automation_key TEXT NOT NULL,
    dedupe_key TEXT UNIQUE,
    summary TEXT NOT NULL,
    recipients INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX automation_log_created ON automation_log(created_at);

  CREATE TABLE recurring_tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    assignee_id INTEGER REFERENCES users(id),
    priority TEXT NOT NULL DEFAULT 'media',
    frequency TEXT NOT NULL CHECK (frequency IN ('diaria','semanal','mensual')),
    weekday INTEGER,
    monthday INTEGER,
    due_in_days INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    last_created_on TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Claves VAPID y otros secretos del servidor: ninguna ruta de la API los lee.
  CREATE TABLE app_secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  // 5 · Portal de clientes y brief creativo (ver docs/v5-contrato.md).
  //     Las cuentas de cliente son una identidad APARTE de users: otra tabla,
  //     otra cookie y otras rutas (/api/client/*). Todo lo del cliente cuelga de client_id.
  `
  CREATE TABLE client_accounts (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    phone TEXT,
    title TEXT,
    can_approve INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );
  CREATE INDEX client_accounts_client ON client_accounts(client_id);

  CREATE TABLE client_sessions (
    token_hash TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT
  );
  CREATE INDEX client_sessions_account ON client_sessions(account_id);

  CREATE TABLE client_notifications (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX client_notifications_account ON client_notifications(account_id, read_at, created_at);

  CREATE TABLE project_milestones (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_curso','completado')),
    position REAL NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX project_milestones_project ON project_milestones(project_id, position);

  CREATE TABLE briefs (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'borrador'
      CHECK (status IN ('borrador','enviado','observado','aprobado','en_produccion','entregado','cerrado','cancelado')),
    data TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 0,
    approved_version INTEGER,
    owner_id INTEGER REFERENCES users(id),
    urgent INTEGER NOT NULL DEFAULT 0,
    urgent_reason TEXT,
    send_start TEXT,
    created_by_user INTEGER REFERENCES users(id),
    created_by_account INTEGER REFERENCES client_accounts(id),
    submitted_at TEXT,
    approved_at TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX briefs_client ON briefs(client_id, status);
  CREATE INDEX briefs_status ON briefs(status, updated_at);

  -- Cada envío congela una versión con su huella SHA-256 (no se editan ni se borran).
  CREATE TABLE brief_versions (
    id INTEGER PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    hash TEXT NOT NULL,
    submitted_by_user INTEGER REFERENCES users(id),
    submitted_by_account INTEGER REFERENCES client_accounts(id),
    created_at TEXT NOT NULL,
    UNIQUE (brief_id, version)
  );

  CREATE TABLE brief_events (
    id INTEGER PRIMARY KEY,
    brief_id INTEGER NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('equipo','cliente','sistema')),
    user_id INTEGER REFERENCES users(id),
    account_id INTEGER REFERENCES client_accounts(id),
    kind TEXT NOT NULL CHECK (kind IN ('creado','enviado','estado','comentario','nota_interna')),
    from_status TEXT,
    to_status TEXT,
    version INTEGER,
    body TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX brief_events_brief ON brief_events(brief_id, created_at);

  CREATE TABLE deliverables (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    brief_id INTEGER REFERENCES briefs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'en_revision' CHECK (status IN ('en_revision','aprobado','cambios')),
    shared_by INTEGER REFERENCES users(id),
    shared_at TEXT NOT NULL,
    decided_by_account INTEGER REFERENCES client_accounts(id),
    decided_at TEXT,
    decision_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX deliverables_client ON deliverables(client_id, status);
  CREATE INDEX deliverables_project ON deliverables(project_id);

  CREATE TABLE deliverable_events (
    id INTEGER PRIMARY KEY,
    deliverable_id INTEGER NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('equipo','cliente')),
    user_id INTEGER REFERENCES users(id),
    account_id INTEGER REFERENCES client_accounts(id),
    kind TEXT NOT NULL CHECK (kind IN ('compartido','nueva_version','aprobado','cambios')),
    note TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX deliverable_events_deliverable ON deliverable_events(deliverable_id, created_at);

  CREATE TABLE client_documents (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'otro',
    note TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX client_documents_client ON client_documents(client_id);
  `,
  // 6 · Rol "inversionista" (v6, ver docs/v6-contrato.md). SQLite no permite cambiar un CHECK:
  //     se reconstruye users con el procedimiento oficial (claves foráneas apagadas solo durante
  //     esta migración, copia, reemplazo y verificación de integridad al final). Los ids no cambian.
  {
    foreignKeysOff: true,
    sql: `
  CREATE TABLE users_v6 (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','socio','colaborador','inversionista')),
    color TEXT NOT NULL DEFAULT '#0065df',
    phone TEXT,
    password_hash TEXT NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );
  INSERT INTO users_v6 (id, email, name, role, color, phone, password_hash, must_change_password, active, created_at, last_login_at)
    SELECT id, email, name, role, color, phone, password_hash, must_change_password, active, created_at, last_login_at FROM users;
  DROP TABLE users;
  ALTER TABLE users_v6 RENAME TO users;
  `,
  },
  // 7 · Enlaces de registro (v7, ver docs/v7-contrato.md). El token se guarda para que el admin
  //     pueda volver a copiar el enlace; quien tiene la base ya tiene todo lo demás.
  `
  CREATE TABLE invites (
    id INTEGER PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('team','client')),
    role TEXT CHECK (role IN ('admin','socio','colaborador','inversionista')),
    client_id INTEGER REFERENCES clients(id),
    can_approve INTEGER NOT NULL DEFAULT 1,
    name TEXT,
    label TEXT,
    message TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 200),
    uses INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    CHECK ((kind = 'team' AND role IS NOT NULL AND client_id IS NULL) OR (kind = 'client' AND role IS NULL AND client_id IS NOT NULL))
  );
  CREATE INDEX invites_created ON invites(created_at);

  CREATE TABLE invite_uses (
    id INTEGER PRIMARY KEY,
    invite_id INTEGER NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    account_id INTEGER REFERENCES client_accounts(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    ip TEXT,
    used_at TEXT NOT NULL
  );
  CREATE INDEX invite_uses_invite ON invite_uses(invite_id);
  `,
  // 8 · Cada inversionista puede aportar solo en las inversiones habilitadas por un admin.
  //     El backfill conserva los accesos existentes una sola vez; revocar no borra movimientos.
  `
  CREATE TABLE investment_access (
    investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    investor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    granted_at TEXT NOT NULL,
    PRIMARY KEY (investment_id, investor_id)
  );
  CREATE INDEX investment_access_investor ON investment_access(investor_id);
  INSERT INTO investment_access (investment_id, investor_id, granted_by, granted_at)
    SELECT DISTINCT m.investment_id, m.partner_id, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    FROM movements m JOIN users u ON u.id = m.partner_id WHERE u.role = 'inversionista';
  `,
  // 9 · Libro de costos/cobros y anticipos anuales de campañas; sin inventar datos históricos.
  `
  ALTER TABLE movements ADD COLUMN return_kind TEXT NOT NULL DEFAULT 'unclassified' CHECK (return_kind IN ('capital','profit','mixed','unclassified'));
  ALTER TABLE movements ADD COLUMN return_capital_amount INTEGER CHECK (return_capital_amount >= 0);
  ALTER TABLE movements ADD COLUMN return_profit_amount INTEGER CHECK (return_profit_amount >= 0);
  CREATE TABLE finance_entries (
    id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('revenue','expense')), category TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), currency TEXT NOT NULL CHECK (currency IN ('CRC','USD')),
    fx_rate REAL, amount_crc INTEGER NOT NULL CHECK (amount_crc > 0), date TEXT NOT NULL,
    paid INTEGER NOT NULL CHECK (paid IN (0,1)), paid_date TEXT, description TEXT NOT NULL, reference TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')), void_reason TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX finance_entries_date ON finance_entries(date, status);
  CREATE TABLE finance_allocations (
    id INTEGER PRIMARY KEY, entry_id INTEGER NOT NULL REFERENCES finance_entries(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0), amount_crc INTEGER NOT NULL CHECK (amount_crc >= 0),
    service_key TEXT REFERENCES service_lines(key), project_id INTEGER REFERENCES projects(id), investment_id INTEGER REFERENCES investments(id)
  );
  CREATE INDEX finance_allocations_investment ON finance_allocations(investment_id, entry_id);
  CREATE TABLE finance_cost_plans (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, service_key TEXT REFERENCES service_lines(key), currency TEXT NOT NULL,
    units INTEGER NOT NULL CHECK (units > 0), price_per_unit INTEGER NOT NULL CHECK (price_per_unit >= 0),
    margin_bps INTEGER NOT NULL CHECK (margin_bps BETWEEN 0 AND 9500), costs_json TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE finance_policies (
    investment_id INTEGER NOT NULL REFERENCES investments(id), year INTEGER NOT NULL,
    configured INTEGER NOT NULL DEFAULT 0, rate_bps INTEGER NOT NULL DEFAULT 2000 CHECK (rate_bps BETWEEN 1 AND 10000),
    beneficiary_ids TEXT NOT NULL DEFAULT '[]',
    reserve_amount INTEGER NOT NULL DEFAULT 0 CHECK (reserve_amount >= 0), costs_reviewed_through TEXT, fx_rate REAL,
    closed_at TEXT, close_snapshot TEXT, updated_by INTEGER NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL,
    PRIMARY KEY (investment_id, year)
  );
  CREATE TABLE finance_distributions (
    id INTEGER PRIMARY KEY, investment_id INTEGER NOT NULL REFERENCES investments(id), year INTEGER NOT NULL, month TEXT NOT NULL,
    date TEXT NOT NULL, profit_amount INTEGER NOT NULL CHECK (profit_amount >= 0), capital_amount INTEGER NOT NULL CHECK (capital_amount >= 0),
    message TEXT NOT NULL, reference TEXT, idempotency_key TEXT NOT NULL UNIQUE, request_json TEXT NOT NULL,
    snapshot_json TEXT NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
  );
  CREATE TABLE finance_distribution_items (
    id INTEGER PRIMARY KEY, distribution_id INTEGER NOT NULL REFERENCES finance_distributions(id), partner_id INTEGER NOT NULL REFERENCES users(id),
    return_kind TEXT NOT NULL CHECK (return_kind IN ('capital','profit')), amount INTEGER NOT NULL CHECK (amount > 0),
    movement_id INTEGER NOT NULL UNIQUE REFERENCES movements(id)
  );
  CREATE INDEX finance_distributions_period ON finance_distributions(investment_id, year, month);
  CREATE TABLE finance_month_weights (
    investment_id INTEGER NOT NULL REFERENCES investments(id), month TEXT NOT NULL, weights_json TEXT NOT NULL,
    created_at TEXT NOT NULL, PRIMARY KEY (investment_id, month)
  );
  ${Object.entries(SERVICE_PRICING).map(([key, pricing]) => `UPDATE service_lines SET price_from_usd = ${pricing.base_usd} WHERE key = '${key}';`).join('\n')}
  `,

  // 10 · Conexión con Claude (MCP, ver docs/mcp-claude.md). Tokens personales: solo se guarda el hash;
  //      el token actúa con los permisos de su dueño y se revoca sin tocar la contraseña.
  `
  CREATE TABLE mcp_tokens (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    hint TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    revoked_at TEXT
  );
  CREATE INDEX mcp_tokens_user ON mcp_tokens(user_id, revoked_at);
  `,
  // 11 · Cobros de los proyectos: pagos únicos y recurrentes (semanal, quincenal, mensual…).
  //      Cada línea genera su calendario con shared/billing.js; "hasta" es opcional.
  `
  CREATE TABLE project_charges (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    concept TEXT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('CRC','USD')),
    frequency TEXT NOT NULL CHECK (frequency IN ('unico','semanal','quincenal','mensual','bimestral','trimestral','semestral','anual')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX project_charges_project ON project_charges(project_id);
  `,
  // 12 · Libro amarillo: directorio de prospección por teléfono (docs/libro-amarillo.md).
  //      Cada llamada queda en directory_calls; cada archivo importado, en directory_imports
  //      (para poder deshacerlo). phone_key = 8 dígitos del teléfono principal, para no duplicar.
  `
  CREATE TABLE directory_imports (
    id INTEGER PRIMARY KEY,
    file_name TEXT NOT NULL,
    rows_total INTEGER NOT NULL DEFAULT 0,
    inserted INTEGER NOT NULL DEFAULT 0,
    merged INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    undone_at TEXT
  );
  CREATE TABLE directory_entries (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    province TEXT,
    canton TEXT,
    district TEXT,
    address TEXT,
    phone TEXT,
    phone_alt TEXT,
    whatsapp TEXT,
    phone_key TEXT,
    social TEXT,
    website TEXT,
    source TEXT,
    opportunity TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente'
      CHECK (status IN ('pendiente','no_contesta','volver_a_llamar','interesado','cliente','no_interesado','numero_malo')),
    observations TEXT,
    last_note TEXT,
    assigned_to INTEGER REFERENCES users(id),
    next_call_at TEXT,
    last_call_at TEXT,
    call_count INTEGER NOT NULL DEFAULT 0,
    revision INTEGER NOT NULL DEFAULT 0,
    import_id INTEGER REFERENCES directory_imports(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX directory_entries_phone ON directory_entries(phone_key);
  CREATE INDEX directory_entries_status ON directory_entries(status, next_call_at);
  CREATE INDEX directory_entries_import ON directory_entries(import_id);
  CREATE TABLE directory_calls (
    id INTEGER PRIMARY KEY,
    entry_id INTEGER NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    outcome TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX directory_calls_entry ON directory_calls(entry_id, created_at);
  `,
];

export const DEFAULT_SETTINGS = {
  fx_usd_crc: '515',          // ₡ por US$1. Actualizar con el tipo de cambio BCCR.
  update_sla_hours: '72',     // Compromiso público: avances cada 72 h.
  wip_en_progreso: '6',       // Límite WIP (Lean) de la columna "En progreso".
  wip_revision: '4',
  brief_lead_days: '3',       // Días mínimos de producción entre el envío de un brief y su fecha de salida.
};

/**
 * Aplica migraciones pendientes y valores por defecto. Una migración es SQL o
 * { sql, foreignKeysOff: true } para reconstruir una tabla con hijos: las claves
 * foráneas se apagan fuera de la transacción (no se pueden cambiar dentro), se
 * verifica la integridad antes de confirmar y se restaura el valor anterior.
 */
export function migrate(db) {
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  for (let i = version; i < MIGRATIONS.length; i += 1) {
    const step = typeof MIGRATIONS[i] === 'string' ? { sql: MIGRATIONS[i] } : MIGRATIONS[i];
    const fkBefore = step.foreignKeysOff ? db.prepare('PRAGMA foreign_keys').get().foreign_keys : null;
    if (step.foreignKeysOff) db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      db.exec(step.sql);
      if (step.foreignKeysOff) {
        const broken = db.prepare('PRAGMA foreign_key_check').all();
        if (broken.length) throw new Error(`Migración ${i + 1}: ${broken.length} referencias rotas (${JSON.stringify(broken[0])})`);
      }
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      if (step.foreignKeysOff && fkBefore) db.exec('PRAGMA foreign_keys = ON');
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
