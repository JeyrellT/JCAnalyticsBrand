// ============================================================================
//  server/ingest.mjs
//  Entrada pública del sitio jcanalytic.com hacia el portal (solo Node):
//    POST /ingest/events  lote de eventos de navegación (analítica propia)
//    POST /ingest/lead    consulta de un visitante (formulario o "que me contacten")
//
//  Seguridad:
//    · Solo responde a los orígenes del sitio (PORTAL_SITE_ORIGINS); el resto recibe 403.
//    · Peticiones "simples" (text/plain): no hay preflight y nunca viajan cookies del
//      portal (son SameSite=Strict), así que estas rutas no tocan ninguna sesión.
//    · Cuerpo de 16 KB como máximo, campos con lista blanca y largos recortados.
//    · Límites por IP (ventana de 10 min y por día), tope diario de consultas y de eventos,
//      y un mapa de límites acotado (barrido por minuto y tope de claves).
//    · Trampa para bots (campo oculto) y tiempo mínimo de llenado: se responde "ok" sin guardar.
//    · Ninguna IP ni navegador se guarda: solo un identificador diario no reversible.
//    · El texto del visitante es dato no confiable (shared/leads.js): se limpia, se marca
//      si parece spam o instrucciones para una IA y jamás se envía a un modelo ni a MCP.
// ============================================================================

import { createHash, randomBytes } from 'node:crypto';
import {
  SITE_EVENT_TYPES, CLICK_KINDS, DEVICES, LEAD_CHANNELS, LEAD_NEEDS, LEAD_LIMITS, ANALYTICS_RETENTION_DAYS, SITE_PATH_RE,
  cleanVisitorText, cleanPhone, cleanEmail, leadFlags, trafficSource,
} from '../shared/leads.js';

const MAX_BODY = 16 * 1024;
const MAX_EVENTS = 40;
const WINDOW_MS = 10 * 60_000;
const EVENT_BATCHES_PER_WINDOW = 120;
const LEADS_PER_WINDOW = 5;
const LEADS_PER_IP_DAY = 12;
const DEFAULT_DAILY_LEADS = 300;
const DEFAULT_DAILY_EVENTS = 200_000;
const MAX_BUCKETS = 50_000;
const SWEEP_MS = 60_000;
const MIN_FILL_MS = 1500;
const DUPLICATE_MS = 10 * 60_000;
const SESSION_RE = /^[a-z0-9]{16,40}$/i;
const SLUG_RE = /^[a-z0-9-]{1,40}$/;
const PATH_RE = SITE_PATH_RE; // misma regla que /api/analytics/page

export const DEFAULT_SITE_ORIGINS = 'https://www.jcanalytic.com,https://jcanalytic.com';

function reply(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) return { tooLarge: true };
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return body && typeof body === 'object' && !Array.isArray(body) ? { body } : { invalid: true };
  } catch {
    return { invalid: true };
  }
}

