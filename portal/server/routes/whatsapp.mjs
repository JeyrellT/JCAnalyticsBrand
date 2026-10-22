// ============================================================================
//  server/routes/whatsapp.mjs
//  API de WhatsApp (docs/whatsapp.md). Sin dependencias de Node: corre también
//  en la demo, donde no hay transporte y el panel lo explica.
//
//    Equipo  (user):   bandeja de conversaciones, responder, tomar o devolver el
//                      control, marcar atendida, cola de avisos y reintentos.
//    Avisos  (user):   POST /api/clients/:id/announce: aviso del equipo a un cliente
//                      (portal + WhatsApp). Admin, socios o quien lleva la cuenta.
//    Cliente (client): estado de su vínculo, código para activar y pausar avisos.
//
//  El webhook de Meta NO vive aquí: necesita el cuerpo crudo para la firma y
//  responde sin cookie ni encabezado anti-CSRF (ver app.mjs, /webhooks/whatsapp).
// ============================================================================

import { WA_TRAYS, WA_OUTBOX_STATUS, WA_TEMPLATES, WA_SESSION_HOURS, formatWaPhone, maskWaPhone } from '../../shared/whatsapp.js';
import { fail, invalid, text, oneOf } from '../http.mjs';
import { canManagePortal } from './portal-admin.mjs';
import { createPortalHelpers } from './portal-common.mjs';

const MINUTE = 60_000;
const NO_ANSWER_MINUTES = 3;

