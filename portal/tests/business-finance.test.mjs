import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateExact, annualEntitlements, capitalDayWeights, costPlanMetrics } from '../shared/business-finance.js';
import { investmentMetrics } from '../shared/finance.js';
import { startServer } from './helpers.mjs';

test('capital-días: devolución mixta reduce principal desde la fecha efectiva; aportes tardíos no ganan meses anteriores', () => {
  const rows = [
    { partner_id: 1, type: 'aporte', amount: 1000, status: 'confirmado', date: '2026-01-01' },
    { partner_id: 1, type: 'retorno', amount: 600, return_kind: 'mixed', return_capital_amount: 500, return_profit_amount: 100, status: 'confirmado', date: '2026-01-16' },
    { partner_id: 2, type: 'aporte', amount: 9000, status: 'confirmado', date: '2026-02-01' },
  ];
  assert.deepEqual(capitalDayWeights(rows, '2026-01', [1, 2]), { 1: '23000', 2: '0' });
  const metric = investmentMetrics(rows);
  assert.equal(metric.returned, 600); assert.equal(metric.capital_returned, 500); assert.equal(metric.profit_returned, 100);
  assert.equal(metric.outstanding_capital, 9500);
  assert.equal(investmentMetrics([...rows, { partner_id: 1, type: 'retorno', amount: 50, status: 'confirmado', date: '2026-03-01' }]).outstanding_capital, null);
});

test('pool anual arrastra pérdidas y pondera utilidad de cada mes, no cantidad de meses', () => {
  const a = annualEntitlements([{ net_profit: -1000, weights: { 1: '31' } }, { net_profit: 5000, weights: { 1: '28' } }], [1], 2000);
  assert.equal(a.pool, 800); assert.equal(a.entitlements[1], 800);
  const b = annualEntitlements([{ net_profit: 9000, weights: { 1: '31', 2: '0' } }, { net_profit: 1000, weights: { 1: '0', 2: '28' } }], [1, 2], 2000);
  assert.deepEqual(b.entitlements, { 1: 1800, 2: 200 });
  assert.equal(annualEntitlements([{ net_profit: 1000, weights: { 1: '1' } }], [1], 2000, 200).pool, 160);
  assert.deepEqual(allocateExact(100, ['999999999999999999', '999999999999999999', '999999999999999999']), [34, 33, 33]);
  const late = annualEntitlements([{ net_profit: 10000, weights: { 1: '0' } }, { net_profit: 10000, weights: { 1: '280000' } }], [1], 2000);
  assert.equal(late.pool, 4000); assert.equal(late.entitlements[1], 2000); assert.equal(late.unassigned_pool, 2000);
  const lateLoss = annualEntitlements([{ net_profit: 10000, weights: { 1: '0' } }, { net_profit: 10000, weights: { 1: '280000' } }, { net_profit: -10000, weights: { 1: '310000' } }], [1], 2000, 5000);
  assert.equal(lateLoss.pool, 1000); assert.equal(lateLoss.entitlements[1], 500); assert.equal(lateLoss.unassigned_pool, 500);
});

test('costeo usa margen sobre venta, y costos planificados no son cobros', () => {
  const plan = costPlanMetrics({ units: 2, price_per_unit: 10000, margin_bps: 2500, costs: [{ amount: 12000 }] });
  assert.equal(plan.unit_cost, 6000); assert.equal(plan.suggested_unit_price, 8000);
  assert.equal(plan.projected_profit, 8000); assert.equal(plan.actual_margin_bps, 4000);
  assert.throws(() => costPlanMetrics({ units: 1, price_per_unit: 0, margin_bps: 9500, costs: [{ amount: 1_000_000_000_000_000 }] }), /amount_overflow/);
});