const cleanPath = (value) => {
  const v = cleanVisitorText(value, 160)?.split(/[?#]/)[0] ?? null;
  return v && PATH_RE.test(v) ? v : null;
};
const slug = (value) => (typeof value === 'string' && SLUG_RE.test(value) ? value : null);
const refHost = (value) => {
  const v = cleanVisitorText(value, 300);
  if (!v) return null;
  try { return new URL(v).hostname.toLowerCase().slice(0, 80) || null; } catch { return null; }
};

/** Contexto común de un lote o una consulta: sesión, idioma, dispositivo y de dónde vino. */
function readVisit(body) {
  const sid = typeof body.sid === 'string' && SESSION_RE.test(body.sid) ? body.sid.toLowerCase() : null;
  const src = body.src && typeof body.src === 'object' ? body.src : {};
  const referrer = refHost(src.ref);
  return {
    sid,
    language: body.lang === 'en' ? 'en' : 'es',
    device: Object.hasOwn(DEVICES, body.device) ? body.device : null,
    source: trafficSource({ source: cleanVisitorText(src.source, 60), referrer }),
    medium: cleanVisitorText(src.medium, 40),
    campaign: cleanVisitorText(src.campaign, 80),
    referrer,
  };
}

function readEvent(raw) {
  if (!raw || typeof raw !== 'object' || !SITE_EVENT_TYPES.includes(raw.t)) return null;
  const e = { type: raw.t, path: cleanPath(raw.p), section: slug(raw.s), target: null, label: null, value: null };
  if (e.type === 'section') {
    const ms = Math.round(Number(raw.v));
    if (!e.section || !Number.isFinite(ms) || ms < 300) return null;
    e.value = Math.min(ms, 30 * 60_000);
  } else if (e.type === 'scroll') {
    const pct = Number(raw.v);
    if (![25, 50, 75, 100].includes(pct)) return null;
    e.value = pct;
  } else if (e.type === 'click') {
    e.target = Object.hasOwn(CLICK_KINDS, raw.k) ? raw.k : 'button';
    e.label = cleanVisitorText(raw.l, 80);
  } else if (e.type === 'form_start' || e.type === 'form_submit') {
    e.target = slug(raw.k);
    if (!e.target) return null;
  }
  return e;
}

/**
 * @param {object} o
 * @param {object} o.ctx      contexto del portal (db, notify, log, today…)
 * @param {object} o.env
 * @param {(req) => string} o.clientIp
 */
export function createIngestHandler({ ctx, env, clientIp, logger = console }) {
  const { db } = ctx;
  const origins = new Set((env.PORTAL_SITE_ORIGINS || DEFAULT_SITE_ORIGINS).split(',').map((o) => o.trim()).filter(Boolean));
  const dailyLeads = Number(env.PORTAL_MAX_DAILY_LEADS) > 0 ? Number(env.PORTAL_MAX_DAILY_LEADS) : DEFAULT_DAILY_LEADS;
  const dailyEvents = Number(env.PORTAL_MAX_DAILY_EVENTS) > 0 ? Number(env.PORTAL_MAX_DAILY_EVENTS) : DEFAULT_DAILY_EVENTS;
  const buckets = new Map();
  let salt = { day: null, value: null };
  let lastPurge = 0;
  let lastSweep = 0;
  let eventsToday = { day: null, count: 0 };

  const hash = (text) => {
    const day = ctx.today();
    if (salt.day !== day) salt = { day, value: randomBytes(16).toString('hex') };
    return createHash('sha256').update(`${salt.value}|${text}`).digest('hex').slice(0, 20);
  };
  /** Identificador del visitante del día (IP + navegador) para contar personas: no se puede revertir ni cruzar entre días. */
  const visitorKey = (req) => hash(`${clientIp(req)}|${String(req.headers['user-agent'] ?? '').slice(0, 200)}`);
  /**
   * Clave de los límites: solo la IP. El último salto de X-Forwarded-For lo agrega el proxy y no se puede
   * falsificar; el navegador sí, así que cambiar el User-Agent no da un cupo nuevo.
   */
  const limitKey = (req) => hash(`ip|${clientIp(req)}`);

  /** Ventana fija por clave. Barrido a lo sumo una vez por minuto y tope duro de claves (sin crecer sin límite). */
  function allow(key, kind, max, windowMs = WINDOW_MS) {
    const t = ctx.now();
    if (t - lastSweep > SWEEP_MS) {
      lastSweep = t;
      for (const [k, b] of buckets) if (t - b.start >= b.window) buckets.delete(k);
    }
    const id = `${kind}:${key}`;
    const bucket = buckets.get(id);
    if (!bucket || t - bucket.start >= bucket.window) {
      if (!bucket && buckets.size >= MAX_BUCKETS) return false;
      buckets.set(id, { start: t, count: 1, window: windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= max;
  }

  function purgeOldEvents() {
    const t = ctx.now();
    if (t - lastPurge < 3_600_000) return;
    lastPurge = t;
    db.prepare('DELETE FROM site_events WHERE day < ?').run(ctx.today(-ANALYTICS_RETENTION_DAYS));
  }

  const insertEvent = db.prepare(`INSERT INTO site_events (day, at, session_id, visitor, type, path, section, target, label, value, source, campaign, device, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  function storeEvents(body, visitor) {
    const visit = readVisit(body);
    if (!visit.sid || !Array.isArray(body.events) || !body.events.length) return { status: 400, error: 'invalid_batch' };
    const events = body.events.slice(0, MAX_EVENTS).map(readEvent).filter(Boolean);
    const day = ctx.today();
    // Tope global del día: un ataque desde muchas IP no llena la base.
    if (eventsToday.day !== day) eventsToday = { day, count: 0 };
    if (eventsToday.count + events.length > dailyEvents) return { status: 429, error: 'daily_limit' };
    eventsToday.count += events.length;
    const at = ctx.nowIso();
    db.exec('BEGIN');
    try {
      for (const e of events) {
        insertEvent.run(day, at, visit.sid, visitor, e.type, e.path, e.section, e.target, e.label, e.value, visit.source, visit.campaign, visit.device, visit.language);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    purgeOldEvents();
    return { status: 200, accepted: events.length };
  }

  function storeLead(body, visitor, ipKey) {
    // Trampas para bots: se responde como si todo saliera bien, sin guardar nada.
    if (typeof body.website === 'string' && body.website.trim()) return { status: 200, dropped: true };
    if (!(Number(body.elapsed) >= MIN_FILL_MS)) return { status: 200, dropped: true };

    const visit = readVisit(body);
    const lead = {
      channel: Object.hasOwn(LEAD_CHANNELS, body.channel) ? body.channel : 'formulario',
      name: cleanVisitorText(body.name, LEAD_LIMITS.name),
      phone: cleanPhone(body.phone),
      email: cleanEmail(body.email),
      need: LEAD_NEEDS.includes(body.need) ? body.need : null,
      message: cleanVisitorText(body.message, LEAD_LIMITS.message, { multiline: true }),
      package: cleanVisitorText(body.package, LEAD_LIMITS.package),
      page: cleanPath(body.page),
    };
    if (!lead.phone && !lead.email) return { status: 400, error: 'contact_required' };
    const flags = leadFlags(lead);
    const at = ctx.nowIso();

    // La misma persona (misma pestaña y mismo contacto) que reenvía en pocos minutos completa su consulta en vez de
    // duplicarla. Nunca se pisa lo que ya escribió: el texto nuevo va como nota y las marcas de revisión se suman.
    const since = new Date(ctx.now() - DUPLICATE_MS).toISOString();
    const previous = visit.sid ? db.prepare(`SELECT id, flags, message FROM leads WHERE created_at >= ? AND session_id = ?
      AND ((phone IS NOT NULL AND phone = ?) OR (email IS NOT NULL AND email = ?)) ORDER BY id DESC LIMIT 1`).get(since, visit.sid, lead.phone, lead.email) : null;
    if (previous) {
      const merged = [...new Set([...(previous.flags ? previous.flags.split(',') : []), ...flags])];
      db.prepare(`UPDATE leads SET need = COALESCE(need, ?), package = COALESCE(package, ?), phone = COALESCE(phone, ?), email = COALESCE(email, ?),
        flags = ?, updated_at = ?, revision = revision + 1 WHERE id = ?`)
        .run(lead.need, lead.package, lead.phone, lead.email, merged.length ? merged.join(',') : null, at, previous.id);
      const extra = lead.message && lead.message !== previous.message ? `\n\nEscribió además: ${lead.message}` : '';
      db.prepare("INSERT INTO lead_notes (lead_id, user_id, kind, body, created_at) VALUES (?, NULL, 'sistema', ?, ?)")
        .run(previous.id, `La persona volvió a enviar el formulario.${extra}`, at);
      return { status: 200, updated: true };
    }

    const today = ctx.today();
    const dayStart = new Date(`${today}T00:00:00-06:00`).toISOString();
    if (!allow(ipKey, 'lead-day', LEADS_PER_IP_DAY, 24 * 3_600_000)) return { status: 429, error: 'too_many_requests' };
    const countToday = db.prepare('SELECT COUNT(*) n FROM leads WHERE created_at >= ?').get(dayStart).n;
    if (countToday >= dailyLeads) return { status: 429, error: 'daily_limit' };

    const leadId = Number(db.prepare(`INSERT INTO leads (status, channel, name, phone, email, need, message, package, language, page, source, medium, campaign,
      referrer_host, device, session_id, flags, created_at, updated_at) VALUES ('nuevo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      lead.channel, lead.name, lead.phone, lead.email, lead.need, lead.message, lead.package, visit.language, lead.page, visit.source, visit.medium,
      visit.campaign, visit.referrer, visit.device, visit.sid, flags.length ? flags.join(',') : null, at, at,
    ).lastInsertRowid);
    if (visit.sid) insertEvent.run(today, at, visit.sid, visitor, 'lead', lead.page, null, lead.channel, null, null, visit.source, visit.campaign, visit.device, visit.language);

    // El aviso no lleva el mensaje del visitante: solo quién y qué necesita (texto ya limpio y corto).
    const who = lead.name ?? (lead.phone ? 'Alguien con WhatsApp' : 'Alguien con correo');
    const what = lead.package ?? lead.need ?? LEAD_CHANNELS[lead.channel];
    ctx.notify(ctx.activeUserIds(), null, {
      kind: 'lead', title: `Nueva consulta de la web: ${who.slice(0, 60)}`, body: `${what} · llegó desde ${visit.source}${flags.length ? ' · revisar antes de responder' : ''}`, link: `/consultas/${leadId}`,
    });
    ctx.log(null, 'lead', leadId, 'created', `Llegó una consulta desde la web (${LEAD_CHANNELS[lead.channel]})`);
    return { status: 200, created: true };
  }

  return async function handleIngest(req, res, pathname) {
    const origin = req.headers.origin;
    if (!origin || !origins.has(origin)) return reply(res, 403, { error: 'origin_not_allowed' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    // El sitio lee la respuesta de la consulta: este recurso sí se comparte con su origen.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method !== 'POST') return reply(res, 405, { error: 'method_not_allowed' });
    if (pathname !== '/ingest/events' && pathname !== '/ingest/lead') return reply(res, 404, { error: 'not_found' });
    const type = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    if (type !== 'text/plain' && type !== 'application/json') return reply(res, 415, { error: 'unsupported_type' });

    const visitor = visitorKey(req);
    const ipKey = limitKey(req);
    const isLead = pathname === '/ingest/lead';
    if (!allow(ipKey, isLead ? 'lead' : 'events', isLead ? LEADS_PER_WINDOW : EVENT_BATCHES_PER_WINDOW)) return reply(res, 429, { error: 'too_many_requests' });
    const parsed = await readBody(req);
    if (parsed.tooLarge) return reply(res, 413, { error: 'body_too_large' });
    if (parsed.invalid) return reply(res, 400, { error: 'invalid_json' });
    try {
      const out = isLead ? storeLead(parsed.body, visitor, ipKey) : storeEvents(parsed.body, visitor);
      return reply(res, out.status, out.error ? { error: out.error } : { ok: true, ...(out.accepted != null ? { accepted: out.accepted } : {}) });
    } catch (error) {
      logger.error(`[portal] ingest ${pathname} failed: ${error?.stack ?? error}`);
      return reply(res, 500, { error: 'server_error' });
    }
  };
}
