// Estado de cuenta del inversionista: todos sus movimientos agrupados por mes, con su estado,
// filtros (todos · por aprobar · aprobados), totales y la descarga para Excel.
import { useMemo, useState } from 'react';
import { ReceiptText, Download, ListChecks, CheckCheck, Hourglass } from 'lucide-react';
import { useResource, useSession } from '../../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState, Tabs, cx } from '../../components/ui.jsx';
import { formatMoney, todayKey } from '../../lib/format.js';
import { MovementItem, monthLabel, displayName, longDate, netReading } from '../components.jsx';
import { ReturnBreakdown } from '../InvestorReturns.jsx';

const FILTERS = {
  todos: () => true,
  pendientes: (m) => m.status === 'pendiente',
  confirmados: (m) => m.status === 'confirmado',
  capital: (m) => m.type === 'retorno' && ['capital', 'mixed'].includes(m.return_kind),
  ganancias: (m) => m.type === 'retorno' && ['profit', 'mixed'].includes(m.return_kind),
};

/** Suma en colones de lo confirmado de un tipo (cada movimiento en dólares con su tipo de cambio). */
const confirmedCrc = (list, type) => list.filter((m) => m.status === 'confirmado' && m.type === type).reduce((a, m) => a + (m.amount_crc ?? 0), 0);

function SummaryFigure({ label, value, hint, tone, className }) {
  return (
    <div className={cx('min-w-0 bg-surface px-4 py-4 sm:px-5', className)}>
      <dt className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={cx('num mt-1.5 truncate text-[22px] font-bold leading-none sm:text-[26px]', tone ?? 'text-ink')}>{value}</dd>
      {hint && <dd className="mt-1.5 text-xs leading-snug text-muted">{hint}</dd>}
    </div>
  );
}

export default function InvestorMovements() {
  const { user, refresh } = useSession();
  const { data, error, reload } = useResource('/api/investor/movements');
  const [filter, setFilter] = useState('todos');

  const groups = useMemo(() => {
    const out = [];
    for (const m of (data?.movements ?? []).filter(FILTERS[filter])) {
      const key = m.date.slice(0, 7);
      if (out.at(-1)?.key !== key) out.push({ key, items: [] });
      out.at(-1).items.push(m);
    }
    return out;
  }, [data, filter]);

  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { movements, portfolio: pf } = data;
  const changed = () => { reload(); refresh(); };
  const counts = Object.fromEntries(Object.entries(FILTERS).map(([key, matches]) => [key, movements.filter(matches).length]));
  const net = netReading(pf.net_crc, pf.contributed_crc);
  const hasUsd = movements.some((m) => m.currency === 'USD');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Estado de cuenta" title="Movimientos" icon={ReceiptText} tone="violet"
        subtitle="Todos tus aportes y retornos con JC Analytics. Solo lo confirmado por las dos partes cuenta en tus totales."
        actions={(
          <a href="/api/investor/statement.csv" download className="btn btn-outline tap w-full sm:w-auto lg:min-h-10">
            <Download className="h-4 w-4" aria-hidden="true" />Descargar estado de cuenta (Excel)
          </a>
        )} />

      {/* Encabezado del estado de cuenta: a nombre de quién, al día de hoy y los totales. */}
      <section className="card animate-rise overflow-hidden" aria-labelledby="summary-title">
        <div className="flex flex-col gap-1 border-b border-line px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:px-5">
          <h2 id="summary-title" className="section-title">Resumen al {longDate(todayKey())}</h2>
          <p className="truncate text-xs text-muted">{displayName(user.name)} · {user.email}</p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          <SummaryFigure label="Aportado" value={formatMoney(pf.contributed_crc, 'CRC')} hint="Confirmado" />
          <SummaryFigure label="Retornado" value={formatMoney(pf.returned_crc, 'CRC')} tone="text-teal-ink" hint="Confirmado" />
          <SummaryFigure label="Neto" value={formatMoney(pf.net_crc, 'CRC')} tone={net.good ? 'text-teal-ink' : 'text-ink'} hint={net.hint} />
          <SummaryFigure label="En tránsito" value={pf.pending_count} tone={pf.pending_count ? 'text-amber-ink' : 'text-ink'}
            hint={pf.pending_count ? `${pf.pending_count === 1 ? 'Movimiento' : 'Movimientos'} sin confirmar` : 'Nada pendiente'} />
        </dl>
        {hasUsd && <p className="border-t border-line bg-surface-2/60 px-4 py-2.5 text-xs text-muted sm:px-5">Totales en colones: lo que está en dólares usa el tipo de cambio guardado en cada movimiento.</p>}
      </section>
      <ReturnBreakdown metrics={pf} portfolio />

      {movements.length === 0 ? (
        <EmptyState icon={ReceiptText} tone="violet" title="Todavía no hay movimientos a tu nombre">
          Cuando JC Analytics registre tu primer aporte, aparece aquí con su historia.
        </EmptyState>
      ) : (
        <>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={filter} onChange={setFilter} tabs={[
              { value: 'todos', label: 'Todos', count: counts.todos },
              { value: 'pendientes', label: 'Por aprobar', count: counts.pendientes },
              { value: 'confirmados', label: 'Aprobados', count: counts.confirmados },
              { value: 'capital', label: 'Capital devuelto', count: counts.capital },
              { value: 'ganancias', label: 'Ganancias', count: counts.ganancias },
            ]} />
          </div>

          {groups.length === 0 ? (
            filter === 'pendientes'
              ? <EmptyState icon={CheckCheck} tone="teal" title="Nada por aprobar">Todos tus movimientos ya fueron aprobados o resueltos.</EmptyState>
              : <EmptyState icon={ListChecks} tone="slate" title="Sin movimientos en esta vista">Probá con otro filtro.</EmptyState>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => {
                const inMonth = confirmedCrc(g.items, 'aporte');
                const outMonth = confirmedCrc(g.items, 'retorno');
                const pendingMonth = g.items.filter((m) => m.status === 'pendiente').length;
                return (
                  <section key={g.key} aria-labelledby={`month-${g.key}`} className="animate-rise">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
                      <h2 id={`month-${g.key}`} className="font-display text-[15px] font-bold text-ink">{monthLabel(g.key)}</h2>
                      <p className="text-xs text-muted">
                        {inMonth > 0 && <>Aportes <span className="num font-semibold text-ink">{formatMoney(inMonth, 'CRC')}</span></>}
                        {inMonth > 0 && outMonth > 0 && ' · '}
                        {outMonth > 0 && <>Retornos <span className="num font-semibold text-teal-ink">{formatMoney(outMonth, 'CRC')}</span></>}
                        {(inMonth > 0 || outMonth > 0) && pendingMonth > 0 && ' · '}
                        {pendingMonth > 0 && <span className="inline-flex items-center gap-1 font-medium text-amber-ink"><Hourglass className="h-3 w-3" aria-hidden="true" />{pendingMonth} sin confirmar</span>}
                      </p>
                    </div>
                    <ul className="card divide-y divide-line overflow-hidden">
                      {g.items.map((m) => <li key={m.id}><MovementItem m={m} showInvestment defaultOpen={m.can_resolve} onChanged={changed} investmentLink /></li>)}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