async function environment(t, startAt = Date.parse('2026-10-10T15:00:00Z')) {
  const env = await startServer({ startAt }); t.after(env.close);
  const ids = { admin: env.addUser('admin@finance.test', 'Admin', 'admin'), partner: env.addUser('partner@finance.test', 'Socio', 'socio'), investor: env.addUser('investor@finance.test', 'Inversionista', 'inversionista'), worker: env.addUser('worker@finance.test', 'Equipo', 'colaborador') };
  const api = {};
  for (const role of Object.keys(ids)) { api[role] = env.client(); await api[role].login(`${role}@finance.test`); }
  const post = async (path, body) => { const res = await api.admin.post(path, body); assert.equal(res.status, 200, JSON.stringify(res.data)); return res.data; };
  const inv = (await post('/api/investments', { name: 'Campaña de prueba', category: 'meta_ads', currency: 'CRC' })).investment;
  await api.admin.call('PUT', `/api/investments/${inv.id}/access`, { allowed_investor_ids: [ids.investor] });
  const contribute = async (who, amount, date = '2026-01-01') => {
    const { movement } = await post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids[who], amount, date, message: 'Aporte comprobado para prueba' });
    const path = who === 'investor' ? '/api/investor/movements' : '/api/movements';
    assert.equal((await api[who].post(`${path}/${movement.id}/confirm`, {})).status, 200);
    return movement;
  };
  const ledger = (kind, amount, date, extra = {}) => post('/api/finance/entries', { kind, category: kind === 'revenue' ? 'sale' : 'ads', amount, currency: 'CRC', date, paid: true, description: 'Dato de prueba aislada', investment_id: inv.id, ...extra });
  const policy = async (year = 2026, extra = {}) => {
    const res = await api.admin.call('PUT', `/api/finance/policies/${inv.id}`, { year, configured: true, rate_bps: 2000, beneficiary_ids: [ids.partner, ids.investor], reserve_amount: 0, costs_reviewed_through: `${year}-09-30`, ...extra });
    assert.equal(res.status, 200, JSON.stringify(res.data)); return res.data.policy;
  };
  const preview = async (month = '2026-01', profit, capital) => {
    const res = await api.admin.get(`/api/finance/distributions/preview?investment_id=${inv.id}&month=${month}${profit == null ? '' : `&profit_amount=${profit}`}${capital == null ? '' : `&capital_amount=${capital}`}`);
    assert.equal(res.status, 200, JSON.stringify(res.data)); return res.data;
  };
  const send = async (view, profit, capital = 0, date = '2026-02-05', key = `fixture-${view.month}-${profit}-${capital}`) => api.admin.post('/api/finance/distributions', { investment_id: inv.id, month: view.month, profit_amount: profit, capital_amount: capital, date, message: 'Envío de prueba realizado', acknowledge_sent: true, preview_token: view.preview_token, idempotency_key: key });
  return { ...env, ids, api, post, inv, contribute, ledger, policy, preview, send };
}

test('libro: permisos, asignación exacta, cuentas por pagar y correcciones auditadas', async (t) => {
  const w = await environment(t);
  for (const who of ['investor', 'worker']) assert.equal((await w.api[who].get('/api/finance/overview')).status, 403);
  assert.equal((await w.api.partner.get('/api/finance/overview')).status, 200);
  assert.equal((await w.api.partner.post('/api/finance/entries', {})).status, 403);
  await w.ledger('revenue', 10000, '2026-01-15');
  const { entry } = await w.ledger('expense', 3000, '2026-01-16', { paid: false });
  let result = (await w.api.admin.get('/api/finance/overview?year=2026')).data;
  assert.equal(result.totals.net_profit_crc, 7000); assert.equal(result.totals.cash_operating_crc, 10000); assert.equal(result.totals.unpaid_expenses_crc, 3000);
  assert.equal((await w.api.admin.patch(`/api/finance/entries/${entry.id}`, { paid: true, paid_date: '2026-02-01' })).status, 200);
  result = (await w.api.admin.get('/api/finance/overview?year=2026')).data;
  assert.equal(result.totals.net_profit_crc, 7000); assert.equal(result.totals.cash_operating_crc, 7000);
  assert.equal((await w.api.admin.post('/api/finance/entries', { kind: 'expense', category: 'ads', amount: 100, currency: 'CRC', date: '2026-01-01', description: 'Incorrecto', allocations: [{ amount: 99 }] })).status, 400);
  await w.post('/api/finance/costing', { name: 'Plan sin efectos reales', service_key: 'pagina_web', currency: 'CRC', units: 1, price_per_unit: 20000, margin_bps: 3000, costs: [{ label: 'Trabajo', category: 'labor', amount: 10000 }] });
  assert.equal((await w.api.admin.get('/api/finance/overview?year=2026')).data.totals.net_profit_crc, 7000);
  const split = await w.ledger('expense', 100, '2026-03-01', { allocations: [{ amount: 33, investment_id: w.inv.id }, { amount: 67, service_key: 'pagina_web' }] });
  assert.equal(split.entry.allocations.length, 2, 'las asignaciones explícitas prevalecen sobre investment_id superior');
  assert.deepEqual(split.entry.allocations.map((row) => row.amount), [33, 67]);
});

