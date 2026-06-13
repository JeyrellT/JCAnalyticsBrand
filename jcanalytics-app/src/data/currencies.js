// ============================================================================
//  src/data/currencies.js  — base USD + 10 monedas LatAm
//  ⚠ Tasas estáticas — sin backend. Actualizar en cada deploy o mínimo mensual:
//     editar CURRENCIES[x].rateFromUSD y la constante FX_UPDATED.
// ============================================================================

export const FX_UPDATED = 'jun 2026';

export const CURRENCIES = {
  USD: { code: 'USD', name: 'Dólar EE.UU.',    flag: '🇺🇸', symbol: '$',    rateFromUSD: 1.0,    locale: 'en-US', decimals: 0, roundTo: 50,    note: 'Base — no tocar' },
  CRC: { code: 'CRC', name: 'Colón CR',        flag: '🇨🇷', symbol: '₡',    rateFromUSD: 515.0,  locale: 'es-CR', decimals: 0, roundTo: 5000,  note: 'BCCR tipo cambio venta' },
  MXN: { code: 'MXN', name: 'Peso mexicano',   flag: '🇲🇽', symbol: 'MX$',  rateFromUSD: 18.5,   locale: 'es-MX', decimals: 0, roundTo: 500,   note: 'Banxico referencia' },
  COP: { code: 'COP', name: 'Peso colombiano', flag: '🇨🇴', symbol: 'COP$', rateFromUSD: 4050.0, locale: 'es-CO', decimals: 0, roundTo: 50000, note: 'Banco de la República', scaleThreshold: 1000000 },
  CLP: { code: 'CLP', name: 'Peso chileno',    flag: '🇨🇱', symbol: 'CLP$', rateFromUSD: 950.0,  locale: 'es-CL', decimals: 0, roundTo: 5000,  note: 'Banco Central de Chile' },
  PEN: { code: 'PEN', name: 'Sol peruano',     flag: '🇵🇪', symbol: 'S/',   rateFromUSD: 3.75,   locale: 'es-PE', decimals: 0, roundTo: 50,    note: 'BCRP tipo referencial' },
  ARS: { code: 'ARS', name: 'Peso argentino',  flag: '🇦🇷', symbol: 'AR$',  rateFromUSD: 1100.0, locale: 'es-AR', decimals: 0, roundTo: 10000, note: 'BCRA — alta volatilidad', referential: true, scaleThreshold: 500000 },
  GTQ: { code: 'GTQ', name: 'Quetzal',         flag: '🇬🇹', symbol: 'Q',    rateFromUSD: 7.8,    locale: 'es-GT', decimals: 0, roundTo: 100,   note: 'Banguat' },
  PAB: { code: 'PAB', name: 'Balboa',          flag: '🇵🇦', symbol: 'B/.',  rateFromUSD: 1.0,    locale: 'es-PA', decimals: 0, roundTo: 50,    note: 'Paridad 1:1 con USD', showUSDParenthetical: true },
  BRL: { code: 'BRL', name: 'Real brasileño',  flag: '🇧🇷', symbol: 'R$',   rateFromUSD: 5.1,    locale: 'pt-BR', decimals: 0, roundTo: 100,   note: 'BCB PTAX' },
  UYU: { code: 'UYU', name: 'Peso uruguayo',   flag: '🇺🇾', symbol: '$U',   rateFromUSD: 39.0,   locale: 'es-UY', decimals: 0, roundTo: 500,   note: 'BCU tipo interbancario' },
};

export const CURRENCY_ORDER = ['USD', 'CRC', 'MXN', 'COP', 'CLP', 'PEN', 'ARS', 'GTQ', 'PAB', 'BRL', 'UYU'];

// Redondeo adaptivo: monedas de alta inflación suben roundTo ×10 sobre el umbral.
function adaptiveRoundTo(amount, currency) {
  const base = currency.roundTo;
  if (currency.scaleThreshold && amount > currency.scaleThreshold) return base * 10;
  return base;
}

// Redondeo asimétrico: floor en el extremo bajo, ceil en el alto.
function roundClean(amount, roundTo, direction = 'nearest') {
  if (direction === 'floor') return Math.floor(amount / roundTo) * roundTo;
  if (direction === 'ceil') return Math.ceil(amount / roundTo) * roundTo;
  return Math.round(amount / roundTo) * roundTo;
}

export function convertAmount(amountUSD, targetCode) {
  const c = CURRENCIES[targetCode];
  if (!c) throw new Error(`Unknown currency: ${targetCode}`);
  return amountUSD * c.rateFromUSD;
}

export function formatMoney(amount, currencyCode) {
  const c = CURRENCIES[currencyCode];
  let out = `${c.symbol}${new Intl.NumberFormat(c.locale, {
    maximumFractionDigits: c.decimals,
    minimumFractionDigits: c.decimals,
  }).format(amount)}`;
  if (c.referential) out += ' (ref.)';
  if (c.showUSDParenthetical && currencyCode !== 'USD') {
    const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
      .format(Math.round(amount / c.rateFromUSD));
    out += ` (USD ${usd})`;
  }
  return out;
}

// Formatea UN monto USD a la moneda destino (convierte + redondea + formatea).
// direction: 'floor' (extremo bajo) | 'ceil' (extremo alto) | 'nearest'.
// Usado por el panel para animar cada extremo del rango por separado.
export function formatSingle(amountUSD, currencyCode = 'USD', direction = 'nearest') {
  const currency = CURRENCIES[currencyCode];
  const raw = convertAmount(amountUSD, currencyCode);
  const clean = roundClean(raw, adaptiveRoundTo(raw, currency), direction);
  return formatMoney(clean, currencyCode);
}

// Punto de entrada principal que usa el panel de resultado.
export function formatRange(minUSD, maxUSD, currencyCode = 'USD') {
  const currency = CURRENCIES[currencyCode];
  const minStr = formatSingle(minUSD, currencyCode, 'floor');
  const maxStr = formatSingle(maxUSD, currencyCode, 'ceil');
  return { label: `${minStr} – ${maxStr}`, min: minStr, max: maxStr, currency };
}
