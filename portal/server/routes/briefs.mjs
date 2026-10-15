// ============================================================================
//  server/routes/briefs.mjs
//  Briefs creativos vistos por el EQUIPO: bandeja con filtros, alta para un
//  cliente, edición, envío en nombre del cliente, flujo de estados, comentarios
//  y notas internas, y versiones congeladas con su huella.
// ============================================================================

import { BRIEF_STATUS } from '../../shared/brief.js';
import { fail, invalid, has, id, oneOf } from '../http.mjs';
import { createHelpers } from './common.mjs';
import { createPortalHelpers } from './portal-common.mjs';
import { createBriefService } from './brief-service.mjs';

export function briefRoutes(route, ctx) {
  const { db } = ctx;
  const { keepOrCheck } = createHelpers(ctx);
  const portal = createPortalHelpers(ctx);
  const briefs = createBriefService(ctx, portal);
  const team = (user) => ({ type: 'equipo', user });

  route('GET', '/api/briefs', 'user', ({ query }) => {
    const status = oneOf(query.get('status'), 'status', BRIEF_STATUS);
    const clientId = id(query.get('client_id'), 'client_id');
    const projectId = id(query.get('project_id'), 'project_id');
    const where = ['1 = 1'];
    const args = [];
    if (status) { where.push('b.status = ?'); args.push(status); }
    if (clientId) { where.push('b.client_id = ?'); args.push(clientId); }
    if (projectId) { where.push('b.project_id = ?'); args.push(projectId); }
    const rows = db.prepare(`${briefs.BRIEF_SELECT} WHERE ${where.join(' AND ')}
      ORDER BY CASE b.status WHEN 'enviado' THEN 0 WHEN 'observado' THEN 1 WHEN 'aprobado' THEN 2 WHEN 'en_produccion' THEN 3
        WHEN 'borrador' THEN 4 WHEN 'entregado' THEN 5 ELSE 6 END, b.updated_at DESC, b.id DESC LIMIT 300`).all(...args);
    const counts = Object.fromEntries(Object.keys(BRIEF_STATUS).map((k) => [k, 0]));
    for (const r of db.prepare('SELECT status, COUNT(*) n FROM briefs GROUP BY status').all()) counts[r.status] = r.n;
    return { briefs: rows.map((r) => briefs.decorate(r, 'team', { withData: false })), counts };
  });

  route('POST', '/api/briefs', 'user', ({ user, body }) => {
    const clientId = id(body.client_id, 'client_id', { required: true });
    const client = db.prepare('SELECT id, name, owner_id FROM clients WHERE id = ?').get(clientId) ?? invalid('client_id', 'Cliente no encontrado.');
    const project = portal.projectOfClient(id(body.project_id, 'project_id'), client.id);
    const title = briefs.readTitle(body.title);
    // Un brief nuevo arranca con la marca del cliente ya escrita.
    const raw = body.data ?? {};
    if (typeof raw !== 'object' || Array.isArray(raw)) invalid('data', 'Formato inválido.');
    const data = briefs.readData({ brand: client.name, ...raw });
    const ownerId = has(body, 'owner_id') ? keepOrCheck(id(body.owner_id, 'owner_id'), null, 'owner_id') : project?.owner_id ?? client.owner_id ?? user.id;
    const briefId = briefs.create({ clientId: client.id, projectId: project?.id ?? null, title, data, ownerId, actor: team(user) });
    return { brief: briefs.decorate(briefs.getForTeam(briefId), 'team') };
  });

  route('GET', '/api/briefs/:id', 'user', ({ params }) => {
    const row = briefs.getForTeam(params.id);
    return {
      brief: briefs.decorate(row, 'team'),
      events: briefs.events(row.id, 'team'),
      versions: briefs.versions(row.id),
      deliverables: portal.listDeliverables({ briefId: row.id }),
      lead_days: ctx.numberSetting('brief_lead_days', 3),
    };
  });

  route('PATCH', '/api/briefs/:id', 'user', ({ user, body, params }) => {
    const row = briefs.getForTeam(params.id);
    briefs.checkFresh(row, body);
    const changes = {};
    if (has(body, 'title')) changes.title = briefs.readTitle(body.title);
    if (has(body, 'data')) changes.data = briefs.readData(body.data);
    if (has(body, 'project_id')) changes.project_id = portal.projectOfClient(id(body.project_id, 'project_id'), row.client_id)?.id ?? null;
    if (has(body, 'owner_id')) changes.owner_id = keepOrCheck(id(body.owner_id, 'owner_id'), row.owner_id, 'owner_id');
    if (has(body, 'urgent')) {
      if (typeof body.urgent !== 'boolean') invalid('urgent', 'Debe ser sí o no.');
      changes.urgent = body.urgent;
    }
    if (has(body, 'urgent_reason')) {
      const reason = typeof body.urgent_reason === 'string' ? body.urgent_reason.trim().slice(0, 300) : null;
      if (reason && reason.length < 5) invalid('urgent_reason', 'Mínimo 5 caracteres.');
      changes.urgent_reason = reason || null;
    }
    briefs.update(row, changes, team(user));
    if (changes.data || changes.title) ctx.log(user.id, 'brief', row.id, 'updated', `${user.name} editó el brief ${row.code}`);
    return { brief: briefs.decorate(briefs.getForTeam(row.id), 'team') };
  });

  route('POST', '/api/briefs/:id/submit', 'user', ({ user, body, params }) => {
    const row = briefs.getForTeam(params.id);
    briefs.checkFresh(row, body);
    const result = briefs.submit(row, team(user));
    return { brief: briefs.decorate(briefs.getForTeam(row.id), 'team'), ...result };
  });

  route('POST', '/api/briefs/:id/transition', 'user', ({ user, body, params }) => {
    const row = briefs.getForTeam(params.id);
    briefs.checkFresh(row, body);
    if (typeof body.to !== 'string') invalid('to', 'Campo requerido.');
    briefs.transition(row, body.to, body.note, user);
    return { brief: briefs.decorate(briefs.getForTeam(row.id), 'team'), events: briefs.events(row.id, 'team') };
  });

  route('POST', '/api/briefs/:id/comments', 'user', ({ user, body, params }) => {
    const row = briefs.getForTeam(params.id);
    if (has(body, 'internal') && typeof body.internal !== 'boolean') invalid('internal', 'Debe ser sí o no.');
    briefs.comment(row, team(user), body.body, { internal: body.internal === true });
    return { events: briefs.events(row.id, 'team') };
  });

  route('GET', '/api/briefs/:id/versions/:version', 'user', ({ params }) => {
    const row = briefs.getForTeam(params.id);
    if (params.version < 1) fail(404, 'not_found');
    return { version: briefs.version(row, params.version), brief: briefs.decorate(row, 'team', { withData: false }) };
  });
}