test('reparto reserva pendientes/objetados, bloquea bypass e impide repetir principal confirmado después del corte', async (t) => {
  const w = await environment(t); await w.contribute('investor', 10000); await w.ledger('revenue', 100000, '2026-01-20'); await w.ledger('expense', 20000, '2026-01-21'); await w.policy();
  const before = await w.preview('2026-01', 16000, 10000);
  assert.equal(before.totals.annual_pool, 16000); assert.equal(before.blockers.length, 0);
  assert.equal((await w.api.admin.post(`/api/investments/${w.inv.id}/distribute`, { amount: 100, message: 'Bypass de prueba' })).status, 409);
  assert.equal((await w.api.admin.post(`/api/investments/${w.inv.id}/movements`, { type: 'retorno', partner_id: w.ids.investor, amount: 100, message: 'Bypass de prueba' })).status, 409);
  const sent = await w.send(before, 16000, 10000); assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal(sent.data.movements.length, 2);
  const duplicate = await w.send(before, 16000, 10000); assert.equal(duplicate.data.distribution.id, sent.data.distribution.id);
  const profit = sent.data.movements.find((m) => m.return_kind === 'profit');
  const capital = sent.data.movements.find((m) => m.return_kind === 'capital');
  await w.api.investor.post(`/api/investor/movements/${profit.id}/object`, { message: 'Necesito revisar el comprobante' });
  await w.api.investor.post(`/api/investor/movements/${capital.id}/confirm`, {});
  const again = await w.preview('2026-01', 0, 0);
  assert.equal(again.totals.profit_available, 0); assert.equal(again.totals.capital_available, 0);
  assert.equal(again.partners.find((p) => p.id === w.ids.investor).capital_reserved, 10000);
  assert.equal((await w.api.admin.post('/api/finance/entries', { kind: 'expense', category: 'ads', amount: 100, currency: 'CRC', date: '2026-01-25', description: 'Corrección retroactiva', investment_id: w.inv.id })).data.error, 'closed_period');
});

test('pérdida posterior y recuperación no duplican pagos; financiación tardía no obtiene utilidad anterior', async (t) => {
  const w = await environment(t); await w.contribute('partner', 10000); await w.ledger('revenue', 100000, '2026-01-20'); await w.policy();
  const jan = await w.preview('2026-01', 20000, 0); const sent = await w.send(jan, 20000); assert.equal(sent.status, 200, JSON.stringify(sent.data));
  await w.api.partner.post(`/api/movements/${sent.data.movements[0].id}/confirm`, {});
  await w.contribute('investor', 90000, '2026-02-01'); await w.ledger('expense', 150000, '2026-02-15');
  assert.equal((await w.preview('2026-02', 0, 0)).totals.overpaid, 20000);
  await w.ledger('revenue', 100000, '2026-03-15');
  const mar = await w.preview('2026-03', 0, 0); assert.equal(mar.totals.annual_pool, 10000); assert.equal(mar.totals.profit_available, 0);
  assert.equal((await w.preview('2026-01', 0, 0)).partners.find((p) => p.id === w.ids.investor).profit_entitlement, 0);
});

test('diciembre pagado en enero reserva el año del período; cierre exige confirmar el ajuste', async (t) => {
  const w = await environment(t, Date.parse('2027-02-10T15:00:00Z')); await w.contribute('investor', 10000); await w.ledger('revenue', 10000, '2026-12-15'); await w.policy(2026, { costs_reviewed_through: '2026-12-31' });
  assert.equal((await w.api.admin.post(`/api/finance/policies/${w.inv.id}/close`, { year: 2026, reason: 'Cierre de prueba' })).data.error, 'unsettled_profit');
  const before = await w.preview('2026-12', 2000, 0); const sent = await w.send(before, 2000, 0, '2027-01-05'); assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal((await w.preview('2026-12', 0, 0)).totals.profit_reserved, 2000);
  assert.equal((await w.api.admin.post(`/api/finance/policies/${w.inv.id}/close`, { year: 2026, reason: 'Cierre de prueba' })).data.error, 'pending_settlements');
  await w.api.investor.post(`/api/investor/movements/${sent.data.movements[0].id}/confirm`, {});
  assert.equal((await w.api.admin.post(`/api/finance/policies/${w.inv.id}/close`, { year: 2026, reason: 'Cierre revisado' })).status, 200);
  assert.equal((await w.api.admin.post(`/api/movements/${sent.data.movements[0].id}/annul`, { message: 'Cambio retroactivo inválido' })).data.error, 'closed_period');
});

