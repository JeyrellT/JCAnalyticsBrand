// Cifras del inversionista: totales confirmados, retornos con su nombre (capital devuelto y
// ganancia por separado, nunca deducidos del neto de caja), indicadores y, en campañas de
// pauta, el reparto de utilidad anual.
import { SectionHead } from '../components/ui.jsx';
import { formatMoney, formatPercent, formatMultiple } from '../lib/format.js';
import { Figure, FigureNote, MiniFigure, netTone, receivedTone } from './components.jsx';

export const isAdvertisingInvestment = (investment) => ['meta_ads', 'google_ads'].includes(investment.category);

/**
 * Línea de detalle bajo las cifras principales: capital devuelto, ganancias, capital por
 * devolver, múltiplo y TIR. `portfolio` lee los totales en colones (campos *_crc).
 */
export function ReturnFigures({ metrics, currency = 'CRC', portfolio = false }) {
  const read = (key) => metrics?.[portfolio ? `${key}_crc` : key];
  const money = (key) => (Number.isFinite(read(key)) ? formatMoney(read(key), currency) : 'Por conciliar');
  const unknown = read('unclassified_returned');
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line px-4 py-3.5 sm:grid-cols-3 sm:px-5 lg:grid-cols-5">
        <MiniFigure label="Capital devuelto" value={money('capital_returned')} valueProps={{ 'data-return-capital': '' }} />
        <MiniFigure label="Ganancias recibidas" value={money('profit_returned')} tone={receivedTone(read('profit_returned'))} valueProps={{ 'data-return-profit': '' }} />
        <MiniFigure label="Capital por devolver" value={money('outstanding_capital')} valueProps={{ 'data-return-outstanding': '' }} />
        <MiniFigure label="Múltiplo (MOIC)" value={formatMultiple(metrics?.moic)} />
        <MiniFigure label="TIR anual" value={metrics?.irr == null ? '—' : formatPercent(metrics.irr, 1)} />
      </dl>
      {unknown > 0 && (
        <FigureNote tone="amber">
          {formatMoney(unknown, currency)} en retornos sin clasificar: administración debe indicar qué parte fue capital y qué parte ganancia antes de calcular el capital por devolver.
        </FigureNote>
      )}
    </>
  );
}

const waits = (n, who) => `${n} ${n === 1 ? 'espera' : 'esperan'} ${who}`;

/**
 * Totales del inversionista en colones (cada movimiento en dólares con su tipo de cambio):
 * lo confirmado arriba, con los pendientes aparte; el detalle de retornos e indicadores abajo.
 */
export function PortfolioFigures({ pf, hasUsd = false }) {
  const crc = (value) => formatMoney(value, 'CRC');
  const toConfirm = pf.to_confirm_count ?? 0;
  const awaiting = Math.max(0, pf.pending_count - toConfirm);
  const pendingHint = !pf.pending_count ? 'Nada pendiente'
    : toConfirm && awaiting ? `${waits(toConfirm, 'tu confirmación')} · ${awaiting} a JC Analytics`
      : toConfirm ? waits(toConfirm, 'tu confirmación') : waits(awaiting, 'a JC Analytics');
  return (
    <section className="card overflow-hidden" aria-labelledby="totals-title">
      <h2 id="totals-title" className="sr-only">Tus totales</h2>
      <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
        <Figure label="Capital aportado" value={crc(pf.contributed_crc)} hint="Confirmado por las dos partes" valueProps={{ 'data-portfolio-capital': '' }} />
        <Figure label="Retornos recibidos" value={crc(pf.returned_crc)} tone={receivedTone(pf.returned_crc)} hint={pf.returned_crc ? 'Confirmados' : 'Todavía sin retornos'} valueProps={{ 'data-portfolio-returned': '' }} />
        <Figure label="Neto" value={crc(pf.net_crc)} tone={netTone(pf.net_crc, pf.contributed_crc)} hint="Recibido menos aportado" valueProps={{ 'data-portfolio-net': '' }} />
        <Figure label="Pendientes" value={pf.pending_count} tone={pf.pending_count ? 'text-amber-ink' : 'text-ink'} hint={pendingHint} valueProps={{ 'data-portfolio-pending': '' }} />
      </dl>
      <ReturnFigures metrics={pf} portfolio />
      {hasUsd && <FigureNote>Totales en colones: lo que está en dólares usa el tipo de cambio guardado en cada movimiento.</FigureNote>}
    </section>
  );
}

/** Campañas de Meta Ads o Google Ads: tu parte de la utilidad anual, con anticipos mensuales. */
export function AnnualProfitShare({ investment }) {
  if (!isAdvertisingInvestment(investment)) return null;
  const policy = investment.annual_profit_share;
  const configured = policy?.policy_configured;
  const cur = investment.currency;
  const money = (key) => (Number.isFinite(policy?.[key]) ? formatMoney(policy[key], cur) : '—');
  const rate = Number.isFinite(policy?.rate) ? formatPercent(policy.rate, 0) : null;
  return (
    <section className="card overflow-hidden" aria-labelledby="annual-title">
      <SectionHead flush id="annual-title" title={`Reparto de utilidad ${policy?.year ?? 'anual'}`}
        hint={configured ? `${rate} de la utilidad anual · anticipos mensuales` : `Política por configurar${rate ? ` · ${rate} propuesto` : ''}`} />
      {configured ? (
        <dl className="grid gap-px bg-line sm:grid-cols-3">
          <Figure label="Tu utilidad asignada este año" value={money('own_entitlement')} />
          <Figure label="Ganancia confirmada este año" value={money('own_profit_confirmed')} tone={receivedTone(policy.own_profit_confirmed)} />
          <Figure label="Saldo estimado por anticipar" value={money('own_available')} />
        </dl>
      ) : (
        <p className="px-4 py-3.5 text-sm text-ink-2 sm:px-5">Administración debe definir las personas participantes y confirmar la política antes de registrar repartos.</p>
      )}
      {policy?.own_overpaid > 0 && (
        <FigureNote tone="amber">Tus anticipos superan la asignación acumulada en {money('own_overpaid')}. Ese importe queda para el ajuste anual; no se hace ningún cobro automático.</FigureNote>
      )}
      <FigureNote>El porcentaje se aplica a la utilidad repartible de la campaña; el capital se devuelve aparte. Los meses abiertos son provisionales y una asignación no es un pago recibido.</FigureNote>
    </section>
  );
}
