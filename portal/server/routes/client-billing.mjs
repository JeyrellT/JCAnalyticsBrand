// ============================================================================
//  server/routes/client-billing.mjs
//  Portal simple del cliente: ACTUALIZACIONES que el cliente pide (y el equipo
//  cotiza) y su cuenta de PAGOS. Sin dependencias de Node: corre en la demo.
//
//  Flujo de una actualización:
//    pendiente ──(socio/admin pone el monto)──▶ cotizada ──(cliente acepta)──▶ en_proceso ──▶ lista
//        │                                        │
//        ├─(cliente la retira)─▶ cancelada         └─(cliente o equipo la rechaza)─▶ rechazada
//        └─(equipo la rechaza)─▶ rechazada
//    Monto 0 = sin costo: pasa directo a en_proceso, sin cobro.
//    Al aceptar con monto > 0 nace un cobro "por pagar" en client_payments (uno por actualización).
//
//  Cuenta de pagos (client_payments):
//    · nace de una actualización aceptada, de un cobro manual o de cada fecha de un
//      cobro programado del proyecto (project_charges) desde su ledger_from;
//    · pendiente → pagado (con fecha y referencia SINPE) o → anulado (con motivo);
//    · el cliente nunca ve los anulados.
//
//  Permisos: todo el equipo ve; solo socios y admin ponen montos o tocan pagos.
//  El cliente solo ve lo suyo (client_id) y lo de proyectos que ve en su portal.
// ============================================================================

import { REQUEST_STATUS, PAYMENT_STATUS, CLIENT_VISIBLE_PROJECT_STATUSES, totalsByCurrency } from '../../shared/client-portal.js';
import { BILLING_FREQUENCIES, BILLING_PROJECT_STATUSES, occurrences, nextOccurrence, addDays } from '../../shared/billing.js';
import { canInvest } from '../../shared/catalog.js';
import { formatMoney } from '../../shared/finance.js';
import { fail, invalid, has, text, oneOf, id, dateOnly, minorAmount } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { createPortalHelpers } from './portal-common.mjs';

const VISIBLE_STATUS_SQL = `('${CLIENT_VISIBLE_PROJECT_STATUSES.join("','")}')`;
const BILLING_STATUS_SQL = `('${BILLING_PROJECT_STATUSES.join("','")}')`;
const REQUEST_ORDER = `CASE r.status WHEN 'cotizada' THEN 0 WHEN 'pendiente' THEN 1 WHEN 'en_proceso' THEN 2 ELSE 3 END`;

