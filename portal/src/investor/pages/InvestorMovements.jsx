// Estado de cuenta del inversionista: sus totales, todos sus movimientos agrupados por mes
// con su estado, filtros (todos · por confirmar · confirmados · capital · ganancias) y la
// descarga para Excel.
import { useMemo, useState } from 'react';
import { ReceiptText, ListChecks, CheckCheck, Hourglass } from 'lucide-react';
import { useResource, useSession } from '../../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState, Tabs } from '../../components/ui.jsx';
import { formatMoney, todayKey } from '../../lib/format.js';
import { MovementItem, StatementLink, monthLabel, longDate } from '../components.jsx';
import { PortfolioFigures } from '../InvestorFigures.jsx';

const FILTERS = {
  todos: () => true,
  pendientes: (m) => m.status === 'pendiente',
  confirmados: (m) => m.status === 'confirmado',
  capital: (m) => m.type === 'retorno' && ['capital', 'mixed'].includes(m.return_kind),
  ganancias: (m) => m.type === 'retorno' && ['profit', 'mixed'].includes(m.return_kind),
};

/** Suma en colones de lo confirmado de un tipo (cada movimiento en dólares con su tipo de cambio). */
const confirmedCrc = (list, type) => list.filter((m) => m.status === 'confirmado' && m.type === type).reduce((a, m) => a + (m.amount_crc ?? 0), 0);

export default function InvestorMovements() {
  const { refresh } = useSession();
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
  const hasUsd = movements.some((m) => m.currency === 'USD');

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader eyebrow="Estado de cuenta" title="Movimientos"
        subtitle={`Al ${longDate(todayKey())}. Solo lo confirmado por las dos partes suma en tus totales.`}
        actions={<StatementLink />} />

      <PortfolioFigures pf={pf} hasUsd={hasUsd} />

      {movements.length === 0 ? (
        <EmptyState icon={ReceiptText} tone="slate" title="Todavía no hay movimientos a tu nombre">
          Cuando JC Analytics registre tu primer aporte, aparece aquí para que lo confirmés.
        </EmptyState>
      ) : (
        <>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={filter} onChange={setFilter} tabs={[
              { value: 'todos', label: 'Todos', count: counts.todos },
              { value: 'pendientes', label: 'Por confirmar', count: counts.pendientes },
              { value: 'confirmados', label: 'Confirmados', count: counts.confirmados },
              { value: 'capital', label: 'Capital devuelto', count: counts.capital },
              { value: 'ganancias', label: 'Ganancias', count: counts.ganancias },
            ]} />
          </div>

          {groups.length === 0 ? (
            filter === 'pendientes'
              ? <EmptyState icon={CheckCheck} tone="teal" title="Nada por confirmar">Todos tus movimientos ya fueron confirmados o resueltos.</EmptyState>
              : <EmptyState icon={ListChecks} tone="slate" title="Sin movimientos en esta vista">Probá con otro filtro.</EmptyState>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => {
                const inMonth = confirmedCrc(g.items, 'aporte');
                const outMonth = confirmedCrc(g.items, 'retorno');
                const pendingMonth = g.items.filter((m) => m.status === 'pendiente').length;
                return (
                  <section key={g.key} aria-labelledby={`month-${g.key}`}>
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
                      {g.items.map((m) => <li key={m.id}><MovementItem m={m} showInvestment onChanged={changed} investmentLink /></li>)}
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
