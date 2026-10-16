// Cálculos puros: enteros monetarios, pesos de capital-días y costeo sin datos inventados.
import { returnParts } from './finance.js';
const DAY = 86_400_000;
export const CAMPAIGN_CATEGORIES = ['meta_ads', 'google_ads'];
export const isCampaign = (investment) => CAMPAIGN_CATEGORIES.includes(investment.category);

export function allocateExact(total, weights) {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('total_invalid');
  const values = weights.map((value) => BigInt(value > 0 ? value : 0));
  const sum = values.reduce((a, b) => a + b, 0n);
  if (!sum) return values.map(() => 0);
  const amount = BigInt(total);
  const parts = values.map((weight) => amount * weight / sum);
  const order = values.map((weight, index) => ({ index, remainder: amount * weight % sum }))
    .sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  let left = Number(amount - parts.reduce((a, b) => a + b, 0n));
  for (let i = 0; left > 0; i += 1, left -= 1) parts[order[i % order.length].index] += 1n;
  return parts.map(Number);
}

export function monthBounds(month) {
  const [year, number] = month.split('-').map(Number);
  return { start: `${month}-01`, end: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) };
}

/** El aporte cuenta desde su fecha efectiva; devolver principal deja de ponderar ese mismo día. */
export function capitalDayWeights(movements, month, eligibleIds) {
  const { start, end } = monthBounds(month);
  const first = Date.parse(`${start}T00:00:00Z`) / DAY;
  const last = Date.parse(`${end}T00:00:00Z`) / DAY;
  const weights = {};
  for (const partnerId of eligibleIds) {
    const events = movements.filter((m) => m.partner_id === partnerId && m.status === 'confirmado' && m.date <= end
      && (m.type === 'aporte' || returnParts(m).capital > 0));
    let sum = 0n;
    for (let day = first; day <= last; day += 1) {
      const date = new Date(day * DAY).toISOString().slice(0, 10);
      const capital = events.filter((m) => m.date <= date).reduce((value, m) => value + BigInt(m.type === 'aporte' ? m.amount : -returnParts(m).capital), 0n);
      if (capital > 0n) sum += capital;
    }
    weights[partnerId] = sum.toString();
  }
  return weights;
}

export function costPlanMetrics(plan) {
  const total = plan.costs.reduce((sum, item) => sum + item.amount, 0);
  const revenue = plan.units * plan.price_per_unit;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(revenue)) throw new Error('amount_overflow');
  const unitCost = Math.ceil(total / plan.units);
  const suggested = Number((BigInt(total) * 10000n + BigInt(plan.units * (10000 - plan.margin_bps)) - 1n) / BigInt(plan.units * (10000 - plan.margin_bps)));
  if (!Number.isSafeInteger(suggested)) throw new Error('amount_overflow');
  return {
    total_cost: total, unit_cost: unitCost,
    suggested_unit_price: suggested,
    projected_revenue: revenue, projected_profit: revenue - total,
    actual_margin_bps: revenue ? Math.round((revenue - total) / revenue * 10000) : null,
  };
}

/** Las pérdidas reducen el pool anual; los créditos conservan los pesos del mes que los generó. */
export function annualEntitlements(periods, beneficiaryIds, rateBps, reserve = 0) {
  const credits = Object.fromEntries(beneficiaryIds.map((id) => [id, 0]));
  let net = 0;
  let unassignedCredits = 0;
  for (const period of periods) {
    net += period.net_profit;
    if (period.net_profit <= 0) continue;
    const parts = allocateExact(period.net_profit, beneficiaryIds.map((id) => period.weights[id] ?? '0'));
    beneficiaryIds.forEach((id, index) => { credits[id] += parts[index]; });
    unassignedCredits += period.net_profit - parts.reduce((sum, value) => sum + value, 0);
  }
  const pool = Number(BigInt(Math.max(0, net - reserve)) * BigInt(rateBps) / 10000n);
  // El resultado previo a cualquier capital elegible conserva su propia bolsa;
  // pérdidas y reservas la reducen proporcionalmente sin regalarla a aportantes futuros.
  const allocations = allocateExact(pool, [...beneficiaryIds.map((id) => credits[id]), unassignedCredits]);
  return { net_profit: net, pool, credits, unassigned_credits: unassignedCredits, unassigned_pool: allocations.at(-1),
    entitlements: Object.fromEntries(beneficiaryIds.map((id, index) => [id, allocations[index]])) };
}