export function whatsappRoutes(route, ctx) {
  const { db } = ctx;
  const portal = createPortalHelpers(ctx);
  const wa = () => ctx.wa;

  const getConv = (convId) => db.prepare('SELECT * FROM wa_conversations WHERE id = ?').get(convId) ?? fail(404, 'not_found');
  const requireTransport = () => { if (!wa().configured()) fail(409, 'whatsapp_not_configured'); };
  const bool = (value, field) => {
    if (typeof value !== 'boolean') invalid(field, 'Debe ser sí o no.');
    return value;
  };

  const CONV_SELECT = `SELECT w.*, a.name account_name, a.client_id, c.name client_name, c.owner_id,
      (SELECT body FROM wa_messages m WHERE m.conversation_id = w.id AND m.origin IN ('cliente','asistente','equipo','plantilla') ORDER BY m.id DESC LIMIT 1) last_body,
      (SELECT origin FROM wa_messages m WHERE m.conversation_id = w.id AND m.origin IN ('cliente','asistente','equipo','plantilla') ORDER BY m.id DESC LIMIT 1) last_origin
    FROM wa_conversations w LEFT JOIN client_accounts a ON a.id = w.account_id LEFT JOIN clients c ON c.id = a.client_id`;

  function publicConv(row) {
    const now = ctx.now();
    const paused = !!row.paused_until && Date.parse(row.paused_until) > now;
    return {
      id: row.id,
      phone: formatWaPhone(row.wa_id),
      name: row.name,
      account: row.account_id ? { id: row.account_id, name: row.account_name, client_id: row.client_id, client_name: row.client_name } : null,
      pending: !!row.pending,
      urgent: !!row.urgent,
      reason: row.reason,
      team_control: !!row.team_control,
      paused_until: paused ? row.paused_until : null,
      attended_at: row.attended_at,
      last_client_at: row.last_client_at,
      last_message_at: row.last_message_at,
      session_open: wa().sessionOpen(row),
      session_closes_at: row.last_client_at ? new Date(Date.parse(row.last_client_at) + WA_SESSION_HOURS * 3_600_000).toISOString() : null,
      last_body: row.last_body ? String(row.last_body).slice(0, 160) : null,
      last_origin: row.last_origin ?? null,
    };
  }

  // ── Estado y conexión ─────────────────────────────────────────────────────

  route('GET', '/api/whatsapp/status', 'user', async ({ user, query }) => {
    const t = wa().transport();
    const counts = db.prepare(`SELECT
        (SELECT COUNT(*) FROM wa_conversations WHERE pending = 1 OR urgent = 1) to_attend,
        (SELECT COUNT(*) FROM wa_conversations WHERE urgent = 1) urgent,
        (SELECT COUNT(*) FROM wa_outbox WHERE status IN ('pendiente','enviando')) queued,
        (SELECT COUNT(*) FROM wa_outbox WHERE status = 'fallido') failed,
        (SELECT COUNT(*) FROM client_accounts WHERE active = 1 AND wa_id IS NOT NULL AND wa_opt_in = 1) linked_accounts`).get();
    let phone = null;
    if (t?.phoneStatus) {
      try { phone = await t.phoneStatus({ fresh: query.get('fresh') === '1' }); } catch { phone = { ok: false, error: 'Sin respuesta de Meta.' }; }
    }
    return {
      configured: !!t,
      outbound: !!t?.outbound,
      display_number: t?.displayNumber ? formatWaPhone(t.displayNumber) : null,
      template_lang: t?.lang ?? null,
      missing: user.role === 'admin' ? ctx.waMissing ?? [] : [],
      webhook_path: '/webhooks/whatsapp',
      phone,
      counts,
      templates: Object.entries(WA_TEMPLATES).map(([name, tpl]) => ({ name, ...tpl })),
      meeting_reminder_hours: ctx.numberSetting('wa_meeting_reminder_hours', 24),
    };
  });

  // ── Conversaciones ────────────────────────────────────────────────────────

  route('GET', '/api/whatsapp/conversations', 'user', ({ query }) => {
    const tray = oneOf(query.get('tray'), 'tray', WA_TRAYS, { fallback: 'atender' });
    const q = text(query.get('q'), 'q', { max: 80 });
    const nowIso = ctx.nowIso();
    const where = [];
    const args = [];
    if (tray === 'atender') where.push('(w.pending = 1 OR w.urgent = 1)');
    if (tray === 'sin_respuesta') {
      where.push("w.last_client_at IS NOT NULL AND w.last_client_at > COALESCE(w.last_reply_at, '') AND w.last_client_at <= ? AND w.team_control = 0");
      args.push(new Date(ctx.now() - NO_ANSWER_MINUTES * MINUTE).toISOString());
    }
    if (tray === 'equipo') { where.push('(w.team_control = 1 OR w.paused_until > ?)'); args.push(nowIso); }
    if (tray === 'resueltas') where.push('w.attended_at IS NOT NULL AND w.attended_at >= COALESCE(w.last_client_at, \'\') AND w.pending = 0');
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
      const digits = q.replace(/\D/g, '');
      where.push(`(w.name LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\' ${digits.length >= 4 ? 'OR w.wa_id LIKE ?' : ''}
        OR EXISTS (SELECT 1 FROM wa_messages m WHERE m.conversation_id = w.id AND m.body LIKE ? ESCAPE '\\'))`);
      args.push(like, like, like, ...(digits.length >= 4 ? [`%${digits}%`] : []), like);
    }
    const rows = db.prepare(`${CONV_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY w.urgent DESC, w.pending DESC, w.last_message_at DESC LIMIT 100`).all(...args);
    const traysCount = db.prepare(`SELECT
        SUM(CASE WHEN pending = 1 OR urgent = 1 THEN 1 ELSE 0 END) atender,
        SUM(CASE WHEN team_control = 1 OR paused_until > ? THEN 1 ELSE 0 END) equipo,
        COUNT(*) todas FROM wa_conversations`).get(nowIso);
    return { tray, conversations: rows.map(publicConv), counts: { atender: traysCount.atender ?? 0, equipo: traysCount.equipo ?? 0, todas: traysCount.todas ?? 0 } };
  });

  route('GET', '/api/whatsapp/conversations/:id', 'user', ({ params }) => {
    const row = db.prepare(`${CONV_SELECT} WHERE w.id = ?`).get(params.id) ?? fail(404, 'not_found');
    const messages = db.prepare(`SELECT m.id, m.origin, m.body, m.media_type, m.status, m.created_at, u.name user_name
      FROM wa_messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 300`).all(row.id).reverse();
    const account = row.account_id ? db.prepare('SELECT id, name, email, title, wa_opt_in, wa_linked_at, active FROM client_accounts WHERE id = ?').get(row.account_id) : null;
    return {
      conversation: publicConv(row),
      messages,
      account: account && { ...account, wa_opt_in: !!account.wa_opt_in, active: !!account.active },
      client: row.client_id ? { id: row.client_id, name: row.client_name, owner_name: row.owner_id ? ctx.userName(row.owner_id) : null } : null,
    };
  });

  route('POST', '/api/whatsapp/conversations/:id/reply', 'user', async ({ user, params, body }) => {
    requireTransport();
    const conv = getConv(params.id);
    const message = text(body.text, 'text', { max: 4000, required: true });
    let result;
    try {
      result = await wa().teamReply(conv.id, user, message);
    } catch (error) {
      fail(502, 'whatsapp_send_failed', { message: String(error?.message ?? 'Meta no aceptó el mensaje.').slice(0, 200) });
    }
    if (result?.error === 'session_closed') {
      fail(409, 'whatsapp_session_closed', { message: `Pasaron más de ${WA_SESSION_HOURS} h desde el último mensaje del cliente: WhatsApp solo permite escribirle con una plantilla. Usá "Enviar aviso" desde su ficha o esperá a que vuelva a escribir.` });
    }
    ctx.log(user.id, 'whatsapp', conv.id, 'replied', `${user.name} respondió por WhatsApp a ${conv.name || formatWaPhone(conv.wa_id)}`);
    return { ok: true };
  });

  route('POST', '/api/whatsapp/conversations/:id/control', 'user', ({ user, params, body }) => {
    const conv = getConv(params.id);
    const mode = oneOf(body.mode, 'mode', ['equipo', 'asistente'], { required: true });
    wa().setControl(conv.id, mode);
    ctx.log(user.id, 'whatsapp', conv.id, mode === 'equipo' ? 'took_control' : 'returned_control',
      `${user.name} ${mode === 'equipo' ? 'tomó el control de' : 'devolvió al asistente'} la conversación con ${conv.name || formatWaPhone(conv.wa_id)}`);
    return { ok: true };
  });

  route('POST', '/api/whatsapp/conversations/:id/attended', 'user', ({ params, body }) => {
    const conv = getConv(params.id);
    wa().setAttended(conv.id, bool(body.attended, 'attended'));
    return { ok: true };
  });

  // ── Cola de avisos ────────────────────────────────────────────────────────

  route('GET', '/api/whatsapp/outbox', 'user', ({ query }) => {
    const status = oneOf(query.get('status'), 'status', WA_OUTBOX_STATUS);
    const rows = db.prepare(`SELECT o.id, o.kind, o.template, o.text_body, o.urgent, o.status, o.scheduled_for, o.attempts, o.reason, o.created_at, o.sent_at,
        a.name account_name, a.wa_id, c.id client_id, c.name client_name, u.name created_by_name
      FROM wa_outbox o JOIN client_accounts a ON a.id = o.account_id JOIN clients c ON c.id = a.client_id LEFT JOIN users u ON u.id = o.created_by
      ${status ? 'WHERE o.status = ?' : ''} ORDER BY o.created_at DESC, o.id DESC LIMIT 150`).all(...(status ? [status] : []));
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) n FROM wa_outbox GROUP BY status').all().map((r) => [r.status, r.n]));
    return {
      items: rows.map(({ wa_id: waId, ...r }) => ({ ...r, urgent: !!r.urgent, phone: maskWaPhone(waId) })),
      counts,
    };
  });

  route('POST', '/api/whatsapp/outbox/:id/retry', 'user', ({ user, params }) => {
    if (!wa().retry(params.id)) fail(409, 'not_retryable');
    ctx.log(user.id, 'whatsapp', params.id, 'retry', `${user.name} reintentó un aviso de WhatsApp`);
    return { ok: true };
  });

  route('POST', '/api/whatsapp/dispatch', 'admin', async () => {
    requireTransport();
    return { result: await wa().tick() };
  });

  // ── Aviso del equipo a un cliente (portal + WhatsApp) ─────────────────────

  route('POST', '/api/clients/:id/announce', 'user', ({ user, params, body }) => {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id) ?? fail(404, 'not_found');
    if (!canManagePortal(user, client)) fail(403, 'forbidden');
    const title = text(body.title, 'title', { max: 120, min: 3, required: true });
    const message = text(body.text, 'text', { max: 600, min: 5, required: true });
    const urgent = body.urgent == null ? false : bool(body.urgent, 'urgent');
    const before = db.prepare('SELECT COALESCE(MAX(id), 0) n FROM wa_outbox').get().n;
    const accounts = portal.notifyClient(client.id, { kind: 'aviso', title, body: message, link: '/cliente/avisos' }, { urgent, actorId: user.id });
    if (!accounts) fail(409, 'no_client_accounts', { message: 'Este cliente todavía no tiene accesos al portal.' });
    const whatsapp = db.prepare('SELECT COUNT(*) n FROM wa_outbox WHERE id > ?').get(before).n;
    ctx.log(user.id, 'client', client.id, 'announced', `${user.name} envió un aviso a ${client.name}: ${title}`);
    return { ok: true, accounts, whatsapp };
  });

  // ── Portal del cliente: su vínculo con WhatsApp ───────────────────────────

  const clientState = (accountId) => {
    const a = db.prepare('SELECT wa_id, wa_opt_in, wa_linked_at, wa_code_expires_at FROM client_accounts WHERE id = ?').get(accountId);
    const t = wa().transport();
    return {
      available: !!t,
      linked: !!a.wa_id,
      opt_in: !!a.wa_opt_in,
      linked_at: a.wa_linked_at,
      phone: maskWaPhone(a.wa_id),
      number: t?.displayNumber ? formatWaPhone(t.displayNumber) : null,
    };
  };

  route('GET', '/api/client/whatsapp', 'client', ({ account }) => ({ whatsapp: clientState(account.id) }));

  route('POST', '/api/client/whatsapp/link', 'client', ({ account }) => {
    requireTransport();
    const code = wa().createLinkCode(account);
    if (!code?.link) fail(409, 'whatsapp_number_missing', { message: 'Falta configurar el número de WhatsApp de JC Analytics.' });
    return { link: code, whatsapp: clientState(account.id) };
  });

  route('PATCH', '/api/client/whatsapp', 'client', ({ account, body }) => {
    const optIn = bool(body.opt_in, 'opt_in');
    const current = db.prepare('SELECT wa_id FROM client_accounts WHERE id = ?').get(account.id);
    if (!current.wa_id) fail(409, 'whatsapp_not_linked');
    db.prepare('UPDATE client_accounts SET wa_opt_in = ? WHERE id = ?').run(optIn ? 1 : 0, account.id);
    ctx.log(null, 'client_account', account.id, optIn ? 'whatsapp_opt_in' : 'whatsapp_opt_out', `${account.name} ${optIn ? 'reactivó' : 'pausó'} los avisos por WhatsApp desde el portal`);
    return { whatsapp: clientState(account.id) };
  });

  route('DELETE', '/api/client/whatsapp', 'client', ({ account }) => {
    db.prepare('UPDATE client_accounts SET wa_id = NULL, wa_opt_in = 0, wa_linked_at = NULL, wa_code_hash = NULL, wa_code_expires_at = NULL WHERE id = ?').run(account.id);
    db.prepare('UPDATE wa_conversations SET account_id = NULL WHERE account_id = ?').run(account.id);
    ctx.log(null, 'client_account', account.id, 'whatsapp_unlinked', `${account.name} desvinculó su WhatsApp del portal`);
    return { whatsapp: clientState(account.id) };
  });
}
