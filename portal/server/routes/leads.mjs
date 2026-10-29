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

import {
  LEAD_STATUS, LEAD_CONTACT_VIA, LEAD_LIMITS, CTA_KINDS, ANALYTICS_PERIODS, LEAD_CHANNELS, isSitePath, pageVerdict, buildInsights,
} from '../../shared/leads.js';
import { fail, invalid, has, text, oneOf, id, dateOnly } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { sameName } from './common.mjs';

const CTA_SQL = CTA_KINDS.map((k) => `'${k}'`).join(', ');

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
  // Inicio del día (Costa Rica) como instante ISO, para cruzar `site_events.day` con `leads.created_at`.
  const dayStartIso = (day) => new Date(`${day}T00:00:00-06:00`).toISOString();
  const safeDiv = (a, b) => (b ? a / b : 0);
  /** Cambio porcentual redondeado; null cuando no hay base con qué comparar. */
  const deltaPct = (current, previous) => (previous ? Math.round(((current - previous) / previous) * 100) : null);

  /** Cifras de un periodo [lo, hi) de días; sin `hi`, hasta hoy. Los CTA solo cuentan en visitas con vista. */
  function periodTotals(lo, hi = null) {
    const where = hi ? 'day >= ? AND day < ?' : 'day >= ?';
    const args = hi ? [lo, hi] : [lo];
    const r = db.prepare(`SELECT COUNT(DISTINCT CASE WHEN type = 'view' THEN session_id END) sessions,
        COUNT(DISTINCT CASE WHEN type = 'view' THEN visitor END) visitors,
        SUM(type = 'view') views,
        COALESCE(SUM(CASE WHEN type = 'section' THEN value END), 0) engaged_ms,
        SUM(type = 'click' AND target IN (${CTA_SQL})) cta_clicks
      FROM site_events WHERE ${where}`).get(...args);
    const cta = db.prepare(`SELECT COUNT(DISTINCT session_id) n FROM site_events WHERE ${where} AND type = 'click' AND target IN (${CTA_SQL})
      AND session_id IN (SELECT session_id FROM site_events WHERE ${where} AND type = 'view')`).get(...args, ...args).n;
    const leads = db.prepare(`SELECT COUNT(*) n FROM leads WHERE created_at >= ?${hi ? ' AND created_at < ?' : ''}`)
      .get(...(hi ? [dayStartIso(lo), dayStartIso(hi)] : [dayStartIso(lo)])).n;
    const sessions = r.sessions || 0;
    const ctaSessions = Math.min(cta || 0, sessions);
    return {
      sessions, visitors: r.visitors || 0, views: r.views || 0, engaged_ms: r.engaged_ms || 0,
      avg_engaged_ms: sessions ? Math.round((r.engaged_ms || 0) / sessions) : 0,
      cta_clicks: r.cta_clicks || 0, cta_sessions: ctaSessions, cta_rate: safeDiv(ctaSessions, sessions), leads,
    };
  }

  /** Mediana en minutos entre dos instantes ISO de cada fila; null sin filas. */
  function medianMinutes(rows, fromKey, toKey) {
    const values = rows.map((r) => (new Date(r[toKey]).getTime() - new Date(r[fromKey]).getTime()) / 60_000).filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
    if (!values.length) return null;
    const mid = Math.floor(values.length / 2);
    return Math.round(values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2);
  }

  /** Embudo de las consultas del periodo más lo que sigue sin atender (sin importar el periodo). */
  function leadsPipeline(from) {
    const since = dayStartIso(from);
    const byStatus = Object.fromEntries(Object.keys(LEAD_STATUS).map((k) => [k, 0]));
    for (const r of db.prepare('SELECT status, COUNT(*) n FROM leads WHERE created_at >= ? GROUP BY status').all(since)) byStatus[r.status] = r.n;
    const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
    const won = byStatus.ganado;
    const lost = byStatus.perdido;
    const contacted = db.prepare('SELECT created_at, contacted_at FROM leads WHERE created_at >= ? AND contacted_at IS NOT NULL').all(since);
    const dayAgo = new Date(ctx.now() - 86_400_000).toISOString();
    return {
      total, by_status: byStatus, won, lost, spam: byStatus.spam,
      win_rate: won + lost ? won / (won + lost) : null,
      contact_rate: total ? contacted.length / total : 0,
      median_first_contact_minutes: medianMinutes(contacted, 'created_at', 'contacted_at'),
      unattended_over_24h: db.prepare("SELECT COUNT(*) n FROM leads WHERE status = 'nuevo' AND created_at < ?").get(dayAgo).n,
      by_need: db.prepare('SELECT need, COUNT(*) n FROM leads WHERE created_at >= ? AND need IS NOT NULL GROUP BY need ORDER BY n DESC LIMIT 12').all(since).map((r) => ({ need: r.need, count: r.n })),
      by_page: db.prepare('SELECT COALESCE(page, \'/\') page, COUNT(*) n FROM leads WHERE created_at >= ? GROUP BY page ORDER BY n DESC LIMIT 12').all(since).map((r) => ({ page: r.page, count: r.n })),
      by_source: db.prepare("SELECT COALESCE(source, 'directo') source, COUNT(*) n, SUM(status = 'ganado') won FROM leads WHERE created_at >= ? GROUP BY source ORDER BY n DESC LIMIT 12").all(since)
        .map((r) => ({ source: r.source, count: r.n, won: r.won || 0 })),
    };
  }

  route('GET', '/api/analytics', 'user', ({ query }) => {
    const requested = Number(query.get('days'));
    const days = ANALYTICS_PERIODS.includes(requested) ? requested : 30;
    const from = ctx.today(-(days - 1));
    const previousFrom = ctx.today(-(2 * days - 1));
    const one = (sql, ...args) => db.prepare(sql).get(from, ...args);
    const all = (sql, ...args) => db.prepare(sql).all(from, ...args);
    const W = 'day >= ?';
    // Solo cuentan las sesiones con una vista en el periodo: ningún paso del embudo supera a las visitas.
    const IN_PERIOD = `session_id IN (SELECT session_id FROM site_events WHERE day >= '${from}' AND type = 'view')`;

    const current = periodTotals(from);
    const previous = periodTotals(previousFrom, from);
    const sessions = current.sessions;

    const byDay = new Map(all(`SELECT day, COUNT(DISTINCT CASE WHEN type = 'view' THEN session_id END) sessions, SUM(type = 'view') views,
        COUNT(DISTINCT CASE WHEN type = 'click' AND target IN (${CTA_SQL}) THEN session_id END) cta_sessions, SUM(type = 'lead') leads
      FROM site_events WHERE ${W} GROUP BY day`).map((r) => [r.day, r]));
    const daily = Array.from({ length: days }, (_, i) => {
      const day = ctx.today(-(days - 1 - i));
      const r = byDay.get(day);
      return { day, sessions: r?.sessions ?? 0, views: r?.views ?? 0, cta_sessions: Math.min(r?.cta_sessions ?? 0, r?.sessions ?? 0), leads: r?.leads ?? 0 };
    });

    const sections = all(`SELECT section, SUM(value) ms, COUNT(DISTINCT session_id) sessions FROM site_events
      WHERE ${W} AND type = 'section' AND section IS NOT NULL AND ${IN_PERIOD} GROUP BY section ORDER BY sessions DESC LIMIT 30`)
      .map((r) => ({ section: r.section, sessions: r.sessions, total_ms: r.ms, avg_ms: Math.round(r.ms / Math.max(1, r.sessions)), reach: safeDiv(r.sessions, sessions) }));

    const clicks = all(`SELECT target, label, section, COUNT(*) clicks, COUNT(DISTINCT session_id) sessions FROM site_events
      WHERE ${W} AND type = 'click' GROUP BY target, label, section ORDER BY clicks DESC LIMIT 30`);

    const reached = (sql, ...args) => one(`SELECT COUNT(DISTINCT session_id) n FROM site_events WHERE ${W} AND ${IN_PERIOD} AND ${sql}`, ...args).n;
    const funnel = [
      { key: 'visit', label: 'Entraron al sitio', sessions },
      { key: 'pricing', label: 'Vieron los precios', sessions: reached("type = 'section' AND section IN ('paquetes', 'oferta')") },
      { key: 'scroll', label: 'Bajaron a la mitad de la página', sessions: reached("type = 'scroll' AND value >= 50") },
      { key: 'cta', label: 'Tocaron WhatsApp, un paquete o contacto', sessions: reached(`type = 'click' AND target IN (${CTA_SQL})`) },
      { key: 'form_start', label: 'Empezaron un formulario', sessions: reached("type = 'form_start'") },
      { key: 'form_submit', label: 'Enviaron un formulario', sessions: reached("type = 'form_submit'") },
      { key: 'lead', label: 'Dejaron sus datos (consulta en el portal)', sessions: reached("type = 'lead'") },
    ];

    const scroll = [25, 50, 75, 100].map((pct) => ({ pct, sessions: reached("type = 'scroll' AND value >= ?", pct) }));

    // Cada sesión cuenta una sola vez, con la fuente, campaña, dispositivo o idioma de su primer evento del periodo.
    const groupBy = (column) => all(`WITH first AS (
        SELECT e.session_id, e.${column} attr FROM site_events e
        JOIN (SELECT session_id, MIN(id) id FROM site_events WHERE day >= ? GROUP BY session_id) f ON f.id = e.id)
      SELECT COALESCE(first.attr, 'sin dato') name, COUNT(DISTINCT CASE WHEN s.type = 'view' THEN s.session_id END) sessions,
        COUNT(DISTINCT CASE WHEN s.type = 'click' AND s.target IN (${CTA_SQL}) THEN s.session_id END) cta_sessions, SUM(s.type = 'lead') leads
      FROM site_events s JOIN first ON first.session_id = s.session_id WHERE s.day >= ?
      GROUP BY first.attr HAVING sessions > 0 OR leads > 0 ORDER BY sessions DESC LIMIT 12`, from)
      .map((r) => ({ ...r, cta_sessions: Math.min(r.cta_sessions, r.sessions), cta_rate: safeDiv(Math.min(r.cta_sessions, r.sessions), r.sessions) }));

    // Páginas: vistas, visitas, tiempo leyendo, scroll a la mitad, CTA y consultas, con un veredicto.
    const perPath = (sql) => new Map(all(sql).map((r) => [r.path, r]));
    const pageViews = all(`SELECT path, SUM(type = 'view') views, COUNT(DISTINCT session_id) sessions FROM site_events
      WHERE ${W} AND type = 'view' AND path IS NOT NULL GROUP BY path ORDER BY views DESC LIMIT 20`);
    const pageMs = perPath(`SELECT path, SUM(value) ms FROM site_events WHERE ${W} AND type = 'section' AND path IS NOT NULL GROUP BY path`);
    const pageScroll = perPath(`SELECT path, COUNT(DISTINCT session_id) n FROM site_events WHERE ${W} AND type = 'scroll' AND value >= 50 AND path IS NOT NULL GROUP BY path`);
    const pageCta = perPath(`SELECT path, COUNT(DISTINCT session_id) n FROM site_events WHERE ${W} AND type = 'click' AND target IN (${CTA_SQL}) AND path IS NOT NULL GROUP BY path`);
    const pageLeads = perPath(`SELECT path, COUNT(*) n FROM site_events WHERE ${W} AND type = 'lead' AND path IS NOT NULL GROUP BY path`);
    const pages = pageViews.map((p) => {
      const cta = Math.min(pageCta.get(p.path)?.n ?? 0, p.sessions);
      const row = {
        path: p.path, views: p.views, sessions: p.sessions,
        avg_engaged_ms: Math.round(safeDiv(pageMs.get(p.path)?.ms ?? 0, p.sessions)),
        scroll50_rate: safeDiv(Math.min(pageScroll.get(p.path)?.n ?? 0, p.sessions), p.sessions),
        cta_sessions: cta, cta_rate: safeDiv(cta, p.sessions), leads: pageLeads.get(p.path)?.n ?? 0,
      };
      return { ...row, verdict: pageVerdict(row, sessions) };
    });

    const forms = all(`SELECT target form, SUM(type = 'form_start') starts, SUM(type = 'form_submit') submits FROM site_events
      WHERE ${W} AND type IN ('form_start','form_submit') GROUP BY target ORDER BY starts DESC`);

    // ¿Cuándo entran? Día de la semana (0 = domingo) y hora de Costa Rica (UTC−6) de cada visita.
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of all(`SELECT CAST(strftime('%w', at, '-6 hours') AS INTEGER) wd, CAST(strftime('%H', at, '-6 hours') AS INTEGER) hr, COUNT(DISTINCT session_id) n
      FROM site_events WHERE ${W} AND type = 'view' GROUP BY wd, hr`)) {
      if (r.wd != null && r.hr != null) matrix[r.wd][r.hr] += r.n;
    }
    const byHour = Array.from({ length: 24 }, (_, h) => matrix.reduce((s, row) => s + row[h], 0));
    const byWeekday = matrix.map((row) => row.reduce((s, n) => s + n, 0));
    let peak = { weekday: null, hour: null, sessions: 0 };
    matrix.forEach((row, wd) => row.forEach((n, hr) => { if (n > peak.sessions) peak = { weekday: wd, hour: hr, sessions: n }; }));
    const hours = { matrix, by_hour: byHour, by_weekday: byWeekday, total: byHour.reduce((s, n) => s + n, 0), peak };

    // ¿Qué CTA convierte? Clics a CTA por sección y cuántas de esas visitas terminaron dejando sus datos.
    const ctaBySection = all(`WITH cta AS (SELECT section, session_id FROM site_events WHERE ${W} AND type = 'click' AND target IN (${CTA_SQL}) AND ${IN_PERIOD}),
        converted AS (SELECT DISTINCT session_id FROM site_events WHERE day >= ? AND type = 'lead')
      SELECT cta.section, COUNT(*) clicks, COUNT(DISTINCT cta.session_id) sessions,
        COUNT(DISTINCT CASE WHEN cta.session_id IN (SELECT session_id FROM converted) THEN cta.session_id END) lead_sessions
      FROM cta GROUP BY cta.section ORDER BY sessions DESC, clicks DESC LIMIT 20`, from)
      .map((r) => ({ ...r, lead_rate: safeDiv(r.lead_sessions, r.sessions) }));

    const leadsFrom = dayStartIso(from);
    const leadStatus = db.prepare('SELECT status, COUNT(*) n FROM leads WHERE created_at >= ? GROUP BY status').all(leadsFrom);
    const leadChannels = db.prepare('SELECT channel, COUNT(*) n FROM leads WHERE created_at >= ? GROUP BY channel').all(leadsFrom)
      .map((r) => ({ ...r, label: LEAD_CHANNELS[r.channel] ?? r.channel }));
    const pipeline = leadsPipeline(from);

    const totals = {
      sessions, visitors: current.visitors, views: current.views, engaged_ms: current.engaged_ms, avg_engaged_ms: current.avg_engaged_ms,
      cta_clicks: current.cta_clicks, cta_sessions: current.cta_sessions, cta_rate: current.cta_rate, leads: current.leads,
    };
    const delta = {
      sessions: deltaPct(totals.sessions, previous.sessions),
      visitors: deltaPct(totals.visitors, previous.visitors),
      views: deltaPct(totals.views, previous.views),
      avg_engaged_ms: deltaPct(totals.avg_engaged_ms, previous.avg_engaged_ms),
      cta_sessions: deltaPct(totals.cta_sessions, previous.cta_sessions),
      // La tasa de CTA se compara en puntos porcentuales (solo si el periodo anterior tuvo visitas).
      cta_rate_points: previous.sessions ? Math.round((totals.cta_rate - previous.cta_rate) * 100) : null,
      leads: deltaPct(totals.leads, previous.leads),
    };
    const devices = groupBy('device');
    const sources = groupBy('source');

    return {
      days, from, to: ctx.today(), previous_from: previousFrom,
      totals, previous, delta,
      daily, sections, clicks, funnel, scroll,
      sources, devices, languages: groupBy('language'), campaigns: groupBy('campaign').filter((r) => r.name !== 'sin dato'),
      pages, forms, hours, cta_by_section: ctaBySection,
      leads: { by_status: leadStatus, by_channel: leadChannels },
      leads_pipeline: pipeline,
      insights: buildInsights({ days, totals, previous, pages, devices, sources, sections, forms, hours, leads_pipeline: pipeline }),
    };
  });

  // Detalle de una página: qué se lee, hasta dónde se baja y qué se toca en esa ruta.
  route('GET', '/api/analytics/page', 'user', ({ query }) => {
    const path = query.get('path');
    if (!isSitePath(path)) invalid('path', 'Ruta inválida.');
    const requested = Number(query.get('days'));
    const days = ANALYTICS_PERIODS.includes(requested) ? requested : 30;
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
