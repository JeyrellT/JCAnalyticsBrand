import { SERVICES } from '../../shared/catalog.js';
import { SERVICE_PRICING } from '../../shared/service-pricing.js';
import { toCRC } from '../../shared/finance.js';
import { allocateExact, costPlanMetrics, isCampaign, monthBounds } from '../../shared/business-finance.js';
import { createBusinessFinance, FINANCE_CATEGORIES, parseYear, parseMonth } from '../finance.mjs';
import { fail, invalid, has, text, oneOf, dateOnly, id, minorAmount, number } from '../http.mjs';
import { transaction } from '../schema.mjs';
import { createMoney } from './investments.mjs';

export function financeRoutes(route, ctx) {
  const { db } = ctx;
  const finance = createBusinessFinance(ctx);
  const money = createMoney(ctx);
  const yearOf = (value) => parseYear(value, ctx.today());
  const date = (value, field = 'date') => {
    const valueDate = dateOnly(value, field, { required: true });
    if (valueDate > ctx.today()) invalid(field, 'La fecha no puede ser futura.');
    return valueDate;
  };
  const service = (value) => value == null || value === '' ? null : oneOf(value, 'service_key', SERVICES, { required: true });
  const rowId = (table, value, field) => {
    const result = id(value, field);
    if (result && !db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(result)) invalid(field, 'Registro no encontrado.');
    return result;
  };
  const getEntry = (entryId) => finance.entries().find((row) => row.id === entryId) ?? fail(404, 'not_found');
  function readEntry(body, current = {}) {
    const merged = { ...current, ...body };
    const kind = oneOf(merged.kind, 'kind', ['revenue', 'expense'], { required: true });
    const amount = minorAmount(merged.amount, 'amount', { required: true });
    const currency = oneOf(merged.currency, 'currency', ['CRC', 'USD'], { required: true });
    const fx = currency === 'USD' ? number(merged.fx_rate, 'fx_rate', { required: true, min: 100, max: 2000 }) : null;
    const amountCrc = toCRC(amount, currency, fx);
    if (!Number.isSafeInteger(amountCrc)) invalid('amount', 'Monto fuera de rango.');
    const effectiveDate = date(merged.date);
    const paid = kind === 'revenue' ? true : merged.paid ?? false;
    if (typeof paid !== 'boolean') invalid('paid', 'Indicá si el gasto está pagado.');
    const paidDate = kind === 'revenue' ? effectiveDate : paid ? date(merged.paid_date || effectiveDate, 'paid_date') : null;
    if (paidDate && paidDate < effectiveDate) invalid('paid_date', 'El pago debe ser igual o posterior al registro del costo.');
    let rawAllocations = has(body, 'allocations') ? body.allocations : current.allocations;
    const dimensionsChanged = ['service_key', 'project_id', 'investment_id'].some((key) => has(body, key));
    if (!has(body, 'allocations') && (!rawAllocations || dimensionsChanged || (current.allocations?.length === 1 && has(body, 'amount')))) {
      rawAllocations = [{ amount, service_key: merged.service_key, project_id: merged.project_id, investment_id: merged.investment_id }];
    }
    if (!Array.isArray(rawAllocations) || !rawAllocations.length || rawAllocations.length > 100) invalid('allocations', 'Elegí entre 1 y 100 asignaciones.');
    const allocations = rawAllocations.map((part) => {
      if (!part || typeof part !== 'object') invalid('allocations', 'Asignación inválida.');
      return { amount: minorAmount(part.amount, 'allocations', { required: true }), service_key: service(part.service_key),
        project_id: rowId('projects', part.project_id, 'project_id'), investment_id: rowId('investments', part.investment_id, 'investment_id') };
    });
    if (allocations.reduce((sum, part) => sum + part.amount, 0) !== amount) invalid('allocations', 'Las asignaciones deben sumar exactamente el monto del registro.');
    const crcParts = allocateExact(amountCrc, allocations.map((part) => part.amount));
    return { kind, category: oneOf(merged.category, 'category', FINANCE_CATEGORIES, { required: true }), amount, currency, fx_rate: fx,
      amount_crc: amountCrc, date: effectiveDate, paid, paid_date: paidDate,
      description: text(merged.description, 'description', { required: true, min: 3, max: 1000 }), reference: text(merged.reference, 'reference', { max: 120 }),
      allocations: allocations.map((part, index) => ({ ...part, amount_crc: crcParts[index] })) };
  }
  function replaceAllocations(entryId, allocations) {
    db.prepare('DELETE FROM finance_allocations WHERE entry_id = ?').run(entryId);
    const insert = db.prepare('INSERT INTO finance_allocations (entry_id, amount, amount_crc, service_key, project_id, investment_id) VALUES (?, ?, ?, ?, ?, ?)');
    for (const part of allocations) insert.run(entryId, part.amount, part.amount_crc, part.service_key, part.project_id, part.investment_id);
  }
  route('GET', '/api/finance/overview', 'invest', ({ query }) => finance.overview(yearOf(query.get('year'))));
  route('GET', '/api/finance/entries', 'invest', ({ query }) => {
    const year = query.has('year') ? yearOf(query.get('year')) : null;
    const kind = oneOf(query.get('kind'), 'kind', ['revenue', 'expense']);
    return { entries: finance.entries().filter((row) => (!year || row.date.startsWith(String(year))) && (!kind || row.kind === kind)) };
  });
  route('POST', '/api/finance/entries', 'admin', ({ user, body }) => {
    const entry = readEntry(body);
    if (finance.periodLocked(entry.date, entry.allocations)) fail(409, 'closed_period');
    const entryId = transaction(db, () => {
      const at = ctx.nowIso();
      const newId = Number(db.prepare(`INSERT INTO finance_entries (kind, category, amount, currency, fx_rate, amount_crc, date, paid, paid_date, description, reference, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(entry.kind, entry.category, entry.amount, entry.currency, entry.fx_rate, entry.amount_crc,
        entry.date, Number(entry.paid), entry.paid_date, entry.description, entry.reference, user.id, at, at).lastInsertRowid);
      replaceAllocations(newId, entry.allocations);
      ctx.log(user.id, 'finance_entry', newId, 'created', `Registro financiero #${newId}: ${entry.kind}, ${entry.amount} unidades menores ${entry.currency}.`, { sensitive: true });
      return newId;
    });
    return { entry: getEntry(entryId) };
  });
  route('PATCH', '/api/finance/entries/:id', 'admin', ({ user, body, params }) => {
    const current = getEntry(params.id);
    if (current.status !== 'active') fail(409, 'entry_void');
    const entry = readEntry(body, current);
    const onlyPayment = Object.keys(body).every((key) => ['paid', 'paid_date', 'reference'].includes(key));
    if ((!onlyPayment && finance.periodLocked(current.date, current.allocations)) || (!onlyPayment && finance.periodLocked(entry.date, entry.allocations))
      || (onlyPayment && entry.paid_date && finance.periodLocked(entry.paid_date, entry.allocations))
      || (onlyPayment && current.paid_date && finance.periodLocked(current.paid_date, current.allocations))) fail(409, 'closed_period');
    transaction(db, () => {
      db.prepare(`UPDATE finance_entries SET kind=?, category=?, amount=?, currency=?, fx_rate=?, amount_crc=?, date=?, paid=?, paid_date=?, description=?, reference=?, updated_at=? WHERE id=?`)
        .run(entry.kind, entry.category, entry.amount, entry.currency, entry.fx_rate, entry.amount_crc, entry.date, Number(entry.paid), entry.paid_date, entry.description, entry.reference, ctx.nowIso(), current.id);
      replaceAllocations(current.id, entry.allocations);
      ctx.log(user.id, 'finance_entry', current.id, 'updated', `Registro #${current.id}: ${current.amount} ${current.currency} → ${entry.amount} ${entry.currency}; pagado ${current.paid} → ${entry.paid}.`, { sensitive: true });
    });
    return { entry: getEntry(current.id) };
  });
  route('POST', '/api/finance/entries/:id/void', 'admin', ({ user, body, params }) => {
    const current = getEntry(params.id);
    const reason = text(body.reason, 'reason', { required: true, min: 3, max: 500 });
    if (finance.periodLocked(current.date, current.allocations)) fail(409, 'closed_period');
    if (current.status !== 'active') fail(409, 'entry_void');
    transaction(db, () => {
      db.prepare("UPDATE finance_entries SET status='void', void_reason=?, updated_at=? WHERE id=?").run(reason, ctx.nowIso(), current.id);
      ctx.log(user.id, 'finance_entry', current.id, 'voided', `Anuló registro #${current.id}: ${reason}`, { sensitive: true });
    });
    return { entry: getEntry(current.id) };
  });

  const decoratePlan = (row) => { const plan = { ...row, costs: JSON.parse(row.costs_json) }; delete plan.costs_json; return { ...plan, ...costPlanMetrics(plan) }; };
  function readPlan(body, current = {}) {
    const merged = { ...current, ...body };
    if (!Array.isArray(merged.costs) || merged.costs.length > 100) invalid('costs', 'Lista de costos inválida.');
    const units = number(merged.units, 'units', { required: true, min: 1, max: 100000 });
    const margin = number(merged.margin_bps, 'margin_bps', { required: true, min: 0, max: 9500 });
    if (!Number.isInteger(units) || !Number.isInteger(margin)) invalid('units', 'Unidades y puntos base deben ser enteros.');
    const plan = { name: text(merged.name, 'name', { required: true, min: 2, max: 120 }), service_key: service(merged.service_key),
      currency: oneOf(merged.currency, 'currency', ['CRC', 'USD'], { required: true }), units,
      price_per_unit: minorAmount(merged.price_per_unit, 'price_per_unit', { required: true, allowZero: true }), margin_bps: margin,
      costs: merged.costs.map((item) => ({ label: text(item.label, 'costs', { required: true, min: 2, max: 120 }),
        category: oneOf(item.category, 'costs', FINANCE_CATEGORIES, { required: true }), amount: minorAmount(item.amount, 'costs', { required: true, allowZero: true }) })) };
    try { costPlanMetrics(plan); } catch { invalid('costs', 'El cálculo excede el rango permitido.'); }
    return plan;
  }
  route('GET', '/api/finance/costing', 'invest', () => ({ plans: db.prepare('SELECT * FROM finance_cost_plans ORDER BY updated_at DESC, id DESC').all().map(decoratePlan),
    reference_prices: Object.entries(SERVICE_PRICING).map(([key, value]) => ({ key, name: SERVICES[key] ?? key, ...value })) }));
  route('POST', '/api/finance/costing', 'admin', ({ user, body }) => {
    const plan = readPlan(body); const at = ctx.nowIso();
    const planId = Number(db.prepare(`INSERT INTO finance_cost_plans (name, service_key, currency, units, price_per_unit, margin_bps, costs_json, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(plan.name, plan.service_key, plan.currency, plan.units, plan.price_per_unit, plan.margin_bps, JSON.stringify(plan.costs), user.id, at, at).lastInsertRowid);
    ctx.log(user.id, 'finance_plan', planId, 'created', `Creó costeo planificado: ${plan.name}.`, { sensitive: true });
    return { plan: decoratePlan(db.prepare('SELECT * FROM finance_cost_plans WHERE id=?').get(planId)) };
  });
  route('PATCH', '/api/finance/costing/:id', 'admin', ({ user, body, params }) => {
    const current = db.prepare('SELECT * FROM finance_cost_plans WHERE id=?').get(params.id) ?? fail(404, 'not_found');
    const plan = readPlan(body, decoratePlan(current));
    db.prepare('UPDATE finance_cost_plans SET name=?, service_key=?, currency=?, units=?, price_per_unit=?, margin_bps=?, costs_json=?, updated_at=? WHERE id=?')
      .run(plan.name, plan.service_key, plan.currency, plan.units, plan.price_per_unit, plan.margin_bps, JSON.stringify(plan.costs), ctx.nowIso(), current.id);
    ctx.log(user.id, 'finance_plan', current.id, 'updated', `Actualizó costeo planificado: ${plan.name}.`, { sensitive: true });
    return { plan: decoratePlan(db.prepare('SELECT * FROM finance_cost_plans WHERE id=?').get(current.id)) };
  });

  route('GET', '/api/finance/policies/:id', 'invest', ({ params, query }) => ({ policy: finance.policy(finance.investment(params.id).id, yearOf(query.get('year'))) }));
  route('PUT', '/api/finance/policies/:id', 'admin', ({ user, body, params }) => {
    const inv = finance.investment(params.id);
    if (!isCampaign(inv)) fail(409, 'not_campaign');
    const year = yearOf(body.year); const current = finance.policy(inv.id, year);
    if (current.closed_at) fail(409, 'closed_period');
    if (typeof body.configured !== 'boolean') invalid('configured', 'Confirmá si el acuerdo está configurado.');
    const rate = number(body.rate_bps ?? 2000, 'rate_bps', { required: true, min: 1, max: 10000 });
    if (!Number.isInteger(rate)) invalid('rate_bps', 'Los puntos base deben ser enteros.');
    if (!Array.isArray(body.beneficiary_ids) || body.beneficiary_ids.length > 1000) invalid('beneficiary_ids', 'Elegí los beneficiarios del acuerdo.');
    const beneficiaries = [...new Set(body.beneficiary_ids.map((value) => {
      if (!Number.isSafeInteger(value) || value <= 0 || !db.prepare("SELECT 1 FROM users WHERE id=? AND role IN ('admin','socio','inversionista')").get(value)) invalid('beneficiary_ids', 'Beneficiario inválido.');
      return value;
    }))].sort((a, b) => a - b);
    if (body.configured && !beneficiaries.length) invalid('beneficiary_ids', 'Elegí al menos un beneficiario explícito.');
    const reserve = minorAmount(body.reserve_amount ?? 0, 'reserve_amount', { allowZero: true });
    const reviewed = body.costs_reviewed_through ? date(body.costs_reviewed_through, 'costs_reviewed_through') : null;
    const fx = inv.currency === 'USD' ? number(body.fx_rate, 'fx_rate', { required: body.configured, min: 100, max: 2000 }) : null;
    const priorRun = db.prepare('SELECT 1 FROM finance_distributions WHERE investment_id=? AND year=?').get(inv.id, year);
    if (priorRun && (rate !== current.rate_bps || fx !== current.fx_rate || current.beneficiary_ids.some((value) => !beneficiaries.includes(value)))) fail(409, 'policy_locked');
    transaction(db, () => {
      db.prepare(`INSERT INTO finance_policies (investment_id, year, configured, rate_bps, beneficiary_ids, reserve_amount, costs_reviewed_through, fx_rate, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(investment_id, year) DO UPDATE SET configured=excluded.configured, rate_bps=excluded.rate_bps,
        beneficiary_ids=excluded.beneficiary_ids, reserve_amount=excluded.reserve_amount, costs_reviewed_through=excluded.costs_reviewed_through, fx_rate=excluded.fx_rate, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
        .run(inv.id, year, Number(body.configured), rate, JSON.stringify(beneficiaries), reserve, reviewed, fx, user.id, ctx.nowIso());
      ctx.log(user.id, 'investment', inv.id, 'profit_policy_updated', `Acuerdo anual ${year}: ${rate} puntos base; beneficiarios [${beneficiaries.join(', ')}].`, { sensitive: true });
    });
    return { policy: finance.policy(inv.id, year) };
  });
  route('GET', '/api/finance/distributions/preview', 'invest', ({ query }) => finance.preview(id(query.get('investment_id'), 'investment_id', { required: true }), parseMonth(query.get('month')), {
    profit_amount: query.has('profit_amount') ? minorAmount(query.get('profit_amount'), 'profit_amount', { allowZero: true }) : undefined,
    capital_amount: query.has('capital_amount') ? minorAmount(query.get('capital_amount'), 'capital_amount', { allowZero: true }) : undefined,
  }));
  const distribution = (row) => {
    const inv = finance.investment(row.investment_id);
    const items = db.prepare(`SELECT m.id,m.partner_id,u.name partner_name,m.return_kind,m.amount,m.status FROM finance_distribution_items d
      JOIN movements m ON m.id=d.movement_id JOIN users u ON u.id=m.partner_id WHERE d.distribution_id=? ORDER BY m.partner_id,m.id`).all(row.id);
    const safe = { ...row }; delete safe.request_json; delete safe.snapshot_json;
    return { ...safe, investment_name: inv.name, currency: inv.currency, movements: items };
  };
  route('GET', '/api/finance/distributions', 'invest', ({ query }) => {
    const investmentId = id(query.get('investment_id'), 'investment_id'); const year = query.has('year') ? yearOf(query.get('year')) : null;
    return { distributions: db.prepare('SELECT * FROM finance_distributions ORDER BY created_at DESC,id DESC').all()
      .filter((row) => (!investmentId || row.investment_id === investmentId) && (!year || row.year === year)).map(distribution) };
  });
  route('POST', '/api/finance/distributions', 'admin', ({ user, body }) => {
    if (body.acknowledge_sent !== true) invalid('acknowledge_sent', 'Confirmá que el envío realmente se realizó.');
    const investmentId = id(body.investment_id, 'investment_id', { required: true });
    const month = parseMonth(body.month); const sentDate = date(body.date);
    if (sentDate <= monthBounds(month).end) invalid('date', 'El envío de este anticipo debe ser posterior al mes terminado.');
    const profitAmount = minorAmount(body.profit_amount, 'profit_amount', { required: true, allowZero: true });
    const capitalAmount = minorAmount(body.capital_amount, 'capital_amount', { required: true, allowZero: true });
    if (!profitAmount && !capitalAmount) invalid('amount', 'El envío debe tener un monto positivo.');
    const message = text(body.message, 'message', { required: true, min: 3, max: 1000 });
    const reference = text(body.reference, 'reference', { max: 80 });
    const key = text(body.idempotency_key, 'idempotency_key', { required: true, min: 8, max: 100 });
    const requestJson = JSON.stringify({ investmentId, month, sentDate, profitAmount, capitalAmount, message, reference });
    const existing = db.prepare('SELECT * FROM finance_distributions WHERE idempotency_key=?').get(key);
    if (existing) {
      if (existing.request_json !== requestJson) fail(409, 'idempotency_conflict');
      return { distribution: distribution(existing), movements: distribution(existing).movements };
    }
    const created = [];
    const runId = transaction(db, () => {
      const view = finance.preview(investmentId, month, { profit_amount: profitAmount, capital_amount: capitalAmount });
      if (view.blockers.length) fail(409, view.blockers[0].code, { message: view.blockers[0].message, blockers: view.blockers });
      if (body.preview_token !== view.preview_token) fail(409, 'stale_preview');
      const inv = finance.investment(investmentId);
      const newId = Number(db.prepare(`INSERT INTO finance_distributions (investment_id,year,month,date,profit_amount,capital_amount,message,reference,idempotency_key,request_json,snapshot_json,created_by,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(inv.id, view.year, month, sentDate, profitAmount, capitalAmount, message, reference, key, requestJson, JSON.stringify(view), user.id, ctx.nowIso()).lastInsertRowid);
      for (const period of view.periods) db.prepare('INSERT OR IGNORE INTO finance_month_weights (investment_id,month,weights_json,created_at) VALUES (?,?,?,?)').run(inv.id, period.month, JSON.stringify(period.weights), ctx.nowIso());
      for (const payment of view.payments) {
        const partner = db.prepare('SELECT * FROM users WHERE id=?').get(payment.partner_id);
        for (const kind of ['profit', 'capital']) {
          const amount = payment[`${kind}_amount`];
          if (!amount) continue;
          const movement = money.insertMovement({ investment: inv, partner, type: 'retorno', returnKind: kind, financeDistribution: true, amount,
            fxRate: view.policy.fx_rate, date: sentDate, message: `${kind === 'profit' ? 'Anticipo de ganancia' : 'Devolución de capital'} · ${month}. ${message}`, reference, batchId: `finance-${newId}`, user });
          db.prepare('INSERT INTO finance_distribution_items (distribution_id,partner_id,return_kind,amount,movement_id) VALUES (?,?,?,?,?)').run(newId, partner.id, kind, amount, movement.id);
          created.push({ movement, investment: inv });
        }
      }
      ctx.log(user.id, 'investment', inv.id, 'distribution_recorded', `Envío declarado #${newId}, período ${month}: ganancia ${profitAmount}, capital ${capitalAmount} (${inv.currency}, unidades menores).`, { sensitive: true });
      return newId;
    });
    for (const row of created) money.announce(row.movement, row.investment, user);
    return { distribution: distribution(db.prepare('SELECT * FROM finance_distributions WHERE id=?').get(runId)), movements: created.map((row) => row.movement) };
  });
  route('POST', '/api/finance/policies/:id/close', 'admin', ({ user, body, params }) => {
    const year = yearOf(body.year); const reason = text(body.reason, 'reason', { required: true, min: 3, max: 500 });
    if (`${year}-12-31` >= ctx.today()) fail(409, 'year_not_finished');
    const view = finance.preview(params.id, `${year}-12`);
    if (view.blockers.length) fail(409, view.blockers[0].code, { message: view.blockers[0].message });
    const unsettled = db.prepare(`SELECT 1 FROM movements m LEFT JOIN finance_distribution_items d ON d.movement_id=m.id
      LEFT JOIN finance_distributions r ON r.id=d.distribution_id WHERE m.investment_id=? AND m.type='retorno'
      AND COALESCE(r.year,CAST(substr(m.date,1,4) AS INTEGER))=? AND m.status IN ('pendiente','objetado')`).get(params.id, year);
    if (unsettled) fail(409, 'pending_settlements');
    if (view.totals.profit_unsettled > 0) fail(409, 'unsettled_profit', { message: 'Registrá y confirmá el ajuste final de ganancia antes de cerrar el año. Si falta caja, el saldo sigue pendiente.' });
    const adjustment = { year, reason, closed_at: ctx.nowIso(), totals: view.totals, partners: view.partners,
      carryforward_by_partner: Object.fromEntries(view.partners.filter((row) => row.overpaid > 0).map((row) => [row.id, row.overpaid])) };
    transaction(db, () => {
      db.prepare('UPDATE finance_policies SET closed_at=?,close_snapshot=?,updated_by=?,updated_at=? WHERE investment_id=? AND year=?')
        .run(adjustment.closed_at, JSON.stringify(adjustment), user.id, ctx.nowIso(), params.id, year);
      ctx.log(user.id, 'investment', params.id, 'profit_year_closed', `Cierre anual ${year}: ${reason}`, { sensitive: true });
    });
    return { policy: finance.policy(params.id, year), adjustment };
  });
}
