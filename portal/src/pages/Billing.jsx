// Cobros (solo socios y admin): cuánto entra de forma recurrente al mes, qué toca cobrar cada mes,
// la proyección de los próximos 6 meses y todas las líneas de cobro de los proyectos.
// Cada línea se configura en su proyecto (tarjeta "Cobros"); el calendario sale de shared/billing.js.
import { useState } from 'react';
import { Receipt, Repeat, CalendarDays, ChevronLeft, ChevronRight, Download, ChartColumn, ListChecks, FolderKanban, Wallet } from 'lucide-react';
import { useResource } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Stat, SectionHead, Badge, IconTile, ProgressBar, RowArrow, cx } from '../components/ui.jsx';
import { chargeText } from '../components/charges.jsx';
import { BILLING_FREQUENCIES, isRecurring, shiftMonth } from '../../shared/billing.js';
import { formatMoney, formatDate, formatDayLong, todayKey } from '../lib/format.js';

const monthFmt = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonthFmt = new Intl.DateTimeFormat('es-CR', { month: 'short', timeZone: 'UTC' });
const monthName = (key, fmt = monthFmt) => fmt.format(new Date(`${key}-01T12:00:00Z`));
const crc = (amount) => formatMoney(amount, 'CRC');

/** Cobros del mes agrupados por día. */
function MonthCalendar({ month, today }) {
  const days = [];
  for (const item of month.items) {
    const last = days.at(-1);
    if (last?.[0] === item.date) last[1].push(item);
    else days.push([item.date, [item]]);
  }
  if (!days.length) return <p className="px-4 py-5 text-sm text-muted sm:px-5">No hay cobros en {monthName(month.key)}.</p>;
  return (
    <ol className="divide-y divide-line">
      {days.map(([date, items]) => {
        const past = date < today;
        return (
          <li key={date} className={cx('px-4 py-3 sm:px-5', past && 'opacity-65')}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">
              <span className="first-letter:uppercase">{formatDayLong(date)}</span>
              {date === today && <Badge tone="teal">Hoy</Badge>}
              {past && <span className="font-medium normal-case tracking-normal">· ya pasó</span>}
            </p>
            <ul className="mt-1.5 space-y-1">
              {items.map((item) => (
                <li key={`${item.charge_id}-${item.date}`}>
                  <Link to={`/proyectos/${item.project_id}`} className="group row min-h-11 rounded-xl px-2 py-1.5 -mx-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.client_name || item.project_name}</span>
                      <span className="block truncate text-xs text-muted">{item.project_name}{item.concept ? ` · ${item.concept}` : ''} · {BILLING_FREQUENCIES[item.frequency].label}</span>
                    </span>
                    <span className="num shrink-0 text-right text-sm font-bold text-ink">
                      {formatMoney(item.amount, item.currency)}
                      {item.currency === 'USD' && <span className="block text-[11px] font-medium text-muted">≈ {crc(item.amount_crc)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

/** Proyección: lo que se espera cobrar en cada uno de los próximos 6 meses. */
function Projection({ projection, onPick, selected }) {
  const max = Math.max(1, ...projection.map((p) => p.total_crc));
  return (
    <ul className="space-y-2.5 px-4 py-4 sm:px-5">
      {projection.map((p) => (
        <li key={p.month}>
          <button type="button" onClick={() => onPick(p.month)} aria-pressed={selected === p.month}
            className={cx('w-full rounded-xl px-2 py-1.5 text-left transition -mx-2 hover:bg-surface-2', selected === p.month && 'bg-surface-2')}>
            <span className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold capitalize text-ink">{monthName(p.month, shortMonthFmt)}</span>
              <span className="num font-bold text-ink">{crc(p.total_crc)}<span className="ml-1.5 text-xs font-medium text-muted">{p.count} {p.count === 1 ? 'cobro' : 'cobros'}</span></span>
            </span>
            <ProgressBar value={p.total_crc / max} tone="teal" label={`Cobros de ${monthName(p.month)}`} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Billing() {
  const today = todayKey();
  const [month, setMonth] = useState(today.slice(0, 7));
  const { data, error, reload } = useResource(`/api/billing?month=${month}`);
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { totals, projection, charges, month: m } = data;
  const isCurrent = m.key === today.slice(0, 7);

  return (
    <>
      <PageHeader eyebrow="Empresa" title="Cobros" icon={Receipt} tone="teal"
        subtitle="Pagos únicos y cobros recurrentes de cada proyecto: cuánto entra al mes y qué toca cobrar."
        actions={charges.length > 0 && <a className="btn btn-outline" href="/api/billing/export.csv" download><Download className="h-4 w-4" />Excel (12 meses)</a>} />

      {charges.length === 0 ? (
        <EmptyState icon={Receipt} tone="teal" title="Todavía no hay cobros configurados"
          action={<Link to="/proyectos" className="btn btn-primary"><FolderKanban className="h-4 w-4" />Ir a proyectos</Link>}>
          Entrá a un proyecto y usá «Agregar» en la tarjeta Cobros: pago único o cada semana, quincena, mes…
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section className="stagger grid gap-3 sm:grid-cols-3" aria-label="Totales">
            <Stat label="Recurrente al mes" value={crc(totals.monthly_crc)} icon={Repeat} tone="teal"
              hint={`${totals.recurring_count} ${totals.recurring_count === 1 ? 'cobro' : 'cobros'} · ${totals.recurring_clients} ${totals.recurring_clients === 1 ? 'cliente' : 'clientes'} · ${crc(totals.annual_crc)} al año`} />
            <Stat label={`Cobros de ${monthName(m.key)}`} value={crc(m.total_crc)} icon={CalendarDays} tone="blue"
              hint={isCurrent ? `${m.items.length} en el mes · faltan ${crc(m.pending_crc)}` : `${m.items.length} ${m.items.length === 1 ? 'cobro' : 'cobros'} en el mes`} />
            <Stat label="Pagos únicos pendientes" value={crc(totals.one_time_pending_crc)} icon={Wallet} tone="slate" hint={`Próximos 30 días: ${crc(totals.upcoming_30_crc)} en total`} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <section className="card animate-rise overflow-hidden" aria-labelledby="month-title">
              <SectionHead flush id="month-title" icon={CalendarDays} tone="blue" title={<span className="inline-block first-letter:uppercase">{monthName(m.key)}</span>}
                hint={`${m.items.length} ${m.items.length === 1 ? 'cobro' : 'cobros'} · ${crc(m.total_crc)}`}
                action={(
                  <span className="flex gap-1">
                    <button type="button" className="btn btn-ghost btn-sm tap" onClick={() => setMonth(shiftMonth(m.key, -1))} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></button>
                    {!isCurrent && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonth(today.slice(0, 7))}>Hoy</button>}
                    <button type="button" className="btn btn-ghost btn-sm tap" onClick={() => setMonth(shiftMonth(m.key, 1))} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></button>
                  </span>
                )} />
              <MonthCalendar month={m} today={today} />
            </section>

            <aside className="space-y-6">
              <section className="card animate-rise overflow-hidden" aria-labelledby="projection-title">
                <SectionHead flush id="projection-title" icon={ChartColumn} tone="teal" title="Próximos 6 meses" hint="Recurrente + pagos únicos. Tocá un mes para verlo." />
                <Projection projection={projection} selected={m.key} onPick={setMonth} />
              </section>

              <section className="card animate-rise overflow-hidden" aria-labelledby="lines-title">
                <SectionHead flush id="lines-title" icon={ListChecks} tone="slate" title="Cobros configurados" hint={`${charges.length} ${charges.length === 1 ? 'línea' : 'líneas'} en ${new Set(charges.map((c) => c.project_id)).size} proyectos`} />
                <ul className="divide-y divide-line">
                  {charges.map((c) => (
                    <li key={c.id}>
                      <Link to={`/proyectos/${c.project_id}`} className={cx('group row min-h-14 px-4 py-2.5 sm:px-5', !c.counts && 'opacity-70')}>
                        <IconTile icon={isRecurring(c) ? Repeat : Receipt} tone={isRecurring(c) ? 'teal' : 'slate'} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{c.client_name || c.project_name}</span>
                          <span className="block truncate text-xs text-muted">{chargeText(c)}{c.concept ? ` · ${c.concept}` : ''}</span>
                          <span className="block truncate text-xs text-muted">
                            {c.counts ? (c.next_date ? <>Próximo: <span className="first-letter:uppercase">{formatDate(c.next_date)}</span></> : 'Sin cobros pendientes') : `No suma: proyecto ${c.project_archived ? 'archivado' : c.project_status_label.toLowerCase()}`}
                          </span>
                        </span>
                        <RowArrow />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
