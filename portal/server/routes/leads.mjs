// ============================================================================
//  server/routes/leads.mjs
//  Consultas que llegan desde el sitio (bandeja del equipo) y la analítica de
//  tráfico propia. Corre también en la demo del navegador: sin módulos de Node.
//
//  - Todo el equipo (sin inversionistas) ve y trabaja las consultas; borrar
//    una (por ejemplo, a pedido de la persona) es solo del admin.
//  - Ediciones concurrentes: `expected_revision` como en el libro amarillo.
//  - El texto del visitante se devuelve tal cual se guardó (ya limpio) y la
//    interfaz lo pinta como texto. Nada de esto se expone por MCP.
// ============================================================================

import { LEAD_STATUS, LEAD_CONTACT_VIA, LEAD_LIMITS, isSitePath } from '../../shared/leads.js';
import { fail, invalid, has, text, oneOf, id, dateOnly } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { sameName } from './common.mjs';
import { computeAnalytics, analyticsDays, safeDiv } from '../analytics.mjs';

export function leadRoutes(route, ctx) {
  const { db } = ctx;

  const SELECT = `SELECT l.*, u.name owner_name, u.color owner_color, c.name client_name,
      (SELECT COUNT(*) FROM lead_notes n WHERE n.lead_id = l.id AND n.kind = 'nota') note_count
    FROM leads l LEFT JOIN users u ON u.id = l.owner_id LEFT JOIN clients c ON c.id = l.client_id`;
  const decorate = (row) => (row ? { ...row, flags: row.flags ? row.flags.split(',') : [] } : row);
  const getLead = (leadId) => decorate(db.prepare(`${SELECT} WHERE l.id = ?`).get(leadId)) ?? fail(404, 'not_found');

  const addNote = (leadId, userId, kind, body) => db.prepare('INSERT INTO lead_notes (lead_id, user_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(leadId, userId, kind, body, ctx.nowIso());
  const touch = (leadId, extra = '', args = []) => db.prepare(`UPDATE leads SET ${extra ? `${extra}, ` : ''}revision = revision + 1, updated_at = ? WHERE id = ?`)
    .run(...args, ctx.nowIso(), leadId);

  const assignable = (userId) => {
    if (userId == null) return null;
    if (!db.prepare("SELECT 1 FROM users WHERE id = ? AND active = 1 AND role <> 'inversionista'").get(userId)) invalid('owner_id', 'Persona no encontrada.');
    return userId;
  };
  const checkRevision = (body, current) => {
    if (body.expected_revision != null && Number(body.expected_revision) !== current.revision) {
      fail(409, 'conflict', { message: 'Alguien más guardó cambios en esta consulta. Revisá la versión actual.', lead: getLead(current.id) });
    }
  };

  // ── Bandeja ───────────────────────────────────────────────────────────────
  route('GET', '/api/leads', 'user', ({ query }) => {
    const status = oneOf(query.get('status'), 'status', LEAD_STATUS);
    const leads = db.prepare(`${SELECT} ${status ? 'WHERE l.status = ?' : ''} ORDER BY l.created_at DESC, l.id DESC LIMIT 1000`)
      .all(...(status ? [status] : [])).map(decorate);
    const counts = Object.fromEntries(Object.keys(LEAD_STATUS).map((k) => [k, 0]));
    for (const r of db.prepare('SELECT status, COUNT(*) n FROM leads GROUP BY status').all()) counts[r.status] = r.n;
    return { leads, counts, today: ctx.today() };
  });

  route('GET', '/api/leads/:id', 'user', ({ params }) => {
    const lead = getLead(params.id);
    const notes = db.prepare(`SELECT n.*, u.name user_name, u.color user_color FROM lead_notes n LEFT JOIN users u ON u.id = n.user_id
      WHERE n.lead_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 200`).all(lead.id);
    // Recorrido de la visita que terminó en la consulta: páginas, secciones y clics, en orden.
    // Los últimos 200 eventos hasta la consulta (lo que hizo justo antes de escribir), en orden.
    const journey = lead.session_id ? db.prepare(`SELECT * FROM (SELECT id, type, path, section, target, label, value, at FROM site_events
      WHERE session_id = ? AND at <= ? ORDER BY at DESC, id DESC LIMIT 200) ORDER BY at, id`).all(lead.session_id, lead.created_at) : [];
    return { lead, notes, journey };
  });

  route('PATCH', '/api/leads/:id', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    checkRevision(body, current);
    const next = {
      status: has(body, 'status') ? oneOf(body.status, 'status', LEAD_STATUS, { required: true }) : current.status,
      owner_id: has(body, 'owner_id') ? assignable(id(body.owner_id, 'owner_id')) : current.owner_id,
      next_action_at: has(body, 'next_action_at') ? dateOnly(body.next_action_at, 'next_action_at') : current.next_action_at,
    };
    transaction(db, () => {
      touch(current.id, 'status = ?, owner_id = ?, next_action_at = ?', [next.status, next.owner_id, next.next_action_at]);
      if (next.status !== current.status) addNote(current.id, user.id, 'estado', `${user.name} cambió el estado a ${LEAD_STATUS[next.status].label}.`);
      if (next.owner_id !== current.owner_id) {
        addNote(current.id, user.id, 'asignacion', next.owner_id ? `${user.name} asignó la consulta a ${ctx.userName(next.owner_id)}.` : `${user.name} quitó la asignación.`);
      }
    });
    if (next.owner_id && next.owner_id !== current.owner_id) {
      ctx.notify([next.owner_id], user.id, { kind: 'lead', title: `${user.name} te asignó una consulta de la web`, body: current.name ?? current.need ?? null, link: `/consultas/${current.id}` });
    }
    ctx.log(user.id, 'lead', current.id, 'updated', `${user.name} actualizó una consulta de la web${next.status !== current.status ? ` (estado → ${LEAD_STATUS[next.status].label})` : ''}`);
    return { lead: getLead(current.id) };
  });

  route('POST', '/api/leads/:id/notes', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT id FROM leads WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const note = text(body.body, 'body', { max: LEAD_LIMITS.note, required: true });
    transaction(db, () => { addNote(current.id, user.id, 'nota', note); touch(current.id); });
    return { lead: getLead(current.id) };
  });

  // Deja constancia de que se le escribió o llamó; una consulta nueva pasa a "Contactada".
  route('POST', '/api/leads/:id/contacted', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    const via = oneOf(body.via, 'via', LEAD_CONTACT_VIA, { required: true });
    const status = current.status === 'nuevo' ? 'contactado' : current.status;
    transaction(db, () => {
      touch(current.id, 'status = ?, contacted_at = ?, owner_id = COALESCE(owner_id, ?)', [status, ctx.nowIso(), user.id]);
      addNote(current.id, user.id, 'contacto', `${user.name} la contactó por ${LEAD_CONTACT_VIA[via]}.`);
    });
    ctx.log(user.id, 'lead', current.id, 'contacted', `${user.name} contactó una consulta de la web por ${LEAD_CONTACT_VIA[via]}`);
    return { lead: getLead(current.id) };
  });

  // Pasa la consulta a la ficha de clientes (como prospecto) o la vincula con uno existente.
  route('POST', '/api/leads/:id/convert', 'user', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    if (current.client_id) fail(409, 'already_linked', { message: 'Esta consulta ya está vinculada con un cliente.', client_id: current.client_id });
    let clientId = id(body.client_id, 'client_id');
    if (clientId) {
      if (!db.prepare('SELECT 1 FROM clients WHERE id = ?').get(clientId)) invalid('client_id', 'Cliente no encontrado.');
    } else {
      // El nombre de la ficha lo escribe el equipo: el del visitante no se copia solo (las fichas de clientes las lee Claude por MCP).
      const name = text(body.name, 'name', { max: 120, min: 2 }) ?? invalid('name', 'Escribí el nombre del cliente o de la empresa.');
      const clash = db.prepare('SELECT id, name FROM clients').all().find((r) => sameName(r.name, name));
      if (clash) fail(409, 'duplicate', { field: 'name', message: `Ya existe el cliente ${clash.name}. Podés vincular la consulta con esa ficha.`, client_id: clash.id });
      const at = ctx.nowIso();
      const notes = [current.need && `Le interesa: ${current.need}`, current.package && `Paquete: ${current.package}`, 'Llegó desde la web (consulta del portal).'].filter(Boolean).join('\n');
      clientId = Number(db.prepare(`INSERT INTO clients (name, status, contact_name, contact_phone, contact_email, notes, owner_id, created_by, created_at, updated_at)
        VALUES (?, 'prospecto', ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, current.name, current.phone, current.email, notes, current.owner_id ?? user.id, user.id, at, at).lastInsertRowid);
      ctx.log(user.id, 'client', clientId, 'created', `${user.name} registró el prospecto ${name} desde una consulta de la web`);
    }
    const clientName = db.prepare('SELECT name FROM clients WHERE id = ?').get(clientId).name;
    transaction(db, () => {
      touch(current.id, "client_id = ?, status = CASE WHEN status IN ('nuevo','contactado') THEN 'en_conversacion' ELSE status END", [clientId]);
      addNote(current.id, user.id, 'conversion', `${user.name} la vinculó con la ficha de ${clientName}.`);
    });
    return { lead: getLead(current.id), client_id: clientId };
  });

  route('DELETE', '/api/leads/:id', 'admin', ({ user, params }) => {
    const current = db.prepare('SELECT id FROM leads WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    db.prepare('DELETE FROM leads WHERE id = ?').run(current.id);
    ctx.log(user.id, 'lead', current.id, 'deleted', `${user.name} borró una consulta de la web y sus notas`);
    return { ok: true };
  });

  // ── Analítica ─────────────────────────────────────────────────────────────
  // Los agregados viven en server/analytics.mjs: los comparte la automatización «Resumen semanal de tráfico».
  route('GET', '/api/analytics', 'user', ({ query }) => computeAnalytics(ctx, query.get('days')));

  // Detalle de una página: qué se lee, hasta dónde se baja y qué se toca en esa ruta.
  route('GET', '/api/analytics/page', 'user', ({ query }) => {
    const path = query.get('path');
    if (!isSitePath(path)) invalid('path', 'Ruta inválida.');
    const days = analyticsDays(query.get('days'));
    const from = ctx.today(-(days - 1));
    const all = (sql, ...args) => db.prepare(sql).all(from, path, ...args);
    const one = (sql, ...args) => db.prepare(sql).get(from, path, ...args);
    const W = 'day >= ? AND path = ?';
    const base = one(`SELECT COUNT(DISTINCT CASE WHEN type = 'view' THEN session_id END) sessions, SUM(type = 'view') views,
        COALESCE(SUM(CASE WHEN type = 'section' THEN value END), 0) engaged_ms, SUM(type = 'lead') leads FROM site_events WHERE ${W}`);
    const sessions = base.sessions || 0;
    const byDay = new Map(all(`SELECT day, COUNT(DISTINCT session_id) n FROM site_events WHERE ${W} AND type = 'view' GROUP BY day`).map((r) => [r.day, r.n]));
    const bounded = (n) => Math.min(n ?? 0, sessions);
    return {
      path, days, from, to: ctx.today(), sessions, views: base.views || 0, leads: base.leads || 0,
      avg_engaged_ms: sessions ? Math.round((base.engaged_ms || 0) / sessions) : 0,
      sections: all(`SELECT section, SUM(value) ms, COUNT(DISTINCT session_id) sessions FROM site_events WHERE ${W} AND type = 'section' AND section IS NOT NULL
        GROUP BY section ORDER BY sessions DESC LIMIT 30`).map((r) => ({ section: r.section, sessions: bounded(r.sessions), total_ms: r.ms, avg_ms: Math.round(r.ms / Math.max(1, r.sessions)), reach: safeDiv(bounded(r.sessions), sessions) })),
      scroll: [25, 50, 75, 100].map((pct) => ({ pct, sessions: bounded(one(`SELECT COUNT(DISTINCT session_id) n FROM site_events WHERE ${W} AND type = 'scroll' AND value >= ?`, pct).n) })),
      clicks: all(`SELECT target, label, section, COUNT(*) clicks, COUNT(DISTINCT session_id) sessions FROM site_events WHERE ${W} AND type = 'click'
        GROUP BY target, label, section ORDER BY clicks DESC LIMIT 20`),
      sources: all(`SELECT COALESCE(source, 'sin dato') name, COUNT(DISTINCT session_id) sessions FROM site_events WHERE ${W} AND type = 'view' GROUP BY source ORDER BY sessions DESC LIMIT 12`),
      devices: all(`SELECT COALESCE(device, 'sin dato') name, COUNT(DISTINCT session_id) sessions FROM site_events WHERE ${W} AND type = 'view' GROUP BY device ORDER BY sessions DESC`),
      daily: Array.from({ length: days }, (_, i) => { const day = ctx.today(-(days - 1 - i)); return { day, sessions: byDay.get(day) ?? 0 }; }),
    };
  });
}
