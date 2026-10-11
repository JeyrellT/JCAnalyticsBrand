// ============================================================================
//  server/routes/automations.mjs
//  Centro de automatizaciones (lista, encender/apagar, configurar y "probar
//  ahora") y reglas de tareas recurrentes. El motor vive en ../automations.mjs
//  y se comparte por ctx.automations (servidor, pruebas y demo).
// ============================================================================

import { AUTOMATIONS, TASK_PRIORITY, RECURRING_FREQUENCIES, canInvest } from '../../shared/catalog.js';
import { fail, invalid, has, text, oneOf, id, number } from '../http.mjs';
import { recurringSummary, nextRuleDate } from '../automations.mjs';
import { createHelpers } from './common.mjs';

/** Automatizaciones cuyo historial habla de dinero de socios: no se muestran a colaboradores. */
const INVEST_ONLY = ['dinero_pendiente'];

export function automationRoutes(route, ctx) {
  const { db } = ctx;
  const engine = ctx.automations;
  const { userExists, keepOrCheck } = createHelpers(ctx);

  function visibleAutomations(user) {
    return engine.list().map((a) => (INVEST_ONLY.includes(a.key) && !canInvest(user) ? { ...a, last_result: null } : a));
  }

  function automationLog(user) {
    const hidden = canInvest(user) ? '' : `WHERE automation_key NOT IN (${INVEST_ONLY.map((k) => `'${k}'`).join(',')})`;
    return db.prepare(`SELECT id, automation_key, dedupe_key, summary, recipients, created_at FROM automation_log ${hidden}
      ORDER BY created_at DESC, id DESC LIMIT 50`).all()
      .map((row) => ({ ...row, automation_name: AUTOMATIONS[row.automation_key]?.name ?? row.automation_key }));
  }

  // ── Tareas recurrentes ────────────────────────────────────────────────────
  const RECURRING_SELECT = `SELECT r.*, u.name assignee_name, p.name project_name, cu.name created_by_name FROM recurring_tasks r
    LEFT JOIN users u ON u.id = r.assignee_id LEFT JOIN projects p ON p.id = r.project_id LEFT JOIN users cu ON cu.id = r.created_by`;
  const decorate = (r) => ({ ...r, active: !!r.active, summary: recurringSummary(r), next_date: nextRuleDate(r, ctx.today()) });
  const listRecurring = () => db.prepare(`${RECURRING_SELECT} ORDER BY r.active DESC, r.title COLLATE NOCASE, r.id`).all().map(decorate);
  const getRecurring = (ruleId) => {
    const row = db.prepare(`${RECURRING_SELECT} WHERE r.id = ?`).get(ruleId) ?? fail(404, 'not_found');
    return decorate(row);
  };
  const projectExists = (projectId) => {
    if (projectId == null) return null;
    if (!db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)) invalid('project_id', 'Proyecto no encontrado.');
    return projectId;
  };
  const integer = (value, field, opts) => {
    const n = number(value, field, opts);
    if (n != null && !Number.isInteger(n)) invalid(field, 'Debe ser un número entero.');
    return n;
  };

  function readRecurringBody(body, current = null) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current ? current[key] : fn(undefined));
    const r = {
      title: pick('title', (v) => text(v, 'title', { max: 200, min: 2, required: true })),
      description: pick('description', (v) => text(v, 'description', { max: 4000 })),
      project_id: pick('project_id', (v) => projectExists(id(v, 'project_id'))),
      assignee_id: pick('assignee_id', (v) => (current ? keepOrCheck(id(v, 'assignee_id'), current.assignee_id, 'assignee_id') : userExists(id(v, 'assignee_id'), 'assignee_id'))),
      priority: pick('priority', (v) => oneOf(v, 'priority', TASK_PRIORITY, { fallback: 'media' })),
      frequency: pick('frequency', (v) => oneOf(v, 'frequency', RECURRING_FREQUENCIES, { required: true })),
      weekday: pick('weekday', (v) => integer(v, 'weekday', { min: 1, max: 7 })),
      monthday: pick('monthday', (v) => integer(v, 'monthday', { min: 1, max: 28 })),
      due_in_days: pick('due_in_days', (v) => integer(v, 'due_in_days', { min: 0, max: 60 }) ?? 0),
      active: pick('active', (v) => (v == null ? 1 : [true, false, 0, 1].includes(v) ? (v ? 1 : 0) : invalid('active', 'Debe ser sí o no.'))),
    };
    if (r.frequency === 'semanal') {
      if (r.weekday == null) invalid('weekday', 'Elegí el día de la semana (1 = lunes … 7 = domingo).');
      r.monthday = null;
    } else if (r.frequency === 'mensual') {
      if (r.monthday == null) invalid('monthday', 'Elegí el día del mes (1 a 28).');
      r.weekday = null;
    } else {
      r.weekday = null;
      r.monthday = null;
    }
    return r;
  }

  const canEdit = (rule, user) => user.role === 'admin' || rule.created_by === user.id;

  // ── Rutas ─────────────────────────────────────────────────────────────────
  route('GET', '/api/automations', 'user', ({ user }) => ({
    automations: visibleAutomations(user),
    log: automationLog(user),
    recurring: listRecurring(),
  }));

  route('PATCH', '/api/automations/:key', 'admin', ({ user, body, params }) => {
    const before = engine.get(params.key);
    const automation = engine.configure(params.key, body);
    const changes = [];
    if (automation.enabled !== before.enabled) changes.push(automation.enabled ? 'la activó' : 'la desactivó');
    if (JSON.stringify(automation.config) !== JSON.stringify(before.config)) {
      changes.push(`cambió ${Object.entries(automation.config).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }
    if (changes.length) ctx.log(user.id, 'automation', null, 'updated', `${user.name} ${changes.join(' y ')} en "${automation.name}"`);
    return { automation };
  });

  route('POST', '/api/automations/:key/run', 'admin', async ({ user, params }) => {
    const result = await engine.run(params.key, { force: true });
    ctx.log(user.id, 'automation', null, 'run', `${user.name} ejecutó "${AUTOMATIONS[params.key].name}": ${result.summary}`);
    return { result: { summary: result.summary, recipients: result.recipients, ...(result.error ? { error: true } : {}) }, automation: engine.get(params.key) };
  });

  route('GET', '/api/recurring-tasks', 'user', () => ({ recurring: listRecurring() }));

  route('POST', '/api/recurring-tasks', 'user', ({ user, body }) => {
    const r = readRecurringBody(body);
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO recurring_tasks (title, description, project_id, assignee_id, priority, frequency, weekday,
      monthday, due_in_days, active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      r.title, r.description, r.project_id, r.assignee_id, r.priority, r.frequency, r.weekday, r.monthday, r.due_in_days, r.active, user.id, at, at,
    );
    const rule = getRecurring(Number(lastInsertRowid));
    ctx.log(user.id, 'recurring_task', rule.id, 'created', `${user.name} creó la tarea recurrente "${rule.title}" (${rule.summary})`);
    return { recurring_task: rule, recurring: listRecurring() };
  });

  route('PATCH', '/api/recurring-tasks/:id', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    if (!canEdit(current, user)) fail(403, 'forbidden');
    const r = readRecurringBody(body, current);
    db.prepare(`UPDATE recurring_tasks SET title = ?, description = ?, project_id = ?, assignee_id = ?, priority = ?, frequency = ?, weekday = ?,
      monthday = ?, due_in_days = ?, active = ?, updated_at = ? WHERE id = ?`).run(
      r.title, r.description, r.project_id, r.assignee_id, r.priority, r.frequency, r.weekday, r.monthday, r.due_in_days, r.active, ctx.nowIso(), current.id,
    );
    const rule = getRecurring(current.id);
    ctx.log(user.id, 'recurring_task', rule.id, 'updated', `${user.name} editó la tarea recurrente "${rule.title}" (${rule.summary})`);
    return { recurring_task: rule, recurring: listRecurring() };
  });

  route('DELETE', '/api/recurring-tasks/:id', 'user', ({ user, params }) => {
    const current = db.prepare('SELECT * FROM recurring_tasks WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    if (!canEdit(current, user)) fail(403, 'forbidden');
    db.prepare('DELETE FROM recurring_tasks WHERE id = ?').run(current.id);
    ctx.log(user.id, 'recurring_task', current.id, 'deleted', `${user.name} eliminó la tarea recurrente "${current.title}"`);
    return { ok: true, recurring: listRecurring() };
  });
}