/** Lecturas, decoración y sincronización compartidas por las rutas del equipo y del cliente. */
export function createClientBilling(ctx) {
  const { db } = ctx;

  // ── Actualizaciones ───────────────────────────────────────────────────────
  // El proyecto se une solo si sigue siendo del MISMO cliente: si cambia de dueño, no se filtra.
  const REQUEST_SELECT = `SELECT r.*, c.name client_name, p.name project_name, p.status project_status,
      q.name quoted_by_name, ca.name decided_by_name, COALESCE(cu.name, uu.name) created_by_name,
      pay.id payment_id, pay.status payment_status
    FROM client_requests r JOIN clients c ON c.id = r.client_id
    LEFT JOIN projects p ON p.id = r.project_id AND p.client_id = r.client_id
    LEFT JOIN users q ON q.id = r.quoted_by
    LEFT JOIN client_accounts ca ON ca.id = r.decided_by_account
    LEFT JOIN client_accounts cu ON cu.id = r.created_by_account
    LEFT JOIN users uu ON uu.id = r.created_by_user
    LEFT JOIN client_payments pay ON pay.request_id = r.id`;

  /** Actualización lista para la pantalla. Al cliente no le llega quién del equipo cotizó. */
  function decorateRequest(r, audience = 'team') {
    const meta = REQUEST_STATUS[r.status] ?? REQUEST_STATUS.pendiente;
    const out = {
      id: r.id,
      client_id: r.client_id,
      client_name: r.client_name,
      project_id: r.project_name ? r.project_id : null,
      project_name: r.project_name ?? null,
      title: r.title,
      detail: r.detail,
      status: r.status,
      status_label: audience === 'client' ? meta.client : meta.label,
      amount: r.amount,
      currency: r.currency,
      quote_note: r.quote_note,
      quoted_at: r.quoted_at,
      decided_at: r.decided_at,
      decided_by_name: r.decided_by_name,
      decision_note: r.decision_note,
      closed_note: r.closed_note,
      done_at: r.done_at,
      created_by: { type: r.created_by_account ? 'cliente' : 'equipo', name: r.created_by_name },
      created_at: r.created_at,
      updated_at: r.updated_at,
      payment_id: r.payment_id ?? null,
      payment_status: r.payment_status ?? null,
    };
    if (audience === 'team') out.quoted_by_name = r.quoted_by_name;
    return out;
  }

  function listRequests({ clientId, visibleOnly = false, limit = 200 }) {
    const visible = visibleOnly ? `AND (r.project_id IS NULL OR p.status IN ${VISIBLE_STATUS_SQL})` : '';
    return db.prepare(`${REQUEST_SELECT} WHERE r.client_id = ? ${visible}
      ORDER BY ${REQUEST_ORDER}, r.updated_at DESC, r.id DESC LIMIT ?`).all(clientId, limit);
  }
  const getRequestRow = (requestId) => db.prepare(`${REQUEST_SELECT} WHERE r.id = ?`).get(requestId) ?? fail(404, 'not_found');
  /** Actualización del cliente (404 si es de otro o de un proyecto que no ve). */
  const getClientRequestRow = (requestId, clientId) => db.prepare(`${REQUEST_SELECT} WHERE r.id = ? AND r.client_id = ?
    AND (r.project_id IS NULL OR p.status IN ${VISIBLE_STATUS_SQL})`).get(requestId, clientId) ?? fail(404, 'not_found');

  // ── Pagos ─────────────────────────────────────────────────────────────────
  const PAYMENT_SELECT = `SELECT pay.*, c.name client_name, p.name project_name, p.status project_status,
      r.title request_title, ch.frequency charge_frequency, u.name recorded_by_name
    FROM client_payments pay JOIN clients c ON c.id = pay.client_id
    LEFT JOIN projects p ON p.id = pay.project_id AND p.client_id = pay.client_id
    LEFT JOIN client_requests r ON r.id = pay.request_id
    LEFT JOIN project_charges ch ON ch.id = pay.charge_id
    LEFT JOIN users u ON u.id = pay.recorded_by`;

  /** De dónde salió el cobro: una actualización aceptada, un cobro programado o uno manual. */
  const sourceOf = (p) => (p.request_id ? 'actualizacion' : p.charge_id ? 'programado' : 'manual');

  function decoratePayment(p, audience = 'team') {
    const today = ctx.today();
    const out = {
      id: p.id,
      client_id: p.client_id,
      client_name: p.client_name,
      project_id: p.project_name ? p.project_id : null,
      project_name: p.project_name ?? null,
      request_id: p.request_id,
      request_title: p.request_title ?? null,
      charge_id: p.charge_id,
      frequency: p.charge_frequency ?? null,
      frequency_label: p.charge_frequency ? BILLING_FREQUENCIES[p.charge_frequency]?.label ?? null : null,
      source: sourceOf(p),
      concept: p.concept,
      amount: p.amount,
      currency: p.currency,
      due_date: p.due_date,
      status: p.status,
      status_label: PAYMENT_STATUS[p.status]?.label ?? p.status,
      overdue: p.status === 'pendiente' && p.due_date < today,
      paid_date: p.paid_date,
      reference: p.reference,
      note: p.note,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
    if (audience === 'team') Object.assign(out, { void_reason: p.void_reason, recorded_by_name: p.recorded_by_name });
    return out;
  }

  /** Pagos de un cliente: pendientes primero (el más viejo arriba), luego lo pagado (lo último arriba). */
  function listPayments({ clientId, audience = 'team' }) {
    const hide = audience === 'client' ? `AND pay.status <> 'anulado' AND (pay.project_id IS NULL OR p.status IN ${VISIBLE_STATUS_SQL})` : '';
    return db.prepare(`${PAYMENT_SELECT} WHERE pay.client_id = ? ${hide}
      ORDER BY CASE pay.status WHEN 'pendiente' THEN 0 WHEN 'pagado' THEN 1 ELSE 2 END,
        CASE WHEN pay.status = 'pendiente' THEN pay.due_date END ASC,
        COALESCE(pay.paid_date, pay.due_date) DESC, pay.id DESC LIMIT 500`).all(clientId).map((p) => decoratePayment(p, audience));
  }
  const getPaymentRow = (paymentId) => db.prepare(`${PAYMENT_SELECT} WHERE pay.id = ?`).get(paymentId) ?? fail(404, 'not_found');

  /** Resumen de la cuenta: por pagar, vencido y pagado este año, por moneda (sin convertir). */
  function paymentSummary(payments) {
    const today = ctx.today();
    const pending = payments.filter((p) => p.status === 'pendiente');
    const overdue = pending.filter((p) => p.overdue);
    const year = today.slice(0, 4);
    const paidYear = payments.filter((p) => p.status === 'pagado' && (p.paid_date ?? '').startsWith(year));
    const next = pending.filter((p) => !p.overdue).sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null;
    return {
      pending_count: pending.length,
      pending: totalsByCurrency(pending),
      overdue_count: overdue.length,
      overdue: totalsByCurrency(overdue),
      paid_year: totalsByCurrency(paidYear),
      paid_year_count: paidYear.length,
      year,
      next_due: next ? { id: next.id, concept: next.concept, amount: next.amount, currency: next.currency, due_date: next.due_date } : null,
    };
  }

  // ── Cobros programados → pendientes ───────────────────────────────────────
  const insertScheduled = db.prepare(`INSERT OR IGNORE INTO client_payments (client_id, project_id, charge_id, concept, amount, currency, due_date,
    status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`);
  const conceptOf = (charge) => charge.concept || `${BILLING_FREQUENCIES[charge.frequency]?.label ?? 'Cobro'} · ${charge.project_name}`;
  /** Primer día que el cobro programado puede generar pendientes (lo anterior a su registro no se inventa). */
  const ledgerStart = (charge) => {
    const from = charge.ledger_from ?? String(charge.created_at).slice(0, 10);
    return from > charge.start_date ? from : charge.start_date;
  };

  /**
   * Cada fecha de un cobro programado que ya llegó (hasta hoy) queda como pendiente, una sola vez
   * (índice único charge_id + due_date). `full` recorre todo el rango (tras editar el cobro);
   * si no, arranca después de la última fecha ya generada.
   */
  function syncCharge(charge, { full = false } = {}) {
    if (!charge.client_id || charge.project_archived || !BILLING_PROJECT_STATUSES.includes(charge.project_status)) return 0;
    const today = ctx.today();
    let from = ledgerStart(charge);
    if (!full) {
      const last = db.prepare('SELECT MAX(due_date) d FROM client_payments WHERE charge_id = ?').get(charge.id).d;
      if (last && last >= from) from = addDays(last, 1);
    }
    if (from > today) return 0;
    const at = ctx.nowIso();
    let created = 0;
    for (const date of occurrences(charge, from, today, 400)) {
      created += Number(insertScheduled.run(charge.client_id, charge.project_id, charge.id, conceptOf(charge), charge.amount, charge.currency, date, at, at).changes ?? 0);
    }
    return created;
  }

  const CHARGE_SELECT = `SELECT ch.*, p.client_id, p.name project_name, p.status project_status, p.archived project_archived
    FROM project_charges ch JOIN projects p ON p.id = ch.project_id`;
  /** Genera los pendientes de los cobros programados de un cliente (o de todos). Idempotente. */
  function syncScheduled(clientId = null) {
    const rows = clientId
      ? db.prepare(`${CHARGE_SELECT} WHERE p.client_id = ? AND p.archived = 0 AND p.status IN ${BILLING_STATUS_SQL}`).all(clientId)
      : db.prepare(`${CHARGE_SELECT} WHERE p.client_id IS NOT NULL AND p.archived = 0 AND p.status IN ${BILLING_STATUS_SQL}`).all();
    let created = 0;
    for (const charge of rows) created += syncCharge(charge);
    return created;
  }
  /** Tras editar un cobro programado: lo pendiente se recalcula con el calendario nuevo (lo pagado o anulado queda). */
  function resyncCharge(chargeId) {
    db.prepare("DELETE FROM client_payments WHERE charge_id = ? AND status = 'pendiente'").run(chargeId);
    const charge = db.prepare(`${CHARGE_SELECT} WHERE ch.id = ?`).get(chargeId);
    return charge ? syncCharge(charge, { full: true }) : 0;
  }
  /** Antes de borrar un cobro programado: lo que nunca se pagó desaparece con él; lo pagado queda como historial. */
  function dropChargePending(chargeId) {
    db.prepare("DELETE FROM client_payments WHERE charge_id = ? AND status = 'pendiente'").run(chargeId);
  }

  /** Próxima fecha (después de hoy) de cada cobro programado del cliente: "lo que viene". */
  function upcomingScheduled(clientId, { visibleOnly = false } = {}) {
    const today = ctx.today();
    const visible = visibleOnly ? `AND p.status IN ${VISIBLE_STATUS_SQL}` : '';
    return db.prepare(`${CHARGE_SELECT} WHERE p.client_id = ? AND p.archived = 0 AND p.status IN ${BILLING_STATUS_SQL} ${visible}`).all(clientId)
      .map((c) => ({ charge: c, date: nextOccurrence(c, addDays(today, 1)) }))
      .filter((x) => x.date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.charge.id - b.charge.id)
      .map(({ charge: c, date }) => ({
        charge_id: c.id,
        project_id: c.project_id,
        project_name: c.project_name,
        concept: conceptOf(c),
        amount: c.amount,
        currency: c.currency,
        frequency: c.frequency,
        frequency_label: BILLING_FREQUENCIES[c.frequency]?.label ?? null,
        every: BILLING_FREQUENCIES[c.frequency]?.every ?? null,
        date,
      }));
  }

  /** Todo lo de la cuenta de un cliente en una respuesta (genera antes lo programado que ya tocó). */
  function account(clientId, audience = 'team') {
    syncScheduled(clientId);
    const payments = listPayments({ clientId, audience });
    return {
      payments,
      summary: paymentSummary(payments),
      upcoming: upcomingScheduled(clientId, { visibleOnly: audience === 'client' }),
      payment_info: ctx.settings().payment_info?.trim() || null,
    };
  }

  // ── Escrituras compartidas ────────────────────────────────────────────────
  /** Cobro pendiente por una actualización aceptada (vence hoy). Devuelve su id. */
  function paymentForRequest(r, actorUserId = null) {
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO client_payments (client_id, project_id, request_id, concept, amount, currency, due_date, status,
      created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)`).run(
      r.client_id, r.project_name ? r.project_id : null, r.id, `Actualización: ${r.title}`.slice(0, 160), r.amount, r.currency ?? 'CRC', ctx.today(), actorUserId, at, at,
    );
    return Number(lastInsertRowid);
  }

  /** El cliente (o el equipo en su nombre) acepta la cotización: en proceso y, si cuesta, su cobro. */
  function acceptRequest(r, { accountId = null, userId = null, note = null }) {
    const at = ctx.nowIso();
    return transaction(db, () => {
      db.prepare(`UPDATE client_requests SET status = 'en_proceso', decided_by_account = ?, decided_at = ?, decision_note = ?, updated_at = ? WHERE id = ?`)
        .run(accountId, at, note, at, r.id);
      return r.amount > 0 ? paymentForRequest(r, userId) : null;
    });
  }

  const money = (amount, currency) => formatMoney(amount, currency ?? 'CRC');

  return {
    REQUEST_SELECT, decorateRequest, listRequests, getRequestRow, getClientRequestRow,
    PAYMENT_SELECT, decoratePayment, listPayments, getPaymentRow, paymentSummary,
    syncScheduled, resyncCharge, dropChargePending, upcomingScheduled, account,
    acceptRequest, money,
  };
}

// ============================================================================
//  Rutas del EQUIPO (/api/clients/:id/requests|payments, /api/client-requests, /api/client-payments)
// ============================================================================
export function clientBillingRoutes(route, ctx) {
  const { db } = ctx;
  const portal = createPortalHelpers(ctx);
  const billing = createClientBilling(ctx);
  const getClientRow = (clientId) => db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) ?? fail(404, 'not_found');
  const requestLink = (r) => `/cliente/actualizaciones?ver=${r.id}`;

  function readQuote(body, { required = true } = {}) {
    const amount = minorAmount(body.amount, 'amount', { required, allowZero: true });
    const currency = oneOf(body.currency, 'currency', ['CRC', 'USD'], { fallback: 'CRC' });
    const note = text(body.note ?? body.quote_note, 'note', { max: 1000 });
    return { amount, currency, note };
  }
  /** Pone (o cambia) el monto. Monto 0 = sin costo: arranca de una vez, sin cobro. */
  function quote(r, user, { amount, currency, note }) {
    const at = ctx.nowIso();
    const free = amount === 0;
    db.prepare(`UPDATE client_requests SET amount = ?, currency = ?, quote_note = ?, quoted_by = ?, quoted_at = ?, status = ?,
      decided_at = ?, updated_at = ? WHERE id = ?`).run(amount, currency, note, user.id, at, free ? 'en_proceso' : 'cotizada', free ? at : null, at, r.id);
    const price = free ? 'sin costo' : billing.money(amount, currency);
    ctx.log(user.id, 'client', r.client_id, 'request_quoted', `${user.name} cotizó "${r.title}" de ${r.client_name}: ${price}`);
    portal.notifyClient(r.client_id, free
      ? { kind: 'actualizacion', title: `Actualización sin costo: ${r.title}`, body: note ?? 'Ya la estamos trabajando.', link: requestLink(r) }
      : { kind: 'actualizacion', title: `Cotización lista: ${r.title}`, body: `${price}${note ? ` · ${note}` : ''}. Aceptala desde tu portal.`, link: requestLink(r) });
  }

  // ── Actualizaciones ───────────────────────────────────────────────────────
  route('GET', '/api/clients/:id/requests', 'user', ({ params }) => {
    const client = getClientRow(params.id);
    return { requests: billing.listRequests({ clientId: client.id }).map((r) => billing.decorateRequest(r)) };
  });

  route('POST', '/api/clients/:id/requests', 'user', ({ user, body, params }) => {
    const client = getClientRow(params.id);
    const title = text(body.title, 'title', { max: 120, min: 3, required: true });
    const detail = text(body.detail, 'detail', { max: 2000 });
    const project = portal.projectOfClient(id(body.project_id, 'project_id'), client.id);
    const priced = body.amount != null && body.amount !== '';
    if (priced && !canInvest(user)) fail(403, 'forbidden');
    const q = priced ? readQuote(body) : null;
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO client_requests (client_id, project_id, title, detail, status, created_by_user, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?)`).run(client.id, project?.id ?? null, title, detail, user.id, at, at);
    const r = billing.getRequestRow(Number(lastInsertRowid));
    ctx.log(user.id, 'client', client.id, 'request_created', `${user.name} registró la actualización "${title}" de ${client.name}`);
    if (q) quote(r, user, q);
    else portal.notifyClient(client.id, { kind: 'actualizacion', title: `Registramos tu actualización: ${title}`, body: 'Te avisamos cuando tenga monto.', link: requestLink(r) });
    return { request: billing.decorateRequest(billing.getRequestRow(r.id)) };
  });

  route('POST', '/api/client-requests/:id/quote', 'invest', ({ user, body, params }) => {
    const r = billing.getRequestRow(params.id);
    if (!['pendiente', 'cotizada'].includes(r.status)) fail(409, 'request_locked', { status: r.status });
    quote(r, user, readQuote(body));
    return { request: billing.decorateRequest(billing.getRequestRow(r.id)) };
  });

  /** Cambios de estado del equipo: en_proceso (aceptada por WhatsApp/teléfono), lista o rechazada. */
  route('POST', '/api/client-requests/:id/status', 'user', ({ user, body, params }) => {
    const r = billing.getRequestRow(params.id);
    const to = oneOf(body.to, 'to', ['en_proceso', 'lista', 'rechazada'], { required: true });
    const note = text(body.note, 'note', { max: 1000, min: to === 'rechazada' ? 5 : 0, required: to === 'rechazada' });
    const at = ctx.nowIso();
    if (to === 'en_proceso') {
      // Aceptar en nombre del cliente compromete un cobro: solo socios y admin.
      if (r.status !== 'cotizada') fail(409, 'invalid_transition', { status: r.status });
      if (!canInvest(user)) fail(403, 'forbidden');
      billing.acceptRequest(r, { userId: user.id, note: note ?? `Aceptada por el cliente fuera del portal (registró ${user.name}).` });
      ctx.log(user.id, 'client', r.client_id, 'request_accepted', `${user.name} registró que ${r.client_name} aceptó "${r.title}" (${billing.money(r.amount, r.currency)})`);
      portal.notifyClient(r.client_id, { kind: 'actualizacion', title: `Actualización aceptada: ${r.title}`, body: 'Ya la estamos trabajando. El cobro quedó en Pagos.', link: requestLink(r) });
    } else if (to === 'lista') {
      if (r.status !== 'en_proceso') fail(409, 'invalid_transition', { status: r.status });
      db.prepare("UPDATE client_requests SET status = 'lista', done_at = ?, closed_note = COALESCE(?, closed_note), updated_at = ? WHERE id = ?").run(at, note, at, r.id);
      ctx.log(user.id, 'client', r.client_id, 'request_done', `${user.name} marcó lista la actualización "${r.title}" de ${r.client_name}`);
      portal.notifyClient(r.client_id, { kind: 'actualizacion', title: `Actualización lista: ${r.title}`, body: note, link: requestLink(r) });
    } else {
      if (!['pendiente', 'cotizada'].includes(r.status)) fail(409, 'invalid_transition', { status: r.status });
      db.prepare("UPDATE client_requests SET status = 'rechazada', closed_note = ?, updated_at = ? WHERE id = ?").run(note, at, r.id);
      ctx.log(user.id, 'client', r.client_id, 'request_rejected', `${user.name} descartó la actualización "${r.title}" de ${r.client_name}: ${note}`);
      portal.notifyClient(r.client_id, { kind: 'actualizacion', title: `No vamos a hacer: ${r.title}`, body: note, link: requestLink(r) });
    }
    return { request: billing.decorateRequest(billing.getRequestRow(r.id)) };
  });

  // ── Pagos ─────────────────────────────────────────────────────────────────
  route('GET', '/api/clients/:id/payments', 'user', ({ params }) => {
    const client = getClientRow(params.id);
    return billing.account(client.id, 'team');
  });

  route('POST', '/api/clients/:id/payments', 'invest', ({ user, body, params }) => {
    const client = getClientRow(params.id);
    const concept = text(body.concept, 'concept', { max: 160, min: 2, required: true });
    const amount = minorAmount(body.amount, 'amount', { required: true });
    const currency = oneOf(body.currency, 'currency', ['CRC', 'USD'], { fallback: 'CRC' });
    const dueDate = dateOnly(body.due_date, 'due_date') ?? ctx.today();
    const project = portal.projectOfClient(id(body.project_id, 'project_id'), client.id);
    const note = text(body.note, 'note', { max: 500 });
    // Si ya viene pagado (p. ej. un pago recibido sin cobro previo), se registra de una vez.
    const paidDate = dateOnly(body.paid_date, 'paid_date');
    const reference = text(body.reference, 'reference', { max: 80 });
    if (paidDate && paidDate > ctx.today()) invalid('paid_date', 'La fecha de pago no puede ser futura.');
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO client_payments (client_id, project_id, concept, amount, currency, due_date, status, paid_date,
      reference, note, created_by, recorded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      client.id, project?.id ?? null, concept, amount, currency, dueDate, paidDate ? 'pagado' : 'pendiente', paidDate, reference, note,
      user.id, paidDate ? user.id : null, at, at,
    );
    const price = billing.money(amount, currency);
    ctx.log(user.id, 'client', client.id, paidDate ? 'payment_recorded' : 'payment_created',
      `${user.name} ${paidDate ? 'registró un pago' : 'agregó un cobro'} de ${client.name}: ${concept} · ${price}`);
    portal.notifyClient(client.id, paidDate
      ? { kind: 'pago', title: `Recibimos tu pago de ${price}`, body: concept, link: '/cliente/pagos' }
      : { kind: 'pago', title: `Nuevo cobro: ${concept}`, body: `${price}${note ? ` · ${note}` : ''}`, link: '/cliente/pagos' });
    return { payment: billing.decoratePayment(billing.getPaymentRow(Number(lastInsertRowid))) };
  });

  route('PATCH', '/api/client-payments/:id', 'invest', ({ user, body, params }) => {
    const current = billing.getPaymentRow(params.id);
    if (current.status !== 'pendiente') fail(409, 'payment_locked', { status: current.status });
    const next = {
      concept: has(body, 'concept') ? text(body.concept, 'concept', { max: 160, min: 2, required: true }) : current.concept,
      amount: has(body, 'amount') ? minorAmount(body.amount, 'amount', { required: true }) : current.amount,
      currency: has(body, 'currency') ? oneOf(body.currency, 'currency', ['CRC', 'USD'], { required: true }) : current.currency,
      due_date: has(body, 'due_date') ? dateOnly(body.due_date, 'due_date', { required: true }) : current.due_date,
      note: has(body, 'note') ? text(body.note, 'note', { max: 500 }) : current.note,
    };
    // La fecha de un cobro programado es su clave (no se duplica): solo cambia en el cobro del proyecto.
    if (current.charge_id && next.due_date !== current.due_date) invalid('due_date', 'La fecha sale del cobro programado del proyecto: cambiala ahí.');
    db.prepare('UPDATE client_payments SET concept = ?, amount = ?, currency = ?, due_date = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(next.concept, next.amount, next.currency, next.due_date, next.note, ctx.nowIso(), current.id);
    ctx.log(user.id, 'client', current.client_id, 'payment_updated', `${user.name} ajustó el cobro "${next.concept}" de ${current.client_name}: ${billing.money(next.amount, next.currency)}`);
    return { payment: billing.decoratePayment(billing.getPaymentRow(current.id)) };
  });

  route('POST', '/api/client-payments/:id/pay', 'invest', ({ user, body, params }) => {
    const current = billing.getPaymentRow(params.id);
    if (current.status !== 'pendiente') fail(409, 'payment_locked', { status: current.status });
    const paidDate = dateOnly(body.paid_date, 'paid_date') ?? ctx.today();
    if (paidDate > ctx.today()) invalid('paid_date', 'La fecha de pago no puede ser futura.');
    const reference = text(body.reference, 'reference', { max: 80 });
    const note = has(body, 'note') ? text(body.note, 'note', { max: 500 }) : current.note;
    db.prepare("UPDATE client_payments SET status = 'pagado', paid_date = ?, reference = ?, note = ?, recorded_by = ?, updated_at = ? WHERE id = ?")
      .run(paidDate, reference, note, user.id, ctx.nowIso(), current.id);
    const price = billing.money(current.amount, current.currency);
    ctx.log(user.id, 'client', current.client_id, 'payment_recorded', `${user.name} registró el pago de ${current.client_name}: ${current.concept} · ${price}${reference ? ` (ref. ${reference})` : ''}`);
    portal.notifyClient(current.client_id, { kind: 'pago', title: `Recibimos tu pago de ${price}`, body: current.concept, link: '/cliente/pagos' });
    return { payment: billing.decoratePayment(billing.getPaymentRow(current.id)) };
  });

  route('POST', '/api/client-payments/:id/void', 'invest', ({ user, body, params }) => {
    const current = billing.getPaymentRow(params.id);
    if (current.status !== 'pendiente') fail(409, 'payment_locked', { status: current.status });
    const reason = text(body.reason, 'reason', { max: 300, min: 5, required: true });
    db.prepare("UPDATE client_payments SET status = 'anulado', void_reason = ?, recorded_by = ?, updated_at = ? WHERE id = ?").run(reason, user.id, ctx.nowIso(), current.id);
    ctx.log(user.id, 'client', current.client_id, 'payment_voided', `${user.name} anuló el cobro "${current.concept}" de ${current.client_name}: ${reason}`);
    return { payment: billing.decoratePayment(billing.getPaymentRow(current.id)) };
  });

  /** Deshace un pago registrado por error: vuelve a "por pagar" y queda el motivo en la bitácora. */
  route('POST', '/api/client-payments/:id/reopen', 'invest', ({ user, body, params }) => {
    const current = billing.getPaymentRow(params.id);
    if (current.status !== 'pagado') fail(409, 'payment_locked', { status: current.status });
    const reason = text(body.reason, 'reason', { max: 300, min: 5, required: true });
    db.prepare("UPDATE client_payments SET status = 'pendiente', paid_date = NULL, reference = NULL, recorded_by = ?, updated_at = ? WHERE id = ?").run(user.id, ctx.nowIso(), current.id);
    ctx.log(user.id, 'client', current.client_id, 'payment_reopened', `${user.name} devolvió a "por pagar" el cobro "${current.concept}" de ${current.client_name}: ${reason}`);
    return { payment: billing.decoratePayment(billing.getPaymentRow(current.id)) };
  });
}