test('retorno histórico mixto: clasificación explícita, una sola vez, campos privados y revisión aunque sea posterior al corte', async (t) => {
  const w = await environment(t); await w.contribute('investor', 10000); await w.policy();
  const movementId = Number(w.db.prepare(`INSERT INTO movements (investment_id,partner_id,type,amount,currency,date,message,status,created_by,created_at)
    VALUES (?,?,'retorno',6000,'CRC','2026-09-01','Retorno anterior sin clasificación','confirmado',?,?)`).run(w.inv.id, w.ids.investor, w.ids.admin, new Date(w.clock.t).toISOString()).lastInsertRowid);
  assert.ok((await w.preview('2026-01', 0, 0)).blockers.some((row) => row.code === 'unclassified_returns'));
  assert.equal((await w.api.partner.post(`/api/movements/${movementId}/classify`, { capital_amount: 5000, profit_amount: 1000, reason: 'Revisión' })).status, 403);
  const classified = await w.post(`/api/movements/${movementId}/classify`, { capital_amount: 5000, profit_amount: 1000, reason: 'Desglose del comprobante histórico' });
  assert.equal(classified.movement.return_kind, 'mixed');
  assert.equal(classified.movement.return_capital_amount, 5000); assert.equal(classified.movement.return_profit_amount, 1000);
  assert.equal((await w.api.admin.post(`/api/movements/${movementId}/classify`, { capital_amount: 4000, profit_amount: 2000, reason: 'Reescritura inválida' })).data.error, 'classification_locked');
  const detail = (await w.api.investor.get(`/api/investor/investments/${w.inv.id}`)).data;
  assert.equal(detail.investment.mine.outstanding_capital, 5000);
  assert.equal(detail.investment.mine.profit_returned, 1000);
  assert.equal(detail.movements.find((row) => row.id === movementId).return_capital_amount, 5000);
  const privateAnnual = detail.investment.annual_profit_share;
  assert.equal(privateAnnual.own_profit_confirmed, 1000);
  assert.ok(!('partners' in privateAnnual) && !('revenue_collected' in privateAnnual));
});

test('USD redondea cada asignación una vez; pagos de gastos anteriores no reescriben caja cerrada', async (t) => {
  const w = await environment(t);
  w.db.prepare("UPDATE investments SET currency='USD' WHERE id=?").run(w.inv.id);
  await w.policy(2026, { fx_rate: 500 });
  for (const date of ['2026-01-15', '2026-02-15']) await w.ledger('revenue', 251, date);
  const view = await w.preview('2026-02', 0, 0);
  assert.equal(view.totals.revenue_collected, 2); assert.equal(view.totals.net_profit, 2);
  assert.equal(view.periods.reduce((sum, row) => sum + row.net_profit, 0), view.totals.net_profit);
  const { entry } = await w.ledger('expense', 100, '2026-01-01', { paid: false });
  w.db.prepare('INSERT INTO finance_month_weights (investment_id,month,weights_json,created_at) VALUES (?,?,?,?)').run(w.inv.id, '2026-01', '{}', new Date(w.clock.t).toISOString());
  assert.equal((await w.api.admin.patch(`/api/finance/entries/${entry.id}`, { paid: true, paid_date: '2026-02-01' })).status, 200);
  w.db.prepare('INSERT INTO finance_month_weights (investment_id,month,weights_json,created_at) VALUES (?,?,?,?)').run(w.inv.id, '2026-02', '{}', new Date(w.clock.t).toISOString());
  assert.equal((await w.api.admin.patch(`/api/finance/entries/${entry.id}`, { paid: false })).data.error, 'closed_period');
});

test('cierre bloquea también retornos históricos clasificados que sigan pendientes', async (t) => {
  const w = await environment(t, Date.parse('2027-02-10T15:00:00Z')); await w.contribute('investor', 10000);
  await w.ledger('revenue', 10000, '2026-12-01'); await w.policy(2026, { costs_reviewed_through: '2026-12-31' });
  const movementId = Number(w.db.prepare(`INSERT INTO movements (investment_id,partner_id,type,amount,currency,date,message,status,created_by,created_at)
    VALUES (?,?,'retorno',2000,'CRC','2026-12-15','Retorno histórico pendiente','pendiente',?,?)`).run(w.inv.id, w.ids.investor, w.ids.admin, new Date(w.clock.t).toISOString()).lastInsertRowid);
  await w.post(`/api/movements/${movementId}/classify`, { capital_amount: 0, profit_amount: 2000, reason: 'Clasificación según comprobante' });
  assert.equal((await w.preview('2026-12', 0, 0)).totals.profit_unsettled, 0);
  assert.equal((await w.api.admin.post(`/api/finance/policies/${w.inv.id}/close`, { year: 2026, reason: 'Cierre anual' })).data.error, 'pending_settlements');
  assert.equal((await w.api.investor.post(`/api/investor/movements/${movementId}/confirm`, {})).status, 200);
  assert.equal((await w.api.admin.post(`/api/finance/policies/${w.inv.id}/close`, { year: 2026, reason: 'Cierre anual confirmado' })).status, 200);
});
