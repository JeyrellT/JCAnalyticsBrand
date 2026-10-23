// ============================================================================
//  shared/billing.js
//  Cobros de los proyectos: pagos únicos y cobros recurrentes (semanal,
//  quincenal, mensual…). Funciones puras sobre fechas "YYYY-MM-DD" (calendario
//  de Costa Rica, sin horas) y montos en unidades menores (céntimos).
//  Las usan el servidor (resúmenes, calendario, Excel) y las pantallas.
//
//  Reglas del calendario:
//    · único: un solo cobro en la fecha indicada.
//    · semanal: cada 7 días desde la primera fecha.
//    · quincenal: dos cobros por mes, separados 15 días (p. ej. 1 y 16, o
//      15 y 30). Si la primera fecha cae después del 15, la otra quincena es
//      15 días antes. Fin de mes se ajusta al último día (febrero: 28/29).
//    · mensual, bimestral, trimestral, semestral, anual: el mismo día del mes
//      cada 1, 2, 3, 6 o 12 meses; el 31 pasa al último día de meses cortos.
//    · "hasta" (opcional) corta la serie; sin "hasta", sigue indefinidamente.
// ============================================================================

export const BILLING_FREQUENCIES = {
  unico: { label: 'Pago único', every: 'una sola vez', perYear: 0 },
  semanal: { label: 'Semanal', every: 'cada semana', perYear: 52, days: 7 },
  quincenal: { label: 'Quincenal', every: 'cada 15 días', perYear: 24 },
  mensual: { label: 'Mensual', every: 'cada mes', perYear: 12, months: 1 },
  bimestral: { label: 'Bimestral', every: 'cada 2 meses', perYear: 6, months: 2 },
  trimestral: { label: 'Trimestral', every: 'cada 3 meses', perYear: 4, months: 3 },
  semestral: { label: 'Semestral', every: 'cada 6 meses', perYear: 2, months: 6 },
  anual: { label: 'Anual', every: 'cada año', perYear: 1, months: 12 },
};

/** Estados del proyecto en los que sus cobros cuentan en los totales (no prospectos, pausados ni cerrados). */
export const BILLING_PROJECT_STATUSES = ['en_curso', 'en_revision', 'entregado', 'soporte'];

const DAY = 86_400_000;
const pad = (n) => String(n).padStart(2, '0');
const parse = (date) => {
  const [y, m, d] = String(date).split('-').map(Number);
  return { y, m, d };
};
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const toMs = (date) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Suma días a una fecha "YYYY-MM-DD". */
export const addDays = (date, days) => fromMs(toMs(date) + days * DAY);

/** Mes "YYYY-MM" desplazado n meses. */
export function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Primer y último día de un mes "YYYY-MM". */
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { from: iso(y, m, 1), to: iso(y, m, lastDay(y, m)) };
}

export const isRecurring = (charge) => charge.frequency !== 'unico';

/**
 * Fechas de cobro de una línea entre `from` y `to` (inclusive), en orden.
 * `limit` evita series enormes si alguien pide un rango de décadas.
 */
export function occurrences(charge, from, to, limit = 1000) {
  const rule = BILLING_FREQUENCIES[charge.frequency];
  if (!rule || !charge.start_date) return [];
  const start = charge.start_date;
  const end = charge.end_date && charge.end_date < to ? charge.end_date : to;
  const lower = start > from ? start : from;
  if (lower > end) return [];
  const out = [];
  const push = (date) => { if (date >= lower && date <= end && out.length < limit) out.push(date); };

  if (charge.frequency === 'unico') {
    push(start);
    return out;
  }
  if (rule.days) {
    // Primer múltiplo de 7 días desde la fecha inicial que cae en el rango.
    const skip = Math.max(0, Math.ceil((toMs(lower) - toMs(start)) / (rule.days * DAY)));
    for (let ms = toMs(start) + skip * rule.days * DAY; out.length < limit; ms += rule.days * DAY) {
      const date = fromMs(ms);
      if (date > end) break;
      push(date);
    }
    return out;
  }
  const { y, m, d } = parse(start);
  if (charge.frequency === 'quincenal') {
    const first = d > 15 ? d - 15 : d;
    for (let month = lower.slice(0, 7); `${month}-01` <= end && out.length < limit; month = shiftMonth(month, 1)) {
      const [yy, mm] = month.split('-').map(Number);
      const days = lastDay(yy, mm);
      push(iso(yy, mm, Math.min(first, days)));
      push(iso(yy, mm, Math.min(first + 15, days)));
    }
    return out;
  }
  // Mensual y múltiplos: se avanza desde el mes inicial de a `months`, saltando lo anterior al rango.
  const startIndex = y * 12 + (m - 1);
  const lowerParts = parse(lower);
  const lowerIndex = lowerParts.y * 12 + (lowerParts.m - 1);
  let k = Math.max(0, Math.floor((lowerIndex - startIndex) / rule.months));
  for (; out.length < limit; k += 1) {
    const index = startIndex + k * rule.months;
    const yy = Math.floor(index / 12);
    const mm = (index % 12) + 1;
    const date = iso(yy, mm, Math.min(d, lastDay(yy, mm)));
    if (date > end) break;
    push(date);
  }
  return out;
}

/** Próximo cobro desde `today` (incluido), o null si la serie terminó. */
export function nextOccurrence(charge, today) {
  return occurrences(charge, today, addDays(today, 400), 1)[0] ?? null;
}

/** Equivalente mensual de una línea recurrente (un pago único no suma). */
export const monthlyAmount = (charge) => (isRecurring(charge) ? Math.round((charge.amount * BILLING_FREQUENCIES[charge.frequency].perYear) / 12) : 0);

/** ¿La línea recurrente sigue vigente hoy? Un pago único está vigente hasta su fecha. */
export function isActiveCharge(charge, today) {
  if (!isRecurring(charge)) return charge.start_date >= today;
  return !charge.end_date || charge.end_date >= today;
}

/**
 * Resumen de los cobros de un proyecto, en colones. `toCRC(amount, currency)`
 * convierte (los dólares con el tipo de cambio vigente). `counts` indica si el
 * proyecto está en un estado que cobra (ver BILLING_PROJECT_STATUSES).
 */
export function billingSummary(charges, today, toCRC, counts = true) {
  const crc = (charge, amount) => toCRC(amount, charge.currency) ?? 0;
  const live = charges.filter((c) => isActiveCharge(c, today));
  const recurring = live.filter(isRecurring);
  const upcoming = live
    .map((c) => ({ charge: c, date: nextOccurrence(c, today) }))
    .filter((x) => x.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.charge.id - b.charge.id);
  const next = upcoming[0];
  return {
    counts,
    recurring_count: recurring.length,
    one_time_count: charges.filter((c) => !isRecurring(c)).length,
    monthly_crc: recurring.reduce((sum, c) => sum + crc(c, monthlyAmount(c)), 0),
    one_time_pending_crc: live.filter((c) => !isRecurring(c)).reduce((sum, c) => sum + crc(c, c.amount), 0),
    next: next ? { date: next.date, amount: next.charge.amount, currency: next.charge.currency, concept: next.charge.concept, charge_id: next.charge.id } : null,
  };
}
