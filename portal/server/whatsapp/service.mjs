// ============================================================================
//  server/whatsapp/service.mjs
//  Orquestador de WhatsApp (compatible con el navegador: la demo lo carga sin
//  transporte). El envío real lo hace ctx.whatsapp (server/whatsapp/meta.mjs);
//  sin transporte, nada se encola ni se envía y el panel lo explica.
//
//  Piezas (docs/whatsapp.md):
//    · Avisos a clientes (outbox): cada aviso del portal a una cuenta con WhatsApp
//      vinculado y permiso vigente entra UNA vez (dedupe_key UNIQUE), respeta el
//      horario 07:00–20:00 de Costa Rica (salvo urgentes), se reclama con un
//      update condicional, se re-chequea el permiso justo antes de enviar y se
//      reintenta 3 veces si el error es transitorio. Dentro de la ventana de 24 h
//      va como texto; fuera de ella, como plantilla aprobada.
//    · Entrada: guarda primero (dedupe por id de Meta), espera a que la persona
//      termine de escribir (lote), atiende una conversación a la vez (cola por
//      contacto) y contesta con el motor de reglas (bot.mjs) usando datos reales
//      del portal de esa cuenta.
//    · Humano en el bucle: si alguien del equipo contesta o toma el control, el
//      asistente se calla (también a mitad de un turno).
//    · Vínculo opt-in: el cliente genera un código en su portal y lo envía por
//      WhatsApp ("ACTIVAR K7Q4M2"); así se prueba que el número es suyo.
// ============================================================================

import { CLIENT_VISIBLE_APPOINTMENT_KINDS } from '../../shared/client-portal.js';
import {
  WA_TEMPLATES, WA_TEMPLATE_BY_KIND, WA_SKIPPED_KINDS, WA_SEND_WINDOW, WA_SESSION_HOURS, WA_TEAM_PAUSE_MINUTES, WA_LINK_CODE_MINUTES,
  formatWaPhone,
} from '../../shared/whatsapp.js';
import { hashToken, createLoginLimiter } from '../auth.mjs';
import { createPortalHelpers } from '../routes/portal-common.mjs';
import {
  respond, readState, parseLinkCode, newLinkCode, optIntent, linkReply, optReply, groupBubbles, typingDelay, formatWhen,
} from './bot.mjs';
import { mediaLabel } from './webhook.mjs';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MAX_ATTEMPTS = 3;
const RETRY_MS = 5 * MINUTE;
const STALE_SENDING_MS = 10 * MINUTE;
const DISPATCH_LIMIT = 40;
const MAX_QUEUES = 300;
/** Espera de silencio antes de contestar (la gente escribe en varios mensajes) y tope desde el primero. */
export const BATCH = { silenceMs: 6_000, mediaSilenceMs: 12_000, capMs: 20_000 };

