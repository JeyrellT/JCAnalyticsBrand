// ============================================================================
//  server/routes/services.mjs
//  Líneas de negocio: líder, equipo, precio "desde" y métricas de proyectos.
//  Todos ven el catálogo; solo el admin lo edita.
// ============================================================================

import { SERVICES, SERVICE_DEFAULTS, SERVICE_GROUPS } from '../../shared/catalog.js';
import { toCRC } from '../../shared/finance.js';
import { fail, invalid, has, text, oneOf, id } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { createHelpers, ACTIVE_PROJECT_STATUSES, ACTIVE_SQL } from './common.mjs';

const UNITS = ['mes', 'pieza'];
const MAX_MEMBERS = 20;

export function serviceRoutes(route, ctx) {
  const { db } = ctx;
  const { userExists, keepOrCheck, PROJECT_SELECT, decorateProject } = createHelpers(ctx);

  const getKey = (key) => (Object.hasOwn(SERVICES, key) ? key : fail(404, 'not_found'));

  /** Servicios en el orden del catálogo, con equipo y métricas. Con `only`, solo esa clave. */
  function listServices(only = null) {
    const keys = only ? [only] : Object.keys(SERVICES);
    const lines = new Map(db.prepare(`SELECT s.*, u.name lead_name, u.color lead_color FROM service_lines s
      LEFT JOIN users u ON u.id = s.lead_id`).all().map((r) => [r.key, r]));
    const members = db.prepare(`SELECT sm.service_key, u.id, u.name, u.color FROM service_members sm JOIN users u ON u.id = sm.user_id
      ORDER BY u.name`).all();
    const projects = db.prepare('SELECT service, status, archived, value_amount, currency FROM projects WHERE service IS NOT NULL').all();
    const openTasks = new Map(db.prepare(`SELECT p.service, COUNT(*) n FROM tasks t JOIN projects p ON p.id = t.project_id
      WHERE t.status <> 'hecho' AND p.archived = 0 AND p.service IS NOT NULL GROUP BY p.service`).all().map((r) => [r.service, r.n]));
    const fx = ctx.numberSetting('fx_usd_crc', 515);
    return keys.map((key) => {
      const defaults = SERVICE_DEFAULTS[key] ?? { group: 'sistemas', price_from_usd: null, unit: null };
      const line = lines.get(key) ?? { price_from_usd: defaults.price_from_usd, unit: defaults.unit, active: 1 };
      const mine = projects.filter((p) => p.service === key);
      const active = mine.filter((p) => !p.archived && ACTIVE_PROJECT_STATUSES.includes(p.status));
      return {
        key,
        name: SERVICES[key],
        group: defaults.group,
        group_label: SERVICE_GROUPS[defaults.group]?.label ?? defaults.group,
        lead_id: line.lead_id ?? null,
        lead_name: line.lead_name ?? null,
        lead_color: line.lead_color ?? null,
        price_from_usd: line.price_from_usd ?? null,
        unit: line.unit ?? null,
        description: line.description ?? null,
        active: !!line.active,
        updated_at: line.updated_at ?? null,
        members: members.filter((m) => m.service_key === key).map(({ id: userId, name, color }) => ({ id: userId, name, color })),
        projects_active: active.length,
        projects_total: mine.length,
        value_crc_active: active.reduce((sum, p) => sum + (p.value_amount ? toCRC(p.value_amount, p.currency, fx) ?? 0 : 0), 0),
        open_tasks: openTasks.get(key) ?? 0,
      };
    });
  }
  const getService = (key) => listServices(getKey(key))[0];

  route('GET', '/api/services', 'user', () => ({ services: listServices() }));

  route('GET', '/api/services/:key', 'user', ({ params }) => {
    const service = getService(params.key);
    const projects = db.prepare(`${PROJECT_SELECT} WHERE p.service = ? AND p.archived = 0
      ORDER BY CASE WHEN p.status IN ${ACTIVE_SQL} THEN 0 ELSE 1 END, p.updated_at DESC`).all(service.key).map(decorateProject);
    // Líder, equipo fijo y luego quienes participan en proyectos de este servicio.
    const people = new Map();
    if (service.lead_id) people.set(service.lead_id, { id: service.lead_id, name: service.lead_name, color: service.lead_color, role: 'lider' });
    for (const m of service.members) if (!people.has(m.id)) people.set(m.id, { ...m, role: 'equipo' });
    for (const p of projects) {
      for (const m of p.members) if (!people.has(m.id)) people.set(m.id, { id: m.id, name: m.name, color: m.color, role: 'proyecto' });
    }
    return { service, projects, people: [...people.values()] };
  });

  route('PATCH', '/api/services/:key', 'admin', ({ user, body, params }) => {
    const key = getKey(params.key);
    const current = db.prepare('SELECT * FROM service_lines WHERE key = ?').get(key) ?? {};
    const previousMembers = db.prepare('SELECT user_id FROM service_members WHERE service_key = ?').all(key).map((r) => r.user_id);
    const pick = (field, fn) => (has(body, field) ? fn(body[field]) : current[field] ?? null);
    const next = {
      lead_id: pick('lead_id', (v) => keepOrCheck(id(v, 'lead_id'), current.lead_id, 'lead_id')),
      price_from_usd: pick('price_from_usd', (v) => {
        if (v == null || v === '') return null;
        const n = Number(v);
        if (!Number.isSafeInteger(n) || n < 0) invalid('price_from_usd', 'Debe ser un entero mayor o igual a 0.');
        return n;
      }),
      unit: pick('unit', (v) => oneOf(v, 'unit', UNITS)),
      description: pick('description', (v) => text(v, 'description', { max: 1000 })),
      active: has(body, 'active') ? (body.active ? 1 : 0) : current.active ?? 1,
    };
    let members = null;
    if (has(body, 'members')) {
      if (!Array.isArray(body.members) || body.members.length > MAX_MEMBERS) invalid('members', 'Lista inválida.');
      members = [...new Set(body.members.map((v) => {
        const userId = id(v, 'members', { required: true });
        return previousMembers.includes(userId) ? userId : userExists(userId, 'members');
      }))];
    }
    transaction(db, () => {
      db.prepare(`INSERT INTO service_lines (key, lead_id, price_from_usd, unit, description, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET lead_id = excluded.lead_id, price_from_usd = excluded.price_from_usd, unit = excluded.unit,
          description = excluded.description, active = excluded.active, updated_at = excluded.updated_at`).run(
        key, next.lead_id, next.price_from_usd, next.unit, next.description, next.active, ctx.nowIso(),
      );
      if (members) {
        db.prepare('DELETE FROM service_members WHERE service_key = ?').run(key);
        const stmt = db.prepare('INSERT INTO service_members (service_key, user_id) VALUES (?, ?)');
        for (const userId of members) stmt.run(key, userId);
      }
    });

    const name = SERVICES[key];
    const link = `/servicios/${key}`;
    const changes = [];
    const previousLead = current.lead_id ?? null;
    if (next.lead_id !== previousLead) {
      changes.push(`líder → ${next.lead_id ? ctx.userName(next.lead_id) : 'sin líder'}`);
      if (next.lead_id) ctx.notify([next.lead_id], user.id, { kind: 'service', title: `Sos líder de ${name}`, body: `${user.name} te asignó la línea de servicio.`, link });
      if (previousLead) ctx.notify([previousLead], user.id, { kind: 'service', title: `Ya no liderás ${name}`, body: `${user.name} cambió el liderazgo de la línea.`, link });
    }
    if (members) {
      const added = members.filter((m) => !previousMembers.includes(m));
      const removed = previousMembers.filter((m) => !members.includes(m));
      if (added.length || removed.length) changes.push(`equipo de ${members.length}`);
      ctx.notify(added, user.id, { kind: 'service', title: `Te sumaron a ${name}`, body: `${user.name} te agregó al equipo de la línea.`, link });
      ctx.notify(removed, user.id, { kind: 'service', title: `Saliste del equipo de ${name}`, body: `${user.name} actualizó el equipo de la línea.`, link });
    }
    if (next.active !== (current.active ?? 1)) changes.push(next.active ? 'activada' : 'pausada');
    if (next.price_from_usd !== (current.price_from_usd ?? null)) changes.push(`desde US$${next.price_from_usd ?? '—'}`);
    ctx.log(user.id, 'service', null, 'updated', `${user.name} actualizó ${name}${changes.length ? ` (${changes.join(', ')})` : ''}`);
    return { service: getService(key) };
  });
}
