import { ArrowDownLeft, Coins, Sprout, CalendarRange, Info } from 'lucide-react';
import { formatMoney, formatPercent } from '../lib/format.js';
import '../styles/investor-returns.css';

export const isAdvertisingInvestment = (investment) => ['meta_ads', 'google_ads'].includes(investment.category);

/** A receipt can contain profit or returned principal. Never infer either from cash net. */
export function ReturnBreakdown({ metrics, currency = 'CRC', portfolio = false }) {
  const read = (key) => metrics?.[portfolio ? `${key}_crc` : key];
  const money = (key) => Number.isFinite(read(key)) ? formatMoney(read(key), currency) : 'Por conciliar';
  const unknown = read('unclassified_returned');
  return <section className="ir-breakdown" aria-label="Capital y ganancias por separado">
    <div className="ir-breakdown-heading"><span><ArrowDownLeft size={15} aria-hidden="true" /> CADA RETORNO, CON SU NOMBRE</span><p>Solo movimientos confirmados por las dos partes.</p></div>
    <dl className="ir-figures">
      <div><dt><Coins size={17} aria-hidden="true" />Capital devuelto</dt><dd data-return-capital>{money('capital_returned')}</dd><p>Devolución de tu aporte.</p></div>
      <div><dt><Sprout size={17} aria-hidden="true" />Ganancias recibidas</dt><dd data-return-profit>{money('profit_returned')}</dd><p>Tu utilidad pagada y confirmada.</p></div>
      <div><dt>Capital por devolver</dt><dd data-return-outstanding>{money('outstanding_capital')}</dd><p>Aportado menos capital devuelto.</p></div>
    </dl>
    {unknown > 0 && <p className="ir-note"><Info size={14} aria-hidden="true" /><span>Hay {formatMoney(unknown, currency)} en retornos históricos sin clasificar. Administración debe indicar qué parte fue capital y qué parte fue ganancia antes de calcular el capital pendiente.</span></p>}
  </section>;
}

export function AnnualProfitShare({ investment }) {
  if (!isAdvertisingInvestment(investment)) return null;
  const policy = investment.annual_profit_share;
  const configured = policy?.policy_configured;
  const cur = investment.currency;
  const money = (key) => Number.isFinite(policy?.[key]) ? formatMoney(policy[key], cur) : '—';
  return <section className="ir-annual" aria-label="Reparto de utilidad anual">
    <div className="ir-annual-intro"><span className="ir-annual-kicker"><CalendarRange size={15} aria-hidden="true" /> {policy?.year ?? 'CICLO ANUAL'} / {investment.category === 'meta_ads' ? 'META ADS' : 'GOOGLE ADS'}</span><h2>La publicidad mueve ideas.<br /><em>Los resultados se cuentan.</em></h2><p>Los cobros y los costos de esta campaña determinan su utilidad. Los anticipos mensuales se revisan contra el resultado acumulado del año.</p></div>
    <div className="ir-annual-rule"><span className="ir-annual-rate">{configured ? formatPercent(policy.rate, 0) : '20 %'}<small>{configured ? 'de la utilidad anual' : 'propuesto · por configurar'}</small></span><p>{configured ? 'Bolsa compartida entre las personas incluidas en el reparto. Tu parte depende del capital y los días que estuvo aportado en cada mes.' : 'Administración debe definir las personas participantes y confirmar la política antes de registrar repartos.'}</p><span className="ir-annual-status"><i />{configured ? 'Anticipos mensuales · ajuste anual' : 'Pendiente de configuración'}</span></div>
    {configured && <dl className="ir-annual-personal"><div><dt>Tu utilidad asignada este año</dt><dd>{money('own_entitlement')}</dd></div><div><dt>Ganancia confirmada este año</dt><dd>{money('own_profit_confirmed')}</dd></div><div><dt>Saldo estimado por anticipar</dt><dd>{money('own_available')}</dd></div></dl>}
    {policy?.own_overpaid > 0 && <p className="ir-annual-adjustment">Tus anticipos superan la asignación acumulada en {money('own_overpaid')}. Ese importe queda para el ajuste; no se realiza ningún cobro automático.</p>}
    <p className="ir-annual-footer">El porcentaje corresponde a la utilidad repartible de la campaña. El capital se devuelve y registra por separado. Los resultados pueden variar. Los meses abiertos son provisionales y una asignación todavía no es un pago recibido.</p>
  </section>;
}