const hhmm = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const crMinutes = (ms) => { const d = new Date(ms - 6 * HOUR); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';
const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
/** Datos personales que no se guardan tal cual: cédulas y números largos escritos en el chat. */
export const redact = (s) => String(s ?? '').replace(/\d(?:[ .-]?\d){7,11}/g, '[número oculto]');

/**
 * @param {object} ctx  contexto del portal (ctx.whatsapp = transporte o null)
 * @param {object} [o]
 * @param {object} [o.batch]  tiempos del lote (las pruebas usan 0)
 * @param {number} [o.pace]   multiplicador del "escribiendo…" (1 = ritmo humano; 0 = inmediato)
 */
export function createWhatsAppService(ctx, { batch = BATCH, pace = 1, logger = console } = {}) {
  const { db } = ctx;
  const portal = createPortalHelpers(ctx);
  const transport = () => ctx.whatsapp ?? null;
  const linkLimiter = createLoginLimiter({ max: 5, windowMs: 24 * HOUR, now: ctx.now });
  // Tope global: rotar números no multiplica los intentos contra los códigos vigentes.
  const linkLimiterAll = createLoginLimiter({ max: 30, windowMs: HOUR, now: ctx.now });

  // ── Cola de salida ────────────────────────────────────────────────────────

  /** Hora de envío: ya si es urgente o se está en el horario; si no, la siguiente mañana permitida. */
  function scheduleFor(urgent, ms = ctx.now()) {
    const m = crMinutes(ms);
    const start = hhmm(WA_SEND_WINDOW.start);
    const end = hhmm(WA_SEND_WINDOW.end);
    if (urgent || (m >= start && m < end)) return new Date(ms).toISOString();
    const wait = m < start ? start - m : 24 * 60 - m + start;
    return new Date(ms + wait * MINUTE - (ms % MINUTE)).toISOString();
  }

  const insertOutbox = db.prepare(`INSERT OR IGNORE INTO wa_outbox (dedupe_key, kind, account_id, template, variables, text_body, ref_id, urgent,
    status, scheduled_for, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?)`);

  /** Cuenta que puede recibir avisos ahora (activa, con número vinculado y permiso). */
  const reachable = (accountId) => db.prepare(`SELECT a.*, c.name client_name FROM client_accounts a JOIN clients c ON c.id = a.client_id
    WHERE a.id = ? AND a.active = 1 AND a.wa_opt_in = 1 AND a.wa_id IS NOT NULL`).get(accountId);

  /** Encola un aviso; true si entró (la clave repetida no entra dos veces). */
  function enqueue({ key, kind, accountId, variables, textBody, refId = null, urgent = false, createdBy = null }) {
    const t = transport();
    if (!t?.outbound) return false;
    if (!reachable(accountId)) return false;
    const template = WA_TEMPLATE_BY_KIND[kind] ?? 'jc_aviso_portal';
    const at = ctx.nowIso();
    const { changes } = insertOutbox.run(key.slice(0, 200), kind, accountId, template, JSON.stringify(variables.map((v) => String(v).slice(0, 900))),
      textBody.slice(0, 4000), refId, urgent ? 1 : 0, scheduleFor(urgent), createdBy, at, at);
    return changes === 1;
  }

  /** Gancho de notifyClient: cada aviso del portal también sale por WhatsApp a quien lo pidió. */
  function onClientNotifications(entries) {
    for (const n of entries) {
      if (WA_SKIPPED_KINDS.includes(n.kind)) continue;
      const account = reachable(n.accountId);
      if (!account) continue;
      const name = firstName(account.name) || account.name;
      const detail = n.kind === 'aviso' ? (n.body || n.title) : n.title;
      const textBody = n.kind === 'aviso'
        ? `Hola ${name}, te escribimos de JC Analytics: ${detail}`
        : `Hola ${name}, tenés una novedad en tu portal de clientes: ${n.title}.${n.body ? `\n${n.body}` : ''}\nLa ves en tu portal, sección ${linkSection(n.link)}.`;
      enqueue({ key: `notif:${n.notificationId}`, kind: n.kind, accountId: account.id, variables: [name, detail], textBody, refId: n.notificationId, urgent: !!n.urgent, createdBy: n.createdBy ?? null });
    }
  }

  const linkSection = (link) => ({ proyectos: 'Proyectos', entregables: 'Entregables', solicitudes: 'Solicitudes', documentos: 'Documentos', avisos: 'Avisos' })[String(link ?? '').split('/')[2]] ?? 'Inicio';

  /** Recordatorios de reuniones con el cliente (las internas nunca), H horas antes. */
  function enqueueMeetingReminders() {
    const hours = ctx.numberSetting('wa_meeting_reminder_hours', 24);
    if (!transport()?.outbound || !(hours > 0)) return 0;
    const now = ctx.now();
    const rows = db.prepare(`SELECT a.id, a.title, a.starts_at, COALESCE(a.client_id, p.client_id) client_id FROM appointments a
      LEFT JOIN projects p ON p.id = a.project_id
      WHERE a.starts_at > ? AND a.starts_at <= ? AND a.status IN ('programada','confirmada')
        AND a.kind IN ('${CLIENT_VISIBLE_APPOINTMENT_KINDS.join("','")}') AND COALESCE(a.client_id, p.client_id) IS NOT NULL`)
      .all(new Date(now).toISOString(), new Date(now + hours * HOUR).toISOString());
    let queued = 0;
    for (const a of rows) {
      const accounts = db.prepare('SELECT id, name FROM client_accounts WHERE client_id = ? AND active = 1 AND wa_opt_in = 1 AND wa_id IS NOT NULL').all(a.client_id);
      const when = formatWhen(a.starts_at);
      // A menos de 12 h de la reunión el recordatorio sale aunque sea fuera de horario.
      const urgent = Date.parse(a.starts_at) - now < 12 * HOUR;
      for (const acc of accounts) {
        const name = firstName(acc.name) || acc.name;
        if (enqueue({
          key: `reunion:${a.id}:${a.starts_at}:${acc.id}`, kind: 'reunion', accountId: acc.id, refId: a.id, urgent,
          variables: [name, a.title, when],
          textBody: `Hola ${name}, te recordamos la reunión "${a.title}" con JC Analytics el ${when}. Si necesitás moverla, respondé a este mensaje.`,
        })) queued += 1;
      }
    }
    return queued;
  }

  /** ¿Sigue vigente lo que se va a avisar? (una reunión cancelada o movida ya no se recuerda) */
  function stillValid(row) {
    if (row.kind !== 'reunion') return null;
    const a = db.prepare('SELECT status, starts_at FROM appointments WHERE id = ?').get(row.ref_id);
    if (!a || !['programada', 'confirmada'].includes(a.status)) return 'La reunión se canceló.';
    if (!row.dedupe_key.includes(`:${a.starts_at}:`)) return 'La reunión cambió de hora.';
    if (Date.parse(a.starts_at) <= ctx.now()) return 'La reunión ya empezó.';
    return null;
  }

  const sessionOpen = (conv) => !!conv?.last_client_at && ctx.now() - Date.parse(conv.last_client_at) < WA_SESSION_HOURS * HOUR;

  let dispatching = null;
  /** Envía los avisos que tocan (hasta 40 por corrida). Dos corridas a la vez nunca envían lo mismo. */
  function dispatch({ limit = DISPATCH_LIMIT } = {}) {
    dispatching ??= runDispatch(limit).finally(() => { dispatching = null; });
    return dispatching;
  }

  async function runDispatch(limit) {
    const t = transport();
    const result = { sent: 0, skipped: 0, failed: 0, retried: 0 };
    if (!t) return result;
    const at = () => ctx.nowIso();
    db.prepare("UPDATE wa_outbox SET status = 'pendiente', updated_at = ? WHERE status = 'enviando' AND updated_at < ?")
      .run(at(), new Date(ctx.now() - STALE_SENDING_MS).toISOString());
    const due = db.prepare("SELECT * FROM wa_outbox WHERE status = 'pendiente' AND scheduled_for <= ? ORDER BY urgent DESC, scheduled_for, id LIMIT ?").all(at(), limit);
    for (const row of due) {
      // Reclamo atómico: si otra corrida ya lo tomó, changes = 0.
      if (db.prepare("UPDATE wa_outbox SET status = 'enviando', updated_at = ? WHERE id = ? AND status = 'pendiente'").run(at(), row.id).changes !== 1) continue;
      const finish = (status, extra = {}) => db.prepare(`UPDATE wa_outbox SET status = ?, reason = ?, external_id = COALESCE(?, external_id), attempts = ?,
        scheduled_for = COALESCE(?, scheduled_for), sent_at = ?, updated_at = ? WHERE id = ?`)
        .run(status, extra.reason ?? null, extra.externalId ?? null, extra.attempts ?? row.attempts, extra.scheduledFor ?? null, extra.sentAt ?? null, at(), row.id);
      // El permiso se vuelve a comprobar justo antes de enviar.
      const account = reachable(row.account_id);
      const invalid = !account ? 'La cuenta ya no tiene WhatsApp vinculado o pausó los avisos.' : stillValid(row);
      if (invalid) { finish('omitido', { reason: invalid }); result.skipped += 1; continue; }
      const conv = conversationFor(account.wa_id, { accountId: account.id, name: account.name });
      const attempts = row.attempts + 1;
      try {
        const variables = JSON.parse(row.variables);
        const asText = sessionOpen(conv);
        const sent = asText ? await t.sendText(account.wa_id, row.text_body) : await t.sendTemplate(account.wa_id, row.template, variables);
        finish('enviado', { externalId: sent?.id ?? null, attempts, sentAt: at() });
        addMessage(conv.id, 'plantilla', asText ? row.text_body : `[Plantilla ${row.template}] ${row.text_body}`, { externalId: sent?.id ?? null });
        result.sent += 1;
      } catch (error) {
        if (error?.transient && attempts < MAX_ATTEMPTS) {
          finish('pendiente', { reason: error.message, attempts, scheduledFor: new Date(ctx.now() + RETRY_MS).toISOString() });
          result.retried += 1;
        } else {
          finish('fallido', { reason: String(error?.message ?? error).slice(0, 300), attempts });
          result.failed += 1;
        }
      }
    }
    return result;
  }

  /** Una pasada del programador (index.mjs la llama cada minuto). */
  async function tick() {
    if (!transport()) return { queued: 0, sent: 0, skipped: 0, failed: 0, retried: 0 };
    const queued = enqueueMeetingReminders();
    return { queued, ...(await dispatch()) };
  }

  function retry(outboxId) {
    const { changes } = db.prepare(`UPDATE wa_outbox SET status = 'pendiente', attempts = 0, reason = NULL, scheduled_for = ?, updated_at = ?
      WHERE id = ? AND status IN ('fallido','omitido')`).run(ctx.nowIso(), ctx.nowIso(), outboxId);
    return changes === 1;
  }

  // ── Conversaciones ────────────────────────────────────────────────────────

  function conversationFor(waId, { name = null, accountId = null } = {}) {
    const at = ctx.nowIso();
    db.prepare('INSERT OR IGNORE INTO wa_conversations (wa_id, name, last_message_at, created_at) VALUES (?, ?, ?, ?)').run(waId, name, at, at);
    let conv = db.prepare('SELECT * FROM wa_conversations WHERE wa_id = ?').get(waId);
    // La conversación queda ligada a la cuenta que tiene ese número vinculado (o se suelta si ya no lo tiene).
    const linked = accountId ?? db.prepare('SELECT id FROM client_accounts WHERE wa_id = ? AND active = 1').get(waId)?.id ?? null;
    if (linked !== conv.account_id || (name && !conv.name)) {
      db.prepare('UPDATE wa_conversations SET account_id = ?, name = COALESCE(name, ?) WHERE id = ?').run(linked, name, conv.id);
      conv = db.prepare('SELECT * FROM wa_conversations WHERE id = ?').get(conv.id);
    }
    return conv;
  }

  const getConversation = (id) => db.prepare('SELECT * FROM wa_conversations WHERE id = ?').get(id);

  function addMessage(conversationId, origin, body, { externalId = null, media = null, userId = null } = {}) {
    const at = ctx.nowIso();
    const row = db.prepare(`INSERT INTO wa_messages (conversation_id, origin, body, external_id, media_type, media_id, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(conversationId, origin, String(body).slice(0, 4000), externalId, media?.type ?? null, media?.id ?? null, userId, at);
    if (['cliente', 'asistente', 'equipo', 'plantilla'].includes(origin)) {
      db.prepare('UPDATE wa_conversations SET last_message_at = ? WHERE id = ?').run(at, conversationId);
    }
    return Number(row.lastInsertRowid);
  }

  /** Personas del equipo a avisar por una conversación: quien lleva la cuenta del cliente o, si no hay, los admin. */
  function recipientsFor(conv) {
    const acc = conv.account_id ? db.prepare('SELECT c.owner_id FROM client_accounts a JOIN clients c ON c.id = a.client_id WHERE a.id = ?').get(conv.account_id) : null;
    return portal.teamRecipients(acc?.owner_id);
  }

  function alertTeam(conv, { reason, summary, urgent }) {
    const who = conv.account_id ? db.prepare('SELECT a.name, c.name client_name FROM client_accounts a JOIN clients c ON c.id = a.client_id WHERE a.id = ?').get(conv.account_id) : null;
    const label = who ? `${who.name} (${who.client_name})` : conv.name || formatWaPhone(conv.wa_id);
    const titles = { urgente: 'WhatsApp urgente', queja: 'Queja por WhatsApp', adjunto: 'Archivo por WhatsApp', pagos: 'Consulta de pagos por WhatsApp', espera: 'Mensaje por WhatsApp en espera' };
    ctx.notify(recipientsFor(conv), 0, {
      kind: 'whatsapp',
      title: `${titles[reason] ?? 'Piden hablar con el equipo por WhatsApp'}: ${label}`.slice(0, 160),
      body: redact(summary).slice(0, 300) || null,
      link: `/whatsapp/${conv.id}`,
    });
    db.prepare('UPDATE wa_conversations SET pending = 1, urgent = MAX(urgent, ?), reason = ?, attended_at = NULL WHERE id = ?').run(urgent ? 1 : 0, reason, conv.id);
  }

  const teamHolds = (conv) => !!conv.team_control || (!!conv.paused_until && Date.parse(conv.paused_until) > ctx.now());

  /** Datos reales del portal que el asistente puede contar (solo de la empresa de esa cuenta, solo lo que el cliente ve). */
  function factsFor(conv) {
    const acc = conv.account_id ? db.prepare(`SELECT a.*, c.name client_name, c.owner_id, u.name owner_name FROM client_accounts a JOIN clients c ON c.id = a.client_id
      LEFT JOIN users u ON u.id = c.owner_id AND u.active = 1 WHERE a.id = ? AND a.active = 1 AND a.wa_id = ?`).get(conv.account_id, conv.wa_id) : null;
    if (!acc) return { linked: false, name: conv.name };
    const nowIso = ctx.nowIso();
    const projects = portal.clientProjectRows(acc.client_id).filter((p) => !p.archived && p.status !== 'cerrado').map((p) => portal.clientProject(p));
    return {
      linked: true,
      name: acc.name,
      clientName: acc.client_name,
      ownerName: acc.owner_name,
      canApprove: !!acc.can_approve,
      projects: projects.map((p) => ({ name: p.name, status_label: p.status_label, milestones_total: p.milestones_total, milestones_done: p.milestones_done, next_milestone: p.next_milestone?.title ?? null })),
      toApprove: portal.listDeliverables({ clientId: acc.client_id, status: 'en_revision', visibleOnly: true }).map((d) => ({ title: d.title, project_name: d.project_name })),
      meetings: portal.clientMeetings(acc.client_id, { limit: 30 }).filter((m) => m.starts_at >= nowIso && ['programada', 'confirmada'].includes(m.status)).reverse(),
    };
  }

  // ── Entrada ───────────────────────────────────────────────────────────────

  const queues = new Map();
  /** Una tarea a la vez por conversación, en orden. */
  function enqueueTask(key, fn) {
    if (!queues.has(key) && queues.size >= MAX_QUEUES) return Promise.resolve(null);
    const next = (queues.get(key) ?? Promise.resolve()).then(fn, fn).catch((error) => logger.error?.(`[whatsapp] conversación: ${error?.stack ?? error}`));
    queues.set(key, next);
    next.finally(() => { if (queues.get(key) === next) queues.delete(key); });
    return next;
  }

  const batches = new Map();
  /** Espera a que la persona termine de escribir: cada mensaje reinicia el silencio, con tope desde el primero. */
  function waitForSilence(convId, { media, text }) {
    const silence = media ? batch.mediaSilenceMs : batch.silenceMs;
    if (!silence) return Promise.resolve(true);
    const incomplete = /(,|\by|\bque|\bde|\bpero|\.\.\.|…)\s*$/i.test(text) || /^\s*(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches)\s*[.!]*\s*$/i.test(text);
    const wait = incomplete ? Math.max(silence, batch.mediaSilenceMs) : silence;
    const now = ctx.now();
    const current = batches.get(convId);
    // Con demasiadas esperas abiertas (ráfaga tras una reconexión) se contesta sin esperar.
    if (!current && batches.size >= MAX_QUEUES) return Promise.resolve(true);
    if (current) {
      clearTimeout(current.timer);
      current.resolve(false); // el turno anterior queda absorbido por este
    }
    const first = current?.first ?? now;
    const delay = Math.max(0, Math.min(wait, first + batch.capMs - now));
    return new Promise((resolve) => {
      const timer = setTimeout(() => { batches.delete(convId); resolve(true); }, delay);
      timer.unref?.();
      batches.set(convId, { timer, first, resolve });
    });
  }

  /** Mensajes del cliente desde la última respuesta (del asistente, del equipo o un aviso): se atienden como un solo turno. */
  function pendingTurn(conv) {
    const rows = db.prepare(`SELECT * FROM wa_messages WHERE conversation_id = ? AND origin = 'cliente' AND id > COALESCE(
      (SELECT MAX(id) FROM wa_messages WHERE conversation_id = ? AND origin IN ('asistente','equipo','plantilla')), 0) ORDER BY id`).all(conv.id, conv.id);
    const texts = rows.map((r) => (r.media_type ? r.body.replace(/^\[[^\]]*\]\n?/, '') : r.body)).filter(Boolean);
    const lastMedia = [...rows].reverse().find((r) => r.media_type);
    return { text: texts.join('\n').trim(), media: lastMedia ? { type: lastMedia.media_type } : null, count: rows.length };
  }

  /**
   * Atiende el webhook ya verificado. Devuelve una promesa que termina cuando se
   * contestó todo (app.mjs no la espera: responde 200 a Meta de inmediato).
   */
  async function handleWebhook({ messages = [], statuses = [] }) {
    for (const s of statuses) {
      db.prepare('UPDATE wa_messages SET status = ? WHERE external_id = ?').run(s.status, s.externalId);
      if (s.status === 'failed') {
        db.prepare("UPDATE wa_outbox SET status = 'fallido', reason = ?, updated_at = ? WHERE external_id = ? AND status = 'enviado'")
          .run((s.error || 'Meta no pudo entregar el mensaje.').slice(0, 300), ctx.nowIso(), s.externalId);
      }
    }
    await Promise.all(messages.map((m) => handleInbound(m)));
  }

  /** @returns {Promise<'duplicate'|'held'|'linked'|'answered'|'absorbed'|'ignored'>} */
  async function handleInbound(msg) {
    const conv = conversationFor(msg.waId, { name: msg.name });
    const body = redact(msg.media ? mediaLabel(msg.media, msg.text) : msg.text);
    try {
      addMessage(conv.id, 'cliente', body, { externalId: msg.externalId, media: msg.media });
    } catch (error) {
      if (/UNIQUE/i.test(String(error?.message))) return 'duplicate'; // Meta reenvió el webhook
      throw error;
    }
    db.prepare('UPDATE wa_conversations SET last_client_at = ? WHERE id = ?').run(ctx.nowIso(), conv.id);

    // Acciones de sistema: van siempre, aunque el equipo tenga la conversación.
    const code = msg.media ? null : parseLinkCode(msg.text);
    if (code) return enqueueTask(conv.id, () => linkWithCode(conv.id, code, msg.externalId));
    const opt = msg.media ? null : optIntent(msg.text);
    if (opt) return enqueueTask(conv.id, () => changeOptIn(conv.id, opt, msg.externalId));

    const fresh = getConversation(conv.id);
    if (teamHolds(fresh)) {
      // El equipo está con la conversación: el asistente se calla y queda marcada para atender.
      if (!fresh.pending) alertTeam(fresh, { reason: 'espera', summary: body, urgent: false });
      return 'held';
    }
    const go = await waitForSilence(conv.id, msg);
    if (!go) return 'absorbed';
    return enqueueTask(conv.id, () => answerTurn(conv.id, msg.externalId));
  }

  async function answerTurn(convId, lastExternalId) {
    const conv = getConversation(convId);
    if (!conv || teamHolds(conv)) return 'held';
    const turn = pendingTurn(conv);
    if (!turn.count) return 'ignored';
    const started = ctx.nowIso();
    const result = respond(conv.bot_state, { text: turn.text, media: turn.media }, { now: ctx.now(), facts: factsFor(conv) });
    db.prepare('UPDATE wa_conversations SET bot_state = ? WHERE id = ?').run(JSON.stringify(readState(result.state)), conv.id);
    if (result.handoff) {
      // Efectos antes de enviar: el aviso al equipo y la pausa quedan aunque falle el envío.
      addMessage(conv.id, 'aviso', redact(result.handoff.summary));
      db.prepare('UPDATE wa_conversations SET paused_until = ? WHERE id = ?').run(new Date(ctx.now() + WA_TEAM_PAUSE_MINUTES * MINUTE).toISOString(), conv.id);
      alertTeam(conv, result.handoff);
    }
    await sendReplies(conv.id, result.replies, { started, readId: lastExternalId, effects: !!result.handoff });
    return 'answered';
  }

  /** ¿Alguien del equipo contestó o tomó el control desde que empezó el turno? */
  const teamStepped = (convId, since) => {
    const c = getConversation(convId);
    if (c.team_control) return true;
    return !!db.prepare("SELECT 1 FROM wa_messages WHERE conversation_id = ? AND origin = 'equipo' AND created_at >= ?").get(convId, since);
  };

  const sleep = (ms) => (ms > 0 ? new Promise((r) => { const t = setTimeout(r, ms); t.unref?.(); }) : Promise.resolve());

  async function sendReplies(convId, replies, { started = ctx.nowIso(), readId = null, effects = false } = {}) {
    const t = transport();
    const bubbles = groupBubbles(replies);
    if (!t || !bubbles.length) return 0;
    const conv = getConversation(convId);
    let sent = 0;
    for (const [i, bubble] of bubbles.entries()) {
      if (teamStepped(convId, started)) break; // el humano siempre gana
      // Si la persona escribió algo nuevo y esta respuesta no dejó nada hecho, se corta: se atiende todo junto después.
      if (!effects && i > 0 && db.prepare("SELECT 1 FROM wa_messages WHERE conversation_id = ? AND origin = 'cliente' AND created_at > ?").get(convId, started)) break;
      if (i === 0 && readId) await t.markRead(readId);
      await sleep((i === 0 ? 800 : 2000) * pace + typingDelay(bubble.text) * pace);
      try {
        const out = bubble.buttons?.length ? await t.sendOptions(conv.wa_id, bubble.text, bubble.buttons) : await t.sendText(conv.wa_id, bubble.text);
        addMessage(convId, 'asistente', bubble.buttons?.length ? `${bubble.text}\n[Opciones: ${bubble.buttons.join(' · ')}]` : bubble.text, { externalId: out?.id ?? null });
        db.prepare('UPDATE wa_conversations SET last_reply_at = ? WHERE id = ?').run(ctx.nowIso(), convId);
        sent += 1;
      } catch (error) {
        addMessage(convId, 'sistema', `No se pudo enviar la respuesta del asistente: ${error?.message ?? error}`);
        break;
      }
    }
    return sent;
  }

  // ── Vínculo opt-in ────────────────────────────────────────────────────────

  /** Código para que el cliente active los avisos desde su portal. */
  function createLinkCode(account) {
    const t = transport();
    if (!t) return null;
    const code = newLinkCode(randomBytes);
    const expires = new Date(ctx.now() + WA_LINK_CODE_MINUTES * MINUTE).toISOString();
    db.prepare('UPDATE client_accounts SET wa_code_hash = ?, wa_code_expires_at = ? WHERE id = ?').run(hashToken(`wa-link:${code}`), expires, account.id);
    const text = `ACTIVAR ${code}`;
    return { code, text, expires_at: expires, link: t.displayNumber ? `https://wa.me/${t.displayNumber}?text=${encodeURIComponent(text)}` : null, number: t.displayNumber ? formatWaPhone(t.displayNumber) : null };
  }

  async function linkWithCode(convId, code, readId) {
    const conv = getConversation(convId);
    const key = [`wa:${conv.wa_id}`];
    let result = 'invalid';
    let account = null;
    if (linkLimiter.blocked(key) || linkLimiterAll.blocked(['wa:todos'])) result = 'blocked';
    else {
      account = db.prepare(`SELECT a.*, c.name client_name FROM client_accounts a JOIN clients c ON c.id = a.client_id
        WHERE a.wa_code_hash = ? AND a.active = 1 AND a.wa_code_expires_at > ?`).get(hashToken(`wa-link:${code}`), ctx.nowIso());
      if (!account) { linkLimiter.fail(key); linkLimiterAll.fail(['wa:todos']); }
      else {
        const at = ctx.nowIso();
        // Un número pertenece a una sola cuenta: si estaba en otra, pasa a esta.
        db.prepare('UPDATE client_accounts SET wa_id = NULL, wa_opt_in = 0, wa_linked_at = NULL WHERE wa_id = ? AND id <> ?').run(conv.wa_id, account.id);
        db.prepare('UPDATE client_accounts SET wa_id = ?, wa_opt_in = 1, wa_linked_at = ?, wa_code_hash = NULL, wa_code_expires_at = NULL WHERE id = ?').run(conv.wa_id, at, account.id);
        db.prepare("UPDATE wa_conversations SET account_id = ?, bot_state = '{}' WHERE id = ?").run(account.id, conv.id);
        linkLimiter.reset(key);
        ctx.log(null, 'client_account', account.id, 'whatsapp_linked', `${account.name} (${account.client_name}) activó los avisos por WhatsApp`);
        result = 'linked';
      }
    }
    addMessage(convId, 'sistema', result === 'linked' ? `Número vinculado a ${account.name} (${account.client_name}).` : 'Intento de vincular con un código que no coincide.');
    await sendReplies(convId, linkReply(result, { name: account?.name, clientName: account?.client_name }), { readId, effects: true });
    return 'linked';
  }

  async function changeOptIn(convId, opt, readId) {
    const conv = getConversation(convId);
    const account = db.prepare('SELECT id, name FROM client_accounts WHERE wa_id = ? AND active = 1').get(conv.wa_id);
    let result = 'unlinked';
    if (account) {
      db.prepare('UPDATE client_accounts SET wa_opt_in = ? WHERE id = ?').run(opt === 'in' ? 1 : 0, account.id);
      ctx.log(null, 'client_account', account.id, opt === 'in' ? 'whatsapp_opt_in' : 'whatsapp_opt_out', `${account.name} ${opt === 'in' ? 'reactivó' : 'pausó'} los avisos por WhatsApp`);
      result = opt;
    }
    await sendReplies(convId, optReply(result), { readId, effects: true });
    return 'answered';
  }

  // ── Acciones del equipo ───────────────────────────────────────────────────

  /** Respuesta del equipo desde el panel: el asistente se calla 30 minutos desde la última respuesta. */
  async function teamReply(convId, user, text) {
    const conv = getConversation(convId);
    const t = transport();
    if (!t) return { error: 'not_configured' };
    if (!sessionOpen(conv)) return { error: 'session_closed' };
    const out = await t.sendText(conv.wa_id, text);
    addMessage(conv.id, 'equipo', text, { externalId: out?.id ?? null, userId: user.id });
    const at = ctx.nowIso();
    db.prepare('UPDATE wa_conversations SET paused_until = ?, pending = 0, urgent = 0, reason = NULL, attended_at = ?, last_reply_at = ? WHERE id = ?')
      .run(new Date(ctx.now() + WA_TEAM_PAUSE_MINUTES * MINUTE).toISOString(), at, at, conv.id);
    return { ok: true };
  }

  function setControl(convId, mode) {
    if (mode === 'equipo') db.prepare('UPDATE wa_conversations SET team_control = 1 WHERE id = ?').run(convId);
    // Devolver al asistente: sin control, sin pausa y el motor empieza de cero.
    else db.prepare("UPDATE wa_conversations SET team_control = 0, paused_until = NULL, bot_state = '{}', pending = 0, urgent = 0, reason = NULL WHERE id = ?").run(convId);
  }

  function setAttended(convId, attended) {
    if (attended) db.prepare('UPDATE wa_conversations SET pending = 0, urgent = 0, reason = NULL, attended_at = ? WHERE id = ?').run(ctx.nowIso(), convId);
    else db.prepare('UPDATE wa_conversations SET attended_at = NULL, pending = 1 WHERE id = ?').run(convId);
  }

  return {
    configured: () => !!transport(),
    outbound: () => !!transport()?.outbound,
    transport,
    scheduleFor, enqueue, onClientNotifications, enqueueMeetingReminders, dispatch, tick, retry,
    handleWebhook, handleInbound, sessionOpen, getConversation, factsFor,
    createLinkCode, teamReply, setControl, setAttended,
    templates: WA_TEMPLATES,
  };
}
