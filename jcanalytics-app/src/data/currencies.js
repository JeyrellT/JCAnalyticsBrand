// ============================================================================
//  src/data/currencies.js  — base USD + 10 monedas LatAm
//  ⚠ Tasas estáticas — sin backend. Actualizar en cada deploy o mínimo mensual:
//     editar CURRENCIES[x].rateFromUSD y la constante FX_UPDATED.
// ============================================================================

import { t } from '../i18n/locale';

export const FX_UPDATED = t('jun 2026', 'Jun 2026');

export const CURRENCIES = {
  USD: { code: 'USD', name: t('Dólar EE.UU.', 'US dollar'),    flag: '🇺🇸', symbol: '$',    rateFromUSD: 1.0,    locale: 'en-US', decimals: 0, roundTo: 50,    note: t('Base — no tocar', 'Base currency — do not change') },
  CRC: { code: 'CRC', name: t('Colón CR', 'Costa Rican colón'),        flag: '🇨🇷', symbol: '₡',    rateFromUSD: 515.0,  locale: 'es-CR', decimals: 0, roundTo: 5000,  note: t('BCCR tipo cambio venta', 'BCCR selling exchange rate') },
  MXN: { code: 'MXN', name: t('Peso mexicano', 'Mexican peso'),   flag: '🇲🇽', symbol: 'MX$',  rateFromUSD: 18.5,   locale: 'es-MX', decimals: 0, roundTo: 500,   note: t('Banxico referencia', 'Banxico reference rate') },
  COP: { code: 'COP', name: t('Peso colombiano', 'Colombian peso'), flag: '🇨🇴', symbol: 'COP$', rateFromUSD: 4050.0, locale: 'es-CO', decimals: 0, roundTo: 50000, note: 'Banco de la República', scaleThreshold: 1000000 },
  CLP: { code: 'CLP', name: t('Peso chileno', 'Chilean peso'),    flag: '🇨🇱', symbol: 'CLP$', rateFromUSD: 950.0,  locale: 'es-CL', decimals: 0, roundTo: 5000,  note: 'Banco Central de Chile' },
  PEN: { code: 'PEN', name: t('Sol peruano', 'Peruvian sol'),     flag: '🇵🇪', symbol: 'S/',   rateFromUSD: 3.75,   locale: 'es-PE', decimals: 0, roundTo: 50,    note: t('BCRP tipo referencial', 'BCRP reference rate') },
  ARS: { code: 'ARS', name: t('Peso argentino', 'Argentine peso'),  flag: '🇦🇷', symbol: 'AR$',  rateFromUSD: 1100.0, locale: 'es-AR', decimals: 0, roundTo: 10000, note: t('BCRA — alta volatilidad', 'BCRA — high volatility'), referential: true, scaleThreshold: 500000 },
  GTQ: { code: 'GTQ', name: t('Quetzal', 'Guatemalan quetzal'),         flag: '🇬🇹', symbol: 'Q',    rateFromUSD: 7.8,    locale: 'es-GT', decimals: 0, roundTo: 100,   note: 'Banguat' },
  PAB: { code: 'PAB', name: t('Balboa', 'Panamanian balboa'),          flag: '🇵🇦', symbol: 'B/.',  rateFromUSD: 1.0,    locale: 'es-PA', decimals: 0, roundTo: 50,    note: t('Paridad 1:1 con USD', '1:1 parity with USD'), showUSDParenthetical: true },
  BRL: { code: 'BRL', name: t('Real brasileño', 'Brazilian real'),  flag: '🇧🇷', symbol: 'R$',   rateFromUSD: 5.1,    locale: 'pt-BR', decimals: 0, roundTo: 100,   note: 'BCB PTAX' },
  UYU: { code: 'UYU', name: t('Peso uruguayo', 'Uruguayan peso'),   flag: '🇺🇾', symbol: '$U',   rateFromUSD: 39.0,   locale: 'es-UY', decimals: 0, roundTo: 500,   note: t('BCU tipo interbancario', 'BCU interbank rate') },
};

export const CURRENCY_ORDER = ['USD', 'CRC', 'MXN', 'COP', 'CLP', 'PEN', 'ARS', 'GTQ', 'PAB', 'BRL', 'UYU'];

// Redondeo adaptivo en ambas direcciones:
// · Alta inflación: roundTo ×10 sobre el umbral.
// · Montos pequeños (el cotizador arranca en $30): baja el paso ÷10 hasta que
//   el monto sea ≥ 10× el paso — si no, un floor con roundTo 50 convertiría
//   $30 en $0.
function adaptiveRoundTo(amount, currency) {
  let base = currency.roundTo;
  if (currency.scaleThreshold && amount > currency.scaleThreshold) return base * 10;
  while (base > 1 && amount < base * 10) base = Math.max(1, base / 10);
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
