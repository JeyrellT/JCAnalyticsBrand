// ============================================================================
//  shared/finance.js
//  Núcleo financiero del portal. Lo usan el servidor (métricas oficiales) y el
//  navegador (vista previa antes de guardar), así ambos calculan igual.
//
//  Reglas:
//    · Los montos viajan y se guardan en UNIDADES MENORES enteras (céntimos /
//      cents). Nunca se suma en coma flotante: ₡0,10 + ₡0,20 siempre da ₡0,30.
//    · Solo los movimientos CONFIRMADOS cuentan en las métricas oficiales. Los
//      pendientes se muestran aparte como "en tránsito".
//    · Perspectiva de los socios: un aporte es salida de caja (−), un retorno
//      es entrada (+). Con eso se calcula la TIR (XIRR).
// ============================================================================

export const CURRENCIES = {
  CRC: { code: 'CRC', symbol: '₡', label: 'Colones' },
  USD: { code: 'USD', symbol: '$', label: 'Dólares' },
};

export const MOVEMENT_TYPES = ['aporte', 'retorno'];
export const MOVEMENT_STATUS = ['pendiente', 'confirmado', 'objetado', 'anulado'];

const DAY_MS = 86_400_000;

/** Convierte "1.250.000,50", "1250000.5" o un número a unidades menores enteras. */
export function toMinor(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  if (typeof value !== 'string') return null;
  let s = value.trim().replace(/[₡$\s\u00a0\u202f]/g, '');
  if (!s) return null;
  // El separador decimal es el último, si aparece una sola vez y tiene 1-2
  // dígitos detrás ("99,9", "1.250,50"). Con 3 dígitos es de miles ("1.250").
  const sepIdx = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let intPart = s;
  let fracPart = '';
  if (sepIdx >= 0) {
    const ch = s[sepIdx];
    const tail = s.length - sepIdx - 1;
    if (s.split(ch).length === 2 && tail >= 1 && tail <= 2) {
      intPart = s.slice(0, sepIdx);
      fracPart = s.slice(sepIdx + 1);
    }
  }
  // Los separadores de miles deben agrupar de a 3 dígitos: "1.2.3" es inválido.
  const groups = intPart.replace(/^-/, '').split(/[.,]/);
  if (groups.length > 1 && (!groups[0] || groups[0].length > 3 || groups.slice(1).some((g) => g.length !== 3))) return null;
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^-?\d+$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) return null;
  const sign = intPart.startsWith('-') ? -1 : 1;
  const whole = Math.abs(Number(intPart));
  const cents = Number((fracPart + '00').slice(0, 2));
  const minor = sign * (whole * 100 + cents);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Formatea unidades menores en la moneda indicada (₡1 250 000 / $1 250,50). */
export function formatMoney(minor, currency = 'CRC', { compact = false, decimals } = {}) {
  if (minor == null || !Number.isFinite(minor)) return '—';
  const value = minor / 100;
  const symbol = CURRENCIES[currency]?.symbol ?? '';
  const abs = Math.abs(value);
  if (compact && abs >= 1_000_000) {
    const n = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 1 }).format(abs / 1_000_000);
    return `${value < 0 ? '−' : ''}${symbol}${n} M`;
  }
  // En vista compacta los colones van sin céntimos; en el detalle se muestran si existen.
  const fraction = decimals ?? (currency === 'USD' ? 2 : compact || Number.isInteger(value) ? 0 : 2);
  const n = new Intl.NumberFormat('es-CR', { minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(abs);
  return `${value < 0 ? '−' : ''}${symbol}${n}`;
}

/** Equivalente en colones (unidades menores) usando el tipo de cambio guardado en el movimiento. */
export function toCRC(minor, currency, fxRate) {
  if (currency === 'CRC') return minor;
  const rate = Number(fxRate);
  if (!(rate > 0)) return null;
  return Math.round(minor * rate);
}

/**
 * Reparte un total entre pesos (p. ej. capital aportado por socio) con el
 * método del mayor residuo: la suma de las partes es SIEMPRE igual al total.
 * @param {number} totalMinor entero > 0
 * @param {number[]} weights pesos ≥ 0
 * @returns {number[]} partes enteras, mismo orden que weights
 */
export function allocateProRata(totalMinor, weights) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) throw new Error('total_invalid');
  const sum = weights.reduce((a, w) => a + (w > 0 ? w : 0), 0);
  if (sum <= 0) throw new Error('no_weights');
  const raw = weights.map((w) => (w > 0 ? (totalMinor * w) / sum : 0));
  const parts = raw.map(Math.floor);
  let remainder = totalMinor - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r), w: weights[i] }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.frac - a.frac || b.w - a.w || a.i - b.i);
  for (let k = 0; remainder > 0 && order.length; k = (k + 1) % order.length) {
    parts[order[k].i] += 1;
    remainder -= 1;
  }
  return parts;
}

