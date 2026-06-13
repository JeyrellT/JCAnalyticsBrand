// ============================================================================
//  src/hooks/useCurrency.js — moneda activa + conversión del rango
// ============================================================================
import { useState, useCallback } from 'react';
import { CURRENCIES, CURRENCY_ORDER, formatRange } from '../data/currencies';

export function useCurrency(defaultCode = 'USD') {
  const [activeCode, setActiveCode] = useState(defaultCode);

  const convert = useCallback(
    (minUSD, maxUSD) => formatRange(minUSD, maxUSD, activeCode),
    [activeCode]
  );

  return {
    activeCode,
    setActiveCode,
    activeCurrency: CURRENCIES[activeCode],
    convert,
    currencyList: CURRENCY_ORDER.map((c) => CURRENCIES[c]),
  };
}
