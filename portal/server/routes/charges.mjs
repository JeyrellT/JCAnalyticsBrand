// ============================================================================
//  server/routes/charges.mjs
//  Cobros de los proyectos: pagos únicos y cobros recurrentes (semanal,
//  quincenal, mensual…). El calendario sale de shared/billing.js.
//
//    · Cualquiera del equipo ve los cobros de un proyecto (como su valor).
//    · Solo socios y admin los crean, editan o borran, y ven la vista general
//      /api/billing (recurrente al mes, cobros del mes, proyección y Excel).
//    · Suman en los totales solo los proyectos que cobran: en curso, en
//      revisión, entregados o en soporte, sin archivar.
// ============================================================================

import { BILLING_FREQUENCIES, occurrences, monthRange, shiftMonth, addDays, isActiveCharge, isRecurring } from '../../shared/billing.js';
import { PROJECT_STATUS } from '../../shared/catalog.js';
import { formatMoney } from '../../shared/finance.js';
import { fail, invalid, has, text, oneOf, dateOnly, minorAmount } from '../http.mjs';
import { createHelpers } from './common.mjs';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function chargeRoutes(route, ctx) {
  const { db } = ctx;
  const { chargeCRC, billingCounts, decorateCharge, chargesOf, decorateProject, getProjectFull } = createHelpers(ctx);
  const getProject = (projectId) => db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) ?? fail(404, 'not_found');
  const getCharge = (chargeId) => db.prepare('SELECT * FROM project_charges WHERE id = ?').get(chargeId) ?? fail(404, 'not_found');

  function readChargeBody(body, current, project) {
    const pick = (key, fn) => (has(body, key) ? fn(body[key]) : current[key] ?? null);
    const out = {
      concept: pick('concept', (v) => text(v, 'concept', { max: 120 })),
      amount: pick('amount', (v) => minorAmount(v, 'amount', { required: true })),
      currency: pick('currency', (v) => oneOf(v, 'currency', ['CRC', 'USD'], { fallback: project.currency ?? 'CRC' })) ?? project.currency ?? 'CRC',
      frequency: pick('frequency', (v) => oneOf(v, 'frequency', BILLING_FREQUENCIES, { required: true })),
      start_date: pick('start_date', (v) => dateOnly(v, 'start_date', { required: true })),
      end_date: pick('end_date', (v) => dateOnly(v, 'end_date')),
    };
    if (!out.amount) invalid('amount', 'Monto requerido.');
    if (!out.frequency) invalid('frequency', 'Elegí cada cuánto se cobra.');
    if (!out.start_date) invalid('start_date', 'Fecha requerida.');
    // Un pago único no tiene "hasta"; en uno recurrente, "hasta" no puede ser antes del primer cobro.
    if (out.frequency === 'unico') out.end_date = null;
    if (out.end_date && out.end_date < out.start_date) invalid('end_date', 'La fecha final es anterior al primer cobro.');
    return out;
  }

  const describe = (c) => `${formatMoney(c.amount, c.currency)} ${BILLING_FREQUENCIES[c.frequency].every}${c.concept ? ` (${c.concept})` : ''}`;
  /** Respuesta común de las escrituras: el proyecto con sus cobros y su resumen ya calculados. */
  const projectReply = (projectId, charge = null) => ({ ...(charge ? { charge: decorateCharge(charge) } : {}), project: decorateProject(getProjectFull(projectId)) });

  route('GET', '/api/projects/:id/charges', 'user', ({ params }) => ({ charges: chargesOf(getProject(params.id).id) }));

  route('POST', '/api/projects/:id/charges', 'invest', ({ user, body, params }) => {
    const project = getProject(params.id);
    const c = readChargeBody(body, {}, project);
    const at = ctx.nowIso();
    const { lastInsertRowid } = db.prepare(`INSERT INTO project_charges (project_id, concept, amount, currency, frequency, start_date, end_date, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(project.id, c.concept, c.amount, c.currency, c.frequency, c.start_date, c.end_date, user.id, at, at);
    const charge = getCharge(Number(lastInsertRowid));
    ctx.log(user.id, 'project', project.id, 'charge_created', `${user.name} agregó un cobro a ${project.name}: ${describe(charge)}`);
    return projectReply(project.id, charge);
  });

  route('PATCH', '/api/charges/:id', 'invest', ({ user, body, params }) => {
    const current = getCharge(params.id);
    const project = getProject(current.project_id);
    const c = readChargeBody(body, current, project);
    db.prepare(`UPDATE project_charges SET concept = ?, amount = ?, currency = ?, frequency = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?`)
      .run(c.concept, c.amount, c.currency, c.frequency, c.start_date, c.end_date, ctx.nowIso(), current.id);
    const charge = getCharge(current.id);
    ctx.log(user.id, 'project', project.id, 'charge_updated', `${user.name} cambió un cobro de ${project.name}: ${describe(charge)}`);
    return projectReply(project.id, charge);
  });

  route('DELETE', '/api/charges/:id', 'invest', ({ user, params }) => {
    const charge = getCharge(params.id);
    const project = getProject(charge.project_id);
    db.prepare('DELETE FROM project_charges WHERE id = ?').run(charge.id);
    ctx.log(user.id, 'project', project.id, 'charge_deleted', `${user.name} quitó un cobro de ${project.name}: ${describe(charge)}`);
    return projectReply(project.id);
  });

  // ── Vista general ─────────────────────────────────────────────────────────
  /** Todas las líneas con su proyecto y cliente; `counts` dice si suman en los totales. */
  function allCharges() {
    return db.prepare(`SELECT ch.*, p.name project_name, p.status project_status, p.archived project_archived, p.client_id,
        COALESCE(c.name, p.client) client_name
      FROM project_charges ch JOIN projects p ON p.id = ch.project_id LEFT JOIN clients c ON c.id = p.client_id
      ORDER BY COALESCE(c.name, p.client, p.name) COLLATE NOCASE, ch.start_date, ch.id`).all()
      .map((row) => ({ ...decorateCharge(row), counts: billingCounts({ status: row.project_status, archived: row.project_archived }) }));
  }

  /** Cada cobro que cae entre `from` y `to`, con su equivalente en colones, ordenado por fecha. */
  function calendar(charges, from, to) {
    return charges.filter((c) => c.counts).flatMap((c) => occurrences(c, from, to).map((date) => ({
      date, charge_id: c.id, project_id: c.project_id, project_name: c.project_name, client_id: c.client_id, client_name: c.client_name,
      concept: c.concept, frequency: c.frequency, amount: c.amount, currency: c.currency, amount_crc: chargeCRC(c.amount, c.currency) ?? 0,
    }))).sort((a, b) => a.date.localeCompare(b.date) || (a.client_name ?? '').localeCompare(b.client_name ?? '') || a.charge_id - b.charge_id);
  }
  const sumCRC = (items) => items.reduce((total, item) => total + item.amount_crc, 0);

  route('GET', '/api/billing', 'invest', ({ query }) => {
    const today = ctx.today();
    const current = today.slice(0, 7);
    const raw = query.get('month');
    if (raw && !MONTH_RE.test(raw)) invalid('month', 'Formato de mes AAAA-MM.');
    const month = raw ?? current;
    const charges = allCharges();
    const live = charges.filter((c) => c.counts && isActiveCharge(c, today));
    const recurring = live.filter(isRecurring);
    const monthly = recurring.reduce((total, c) => total + (chargeCRC(c.monthly_amount, c.currency) ?? 0), 0);
    const { from, to } = monthRange(month);
    const items = calendar(charges, from, to);
    return {
      today,
      month: { key: month, from, to, items, total_crc: sumCRC(items), pending_crc: sumCRC(items.filter((i) => i.date >= today)) },
      totals: {
        monthly_crc: monthly,
        annual_crc: monthly * 12,
        recurring_count: recurring.length,
        recurring_clients: new Set(recurring.map((c) => c.client_id ?? `p${c.project_id}`)).size,
        one_time_pending_crc: live.filter((c) => !isRecurring(c)).reduce((total, c) => total + (chargeCRC(c.amount, c.currency) ?? 0), 0),
        upcoming_30_crc: sumCRC(calendar(charges, today, addDays(today, 30))),
      },
      // Lo que se espera cobrar en los próximos 6 meses (recurrente + pagos únicos), mes por mes.
      projection: Array.from({ length: 6 }, (_, i) => {
        const key = shiftMonth(current, i);
        const range = monthRange(key);
        const list = calendar(charges, range.from, range.to);
        return { month: key, total_crc: sumCRC(list), count: list.length };
      }),
      charges: charges.map((c) => ({ ...c, project_status_label: PROJECT_STATUS[c.project_status]?.label ?? c.project_status })),
      fx_usd_crc: ctx.numberSetting('fx_usd_crc', 515),
    };
  });

  // ── Excel: calendario de cobros de los próximos 12 meses (separador ; y BOM UTF-8) ──
  route('GET', '/api/billing/export.csv', 'invest', ({ user, res }) => {
    const today = ctx.today();
    const { to } = monthRange(shiftMonth(today.slice(0, 7), 11));
    const rows = calendar(allCharges(), today, to);
    const dec = (minor) => (minor / 100).toFixed(2).replace('.', ',');
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita inyección de fórmulas en Excel
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Fecha', 'Cliente', 'Proyecto', 'Concepto', 'Frecuencia', 'Monto', 'Moneda', 'Equivalente CRC'];
    const lines = rows.map((r) => [r.date, r.client_name, r.project_name, r.concept, BILLING_FREQUENCIES[r.frequency].label, dec(r.amount), r.currency, dec(r.amount_crc)].map(cell).join(';'));
    ctx.log(user.id, 'project', null, 'billing_exported', `${user.name} exportó ${rows.length} cobros proyectados a Excel`);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cobros-${today}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.end(`\uFEFF${[header.join(';'), ...lines].join('\r\n')}\r\n`);
  });
}