/**
 * TIR anual con fechas irregulares (equivalente a XIRR de Excel).
 * @param {{date: string|Date, amount: number}[]} flows negativos = salidas
 * @returns {number|null} tasa anual (0.18 = 18 %) o null si no es calculable
 */
export function xirr(flows) {
  const clean = flows
    .filter((f) => f && Number.isFinite(f.amount) && f.amount !== 0)
    .map((f) => ({ t: new Date(f.date).getTime(), amount: f.amount }))
    .filter((f) => Number.isFinite(f.t))
    .sort((a, b) => a.t - b.t);
  if (!clean.some((f) => f.amount < 0) || !clean.some((f) => f.amount > 0)) return null;
  const t0 = clean[0].t;
  const years = clean.map((f) => (f.t - t0) / (365 * DAY_MS));
  if (years[years.length - 1] <= 0) return null;
  const npv = (r) => clean.reduce((acc, f, i) => acc + f.amount / Math.pow(1 + r, years[i]), 0);
  const dnpv = (r) => clean.reduce((acc, f, i) => acc - (years[i] * f.amount) / Math.pow(1 + r, years[i] + 1), 0);

  // Newton-Raphson desde 10 %; si diverge, bisección en un rango amplio.
  let r = 0.1;
  for (let i = 0; i < 60; i += 1) {
    const v = npv(r);
    const d = dnpv(r);
    if (!Number.isFinite(v) || !Number.isFinite(d) || d === 0) break;
    const next = r - v / d;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - r) < 1e-9) return next;
    r = next;
  }
  let lo = -0.9999;
  let hi = 100;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-10) return mid;
    if (fLo * fMid < 0) hi = mid;
    else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

/**
 * Métricas de una inversión a partir de sus movimientos.
 * @param {Array<{partner_id:number, type:'aporte'|'retorno', amount:number, status:string, date:string}>} movements
 *        montos en la moneda de la inversión (unidades menores)
 */
export function investmentMetrics(movements) {
  const confirmed = movements.filter((m) => m.status === 'confirmado');
  const pending = movements.filter((m) => m.status === 'pendiente');
  const sum = (list, type) => list.filter((m) => m.type === type).reduce((a, m) => a + m.amount, 0);

  const contributed = sum(confirmed, 'aporte');
  const returned = sum(confirmed, 'retorno');
  const partners = new Map();
  for (const m of confirmed) {
    const p = partners.get(m.partner_id) ?? { partner_id: m.partner_id, contributed: 0, returned: 0 };
    if (m.type === 'aporte') p.contributed += m.amount;
    else p.returned += m.amount;
    partners.set(m.partner_id, p);
  }
  for (const m of pending) {
    if (!partners.has(m.partner_id)) partners.set(m.partner_id, { partner_id: m.partner_id, contributed: 0, returned: 0 });
  }
  const partnerRows = [...partners.values()]
    .map((p) => ({
      ...p,
      net: p.returned - p.contributed,
      share: contributed > 0 ? p.contributed / contributed : 0,
    }))
    .sort((a, b) => b.contributed - a.contributed);

  return {
    contributed,
    returned,
    net: returned - contributed,
    moic: contributed > 0 ? returned / contributed : null,
    roi: contributed > 0 ? (returned - contributed) / contributed : null,
    payback: contributed > 0 ? Math.min(returned / contributed, 1) : 0,
    irr: xirr(confirmed.map((m) => ({ date: m.date, amount: m.type === 'aporte' ? -m.amount : m.amount }))),
    pendingContributions: sum(pending, 'aporte'),
    pendingReturns: sum(pending, 'retorno'),
    pendingCount: pending.length,
    objectedCount: movements.filter((m) => m.status === 'objetado').length,
    partners: partnerRows,
  };
}

/** Serie acumulada (aportado vs retornado) por fecha para gráficos. */
export function cumulativeSeries(movements, valueOf = (m) => m.amount) {
  const confirmed = movements
    .filter((m) => m.status === 'confirmado')
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.id - b.id);
  const out = [];
  let contributed = 0;
  let returned = 0;
  for (const m of confirmed) {
    const v = valueOf(m) ?? 0;
    if (m.type === 'aporte') contributed += v;
    else returned += v;
    const last = out[out.length - 1];
    const point = { date: m.date, contributed, returned, net: returned - contributed };
    if (last && last.date === m.date) out[out.length - 1] = point;
    else out.push(point);
  }
  return out;
}

/** Múltiplo sobre el capital (MOIC): "1,25×". */
export function formatMultiple(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${new Intl.NumberFormat('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ratio)}×`;
}

export function formatPercent(ratio, digits = 1) {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${new Intl.NumberFormat('es-CR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(ratio * 100)} %`;
}
