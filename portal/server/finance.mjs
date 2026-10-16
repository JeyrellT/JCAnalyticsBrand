import { SERVICES } from '../shared/catalog.js';
import { investmentMetrics, returnParts } from '../shared/finance.js';
import { allocateExact, annualEntitlements, capitalDayWeights, isCampaign, monthBounds } from '../shared/business-finance.js';
import { fail, invalid } from './http.mjs';

export const FINANCE_CATEGORIES = { sale: 'Venta cobrada', ads: 'Publicidad', delivery: 'Producción y entrega', labor: 'Trabajo y personal', software: 'Software y herramientas', overhead: 'Gasto general', tax: 'Impuestos', refund: 'Reembolso a cliente', other: 'Otro' };
export const parseYear = (value, today) => {
  const year = value == null || value === '' ? Number(today.slice(0, 4)) : Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) invalid('year', 'Año inválido.');
  return year;
};
export function parseMonth(value) {
  if (typeof value !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) invalid('month', 'Usá un mes en formato AAAA-MM.');
  return value;
}
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
const within = (date, start, end) => date && date >= start && date <= end;
const fingerprint = (value) => {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(16);
};

export function createBusinessFinance(ctx) {
  const { db } = ctx;
  const investment = (id) => db.prepare('SELECT * FROM investments WHERE id = ?').get(id) ?? fail(404, 'not_found');
  const movements = (id) => db.prepare('SELECT * FROM movements WHERE investment_id = ? ORDER BY date, id').all(id);
  const movementYears = (investmentId) => new Map(db.prepare(`SELECT d.movement_id,r.year FROM finance_distribution_items d
    JOIN finance_distributions r ON r.id=d.distribution_id WHERE r.investment_id=?`).all(investmentId).map((row) => [row.movement_id, row.year]));
  function entries() {
    const grouped = Map.groupBy(db.prepare('SELECT * FROM finance_allocations ORDER BY id').all(), (row) => row.entry_id);
    return db.prepare('SELECT * FROM finance_entries ORDER BY date DESC, id DESC').all().map((row) => {
      const allocations = grouped.get(row.id) ?? [];
      const dimensions = allocations.length === 1 ? allocations[0] : {};
      return { ...row, paid: !!row.paid, allocations, service_key: dimensions.service_key ?? null, project_id: dimensions.project_id ?? null, investment_id: dimensions.investment_id ?? null };
    });
  }
  const allocationRows = () => entries().filter((row) => row.status === 'active').flatMap((entry) => entry.allocations.map((allocation) => ({ ...entry, ...allocation, id: entry.id })));
  function totals(rows, start, end) {
    const recognized = rows.filter((row) => within(row.date, start, end));
    const revenue = sum(recognized.filter((row) => row.kind === 'revenue'), 'amount_crc');
    const expenses = sum(recognized.filter((row) => row.kind === 'expense'), 'amount_crc');
    const paid = sum(rows.filter((row) => row.kind === 'expense' && row.paid && within(row.paid_date, start, end)), 'amount_crc');
    const unpaid = sum(rows.filter((row) => row.kind === 'expense' && row.date <= end && (!row.paid || row.paid_date > end)), 'amount_crc');
    return { revenue_collected_crc: revenue, expenses_incurred_crc: expenses, expenses_paid_crc: paid, unpaid_expenses_crc: unpaid, net_profit_crc: revenue - expenses, cash_operating_crc: revenue - paid };
  }
  function overview(year) {
    const rows = allocationRows();
    const start = `${year}-01-01`; const end = `${year}-12-31`;
    const investmentRows = db.prepare('SELECT id, name, category, currency FROM investments ORDER BY name COLLATE NOCASE, id').all();
    return {
      year, currency: 'CRC', totals: totals(rows, start, end),
      months: Array.from({ length: 12 }, (_, i) => {
        const month = `${year}-${String(i + 1).padStart(2, '0')}`;
        const bounds = monthBounds(month);
        return { month, ...totals(rows, bounds.start, bounds.end) };
      }),
      services: Object.entries(SERVICES).map(([key, name]) => ({ key, name, ...totals(rows.filter((row) => row.service_key === key), start, end) })),
      investments: investmentRows.map((item) => ({ ...item, ...totals(rows.filter((row) => row.investment_id === item.id), start, end) })),
      options: { services: Object.entries(SERVICES).map(([key, name]) => ({ key, name })),
        projects: db.prepare('SELECT id, name, service FROM projects ORDER BY name COLLATE NOCASE, id').all(),
        investments: investmentRows.map((item) => ({ ...item, is_campaign: isCampaign(item) })),
        categories: Object.entries(FINANCE_CATEGORIES).map(([key, label]) => ({ key, label })) },
    };
  }
  function policy(investmentId, year) {
    const row = db.prepare('SELECT * FROM finance_policies WHERE investment_id = ? AND year = ?').get(investmentId, year);
    if (!row) return { investment_id: investmentId, year, configured: false, rate_bps: 2000, beneficiary_ids: [], reserve_amount: 0, costs_reviewed_through: null, closed_at: null, fx_rate: null };
    return { ...row, configured: !!row.configured, beneficiary_ids: JSON.parse(row.beneficiary_ids), close_snapshot: row.close_snapshot ? JSON.parse(row.close_snapshot) : null };
  }
  function periodLocked(date, allocations) {
    const year = Number(date.slice(0, 4));
    return allocations.some((allocation) => allocation.investment_id && (
      policy(allocation.investment_id, year).closed_at
      || db.prepare('SELECT 1 FROM finance_month_weights WHERE investment_id = ? AND month >= ?').get(allocation.investment_id, date.slice(0, 7))
    ));
  }

  function preview(investmentId, month, requested = {}) {
    const inv = investment(investmentId);
    parseMonth(month);
    const year = Number(month.slice(0, 4));
    const { end } = monthBounds(month);
    const cutoff = end < ctx.today() ? end : ctx.today();
    const config = policy(inv.id, year);
    const blockers = []; const warnings = [];
    const block = (code, message) => blockers.push({ code, message });
    if (!isCampaign(inv)) block('not_campaign', 'Elegí una inversión de Meta Ads o Google Ads.');
    if (!config.configured || !config.beneficiary_ids.length) block('policy_not_configured', 'El admin debe configurar el acuerdo y elegir sus beneficiarios.');
    if (config.closed_at) block('closed_period', 'Este año ya tiene un cierre registrado.');
    if (end >= ctx.today()) block('period_not_finished', 'Los anticipos se registran después de terminar el mes calendario.');
    if (!config.costs_reviewed_through || config.costs_reviewed_through < cutoff) block('costs_not_reviewed', 'Revisá los costos completos de la campaña hasta la fecha de corte.');
    if (inv.currency === 'USD' && !(config.fx_rate > 0)) block('fx_required', 'La política necesita el tipo de cambio para convertir el libro en colones.');
    const native = (amount) => inv.currency === 'CRC' ? amount : config.fx_rate > 0 ? Math.round(amount / config.fx_rate) : 0;
    const allMovements = movements(inv.id);
    const ms = allMovements.filter((row) => row.date <= cutoff);
    const unknown = allMovements.filter((row) => row.type === 'retorno' && row.status !== 'anulado' && returnParts(row).unclassified > 0);
    if (unknown.length) block('unclassified_returns', 'Clasificá los retornos anteriores como capital o ganancia antes de repartir.');
    // Convertir cada asignación una sola vez mantiene iguales los totales mensuales y anuales.
    const rows = allocationRows().filter((row) => row.investment_id === inv.id).map((row) => ({ ...row, amount_crc: native(row.amount_crc) }));
    const ytd = totals(rows, `${year}-01-01`, cutoff);
    const lifetime = totals(rows, '0000-01-01', cutoff);
    const eligibleIds = config.beneficiary_ids;
    const periods = [];
    for (let i = 1; i <= Number(month.slice(5)); i += 1) {
      const key = `${year}-${String(i).padStart(2, '0')}`;
      const bounds = monthBounds(key);
      const saved = db.prepare('SELECT weights_json FROM finance_month_weights WHERE investment_id = ? AND month = ?').get(inv.id, key);
      const weights = saved ? JSON.parse(saved.weights_json) : capitalDayWeights(ms, key, eligibleIds);
      const metric = totals(rows, bounds.start, bounds.end < cutoff ? bounds.end : cutoff);
      periods.push({ month: key, net_profit: metric.net_profit_crc, weights });
    }
    const annual = annualEntitlements(periods, eligibleIds, config.rate_bps, config.reserve_amount);
    const priorClosed = policy(inv.id, year - 1).close_snapshot;
    const carry = priorClosed?.carryforward_by_partner ?? {};
    const reservedReturns = allMovements.filter((row) => row.type === 'retorno' && row.status !== 'anulado');
    const periodYears = movementYears(inv.id);
    const yearlyProfit = reservedReturns.filter((row) => returnParts(row).profit > 0 && (periodYears.get(row.id) ?? Number(row.date.slice(0, 4))) === year)
      .map((row) => ({ ...row, amount: returnParts(row).profit }));
    const ids = [...new Set([...ms.map((row) => row.partner_id), ...eligibleIds])].sort((a, b) => a - b);
    const people = new Map(db.prepare('SELECT id, name, color FROM users').all().map((row) => [row.id, row]));
    const partners = ids.map((partnerId) => {
      const own = ms.filter((row) => row.partner_id === partnerId);
      const metrics = investmentMetrics(own);
      // Incluye principal confirmado después del corte: ya salió aunque no esté en la foto histórica.
      const capitalReserved = reservedReturns.filter((row) => row.partner_id === partnerId).reduce((total, row) => total + returnParts(row).capital, 0) - metrics.capital_returned;
      const reserved = sum(yearlyProfit.filter((row) => row.partner_id === partnerId), 'amount');
      const entitlement = annual.entitlements[partnerId] ?? 0;
      const carryAmount = carry[partnerId] ?? 0;
      return { id: partnerId, name: people.get(partnerId)?.name ?? 'Persona', color: people.get(partnerId)?.color,
        capital_contributed: metrics.contributed, capital_returned: metrics.capital_returned,
        outstanding_capital: metrics.outstanding_capital, capital_reserved: capitalReserved,
        profit_entitlement: entitlement, profit_reserved: reserved, carryforward: carryAmount,
        profit_available: Math.max(0, entitlement - reserved - carryAmount), overpaid: Math.max(0, reserved + carryAmount - entitlement) };
    });
    const totalReserved = sum(yearlyProfit, 'amount');
    const carryTotal = Object.values(carry).reduce((a, b) => a + b, 0);
    const attributedPool = annual.pool - annual.unassigned_pool;
    const yearlyAvailable = Math.max(0, attributedPool - totalReserved - carryTotal);
    const rawAvailable = sum(partners, 'profit_available');
    const cappedAvailable = Math.min(rawAvailable, yearlyAvailable);
    const caps = allocateExact(cappedAvailable, partners.map((row) => row.profit_available));
    partners.forEach((row, i) => { row.profit_available = caps[i]; });
    const capital = sum(ms.filter((row) => row.type === 'aporte' && row.status === 'confirmado'), 'amount');
    const operatingCash = lifetime.revenue_collected_crc - lifetime.expenses_incurred_crc;
    const cashAvailable = Math.max(0, capital + operatingCash - sum(reservedReturns, 'amount') - config.reserve_amount);
    const capitalWeights = partners.map((row) => row.outstanding_capital == null ? 0 : Math.max(0, row.outstanding_capital - row.capital_reserved));
    const capitalMax = Math.min(capitalWeights.reduce((a, b) => a + b, 0), cashAvailable);
    const profitMax = Math.min(cappedAvailable, Math.max(0, ytd.net_profit_crc - config.reserve_amount - totalReserved), cashAvailable);
    const liquidCaps = allocateExact(profitMax, partners.map((row) => row.profit_available));
    partners.forEach((row, i) => { row.profit_available = liquidCaps[i]; });
    const profitAmount = requested.profit_amount ?? profitMax;
    const capitalAmount = requested.capital_amount ?? 0;
    if (![profitAmount, capitalAmount].every((amount) => Number.isSafeInteger(amount) && amount >= 0)) invalid('amount', 'Montos inválidos.');
    if (profitAmount > profitMax || capitalAmount > capitalMax || profitAmount + capitalAmount > cashAvailable) block('payout_exceeds_available', 'El envío supera la utilidad, el capital o la caja estimada disponibles.');
    if (profitAmount > 0 && !cappedAvailable) block('no_profit_available', 'No hay ganancia disponible para un anticipo.');
    if (!eligibleIds.length || !Object.values(annual.credits).some((value) => value > 0)) warnings.push({ code: 'no_eligible_profit', message: 'No hay créditos de utilidad elegibles en los meses con resultado positivo.' });
    if (annual.unassigned_pool > 0) warnings.push({ code: 'profit_without_participation', message: 'Hay utilidad de meses sin capital elegible. Esa parte se conserva sin asignar y no pasa a quienes aportaron después.' });
    const profitParts = allocateExact(profitAmount, partners.map((row) => row.profit_available));
    const capitalParts = allocateExact(capitalAmount, capitalWeights);
    const payments = partners.map((row, index) => ({ partner_id: row.id, name: row.name, profit_amount: profitParts[index], capital_amount: capitalParts[index], total: profitParts[index] + capitalParts[index] })).filter((row) => row.total > 0);
    if (sum(payments, 'total') !== profitAmount + capitalAmount) block('no_weights', 'No hay capital o utilidad atribuible para repartir ese monto.');
    const summary = { revenue_collected: ytd.revenue_collected_crc, expenses_incurred: ytd.expenses_incurred_crc, net_profit: annual.net_profit,
      annual_pool: annual.pool, annual_unassigned_pool: annual.unassigned_pool, profit_reserved: totalReserved, profit_available: profitMax, profit_unsettled: cappedAvailable, overpaid: Math.max(0, totalReserved + carryTotal - attributedPool), operating_cash: operatingCash, capital_available: capitalMax, cash_available: cashAvailable };
    const result = { investment: { id: inv.id, name: inv.name, currency: inv.currency }, month, year, cutoff_date: cutoff, policy: config,
      totals: summary, partners, payments, blockers, warnings, periods };
    result.preview_token = fingerprint({ config, payments, summary, periods, source: allMovements.map((row) => [row.id, row.status, row.amount, row.return_kind, row.date]), entries: rows.map((row) => [row.id, row.updated_at, row.amount_crc]) });
    return result;
  }
  function ownAnnual(investmentId, userId, year = Number(ctx.today().slice(0, 4))) {
    const inv = investment(investmentId);
    if (!isCampaign(inv)) return null;
    const month = year === Number(ctx.today().slice(0, 4)) ? ctx.today().slice(0, 7) : `${year}-12`;
    const view = preview(investmentId, month);
    const own = view.partners.find((row) => row.id === userId);
    const periodYears = movementYears(investmentId);
    const confirmed = movements(investmentId).filter((row) => row.partner_id === userId && row.status === 'confirmado' && returnParts(row).profit > 0
      && (periodYears.get(row.id) ?? Number(row.date.slice(0, 4))) === year).map((row) => ({ ...row, amount: returnParts(row).profit }));
    return { year, rate: view.policy.rate_bps / 10000, policy_configured: view.policy.configured,
      costs_reviewed_through: view.policy.costs_reviewed_through, own_profit_confirmed: sum(confirmed, 'amount'),
      own_profit_reserved: own?.profit_reserved ?? 0, own_entitlement: own?.profit_entitlement ?? 0,
      own_available: own?.profit_available ?? 0, own_overpaid: own?.overpaid ?? 0 };
  }
  return { investment, movements, entries, allocationRows, totals, overview, policy, periodLocked, preview, ownAnnual };
}
