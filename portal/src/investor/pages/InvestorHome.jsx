// Inicio del portal de inversionistas ("Mi inversión"): el estado de tu capital con JC Analytics
// de un vistazo. Primero lo que espera tu confirmación; después tus inversiones, la evolución,
// lo reciente y a quién escribirle. Montos consolidados en colones (solo lo confirmado).
import { HandCoins, Layers, ChartLine, History, Hourglass, Download, ReceiptText, Sparkles, BellRing, ArrowDown, ArrowRight } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageLoader, EmptyState, IconTile, SectionHead, Badge, cx } from '../../components/ui.jsx';
import CashflowChart from '../../components/CashflowChart.jsx';
import { formatMoney, formatPercent, formatMultiple, formatDayLong, todayKey } from '../../lib/format.js';
import { MovementItem, MovementRow, PositionCard, ContactCard, TrustNote, SeeAll, greeting, firstName, plural, chartSeries, netReading } from '../components.jsx';

/** Cifra del panel: etiqueta, valor en Bricolage y una línea de apoyo. */
function HeroFigure({ label, value, hint, tone }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/[0.07]">
      <dt className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-panel-muted">{label}</dt>
      <dd className={cx('num mt-1 truncate text-[21px] font-bold leading-none sm:text-2xl', tone ?? 'text-white')}>{value}</dd>
      {hint && <dd className="mt-1.5 text-[11px] leading-snug text-panel-muted">{hint}</dd>}
    </div>
  );
}

function statusLine(toConfirm, pf, hasInvestments) {
  if (toConfirm) return { tone: 'amber', icon: BellRing, text: `Tenés ${plural(toConfirm, 'movimiento esperando', 'movimientos esperando')} tu confirmación.` };
  if (pf.pending_count) {
    return { tone: 'amber', icon: Hourglass, text: `${plural(pf.pending_count, 'movimiento en tránsito', 'movimientos en tránsito')}: JC Analytics ${pf.pending_count === 1 ? 'lo confirma' : 'los confirma'} al verificar la plata.` };
  }
  if (!hasInvestments) return { tone: 'teal', icon: Sparkles, text: 'Cuando JC Analytics registre tu primer aporte, te avisamos para que lo confirmés.' };
  return { tone: 'teal', icon: Sparkles, text: 'Todo al día: tus movimientos están confirmados por las dos partes.' };
}

export default function InvestorHome() {
  const { refresh } = useSession();
  const { data, error, reload } = useResource('/api/investor/overview');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { me, portfolio: pf, investments, to_confirm: toConfirm, recent, series, contacts } = data;
  const changed = () => { reload(); refresh(); };
  const payback = pf.contributed_crc ? pf.returned_crc / pf.contributed_crc : 0;
  const net = netReading(pf.net_crc, pf.contributed_crc);
  const hasUsd = investments.some((i) => i.currency === 'USD');
  const status = statusLine(toConfirm.length, pf, investments.length > 0);
  const scrollToConfirm = () => document.getElementById('por-confirmar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6">
      {/* Estado del capital: momento de marca, como la portada de un estado de cuenta. */}
      <section className="card-panel animate-rise p-5 sm:p-7 lg:p-8" aria-labelledby="home-title">
        <div className="grid-dots-light absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_90%_at_85%_0%,black,transparent)]" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal first-letter:uppercase">{formatDayLong(todayKey())}</p>
              <h1 id="home-title" className="mt-2 font-display text-[28px] font-bold leading-tight text-white sm:text-[36px]">{greeting()}, {firstName(me.name)}</h1>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">Este es el estado de tu capital con JC Analytics.</p>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <p className={cx('inline-flex items-start gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-sm font-medium text-white/90', status.tone === 'amber' && 'ring-1 ring-amber/50')}>
                <status.icon className={cx('mt-0.5 h-4 w-4 shrink-0', status.tone === 'amber' ? 'text-amber' : 'text-teal')} aria-hidden="true" />
                {status.text}
              </p>
              {toConfirm.length > 0 && (
                <button type="button" onClick={scrollToConfirm} className="btn bg-white text-panel shadow-raised hover:bg-white/90">
                  <HandCoins className="h-4 w-4 text-brand" aria-hidden="true" />Revisar y confirmar<ArrowDown className="h-4 w-4 text-muted" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-end">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-panel-muted">Capital aportado</p>
              <p className="num mt-2 truncate text-[clamp(34px,10vw,48px)] font-bold leading-none text-white">{formatMoney(pf.contributed_crc, 'CRC')}</p>
              <p className="mt-2 text-sm text-panel-muted">
                Confirmado por las dos partes{investments.length > 1 ? ` · en ${plural(investments.length, 'inversión', 'inversiones')}` : ''}.
              </p>
              <div className="mt-5 max-w-md">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-panel-muted">Recuperado de tu capital</span>
                  <span className="num text-sm font-bold text-white">{formatPercent(payback, 0)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(Math.min(1, payback) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Recuperado de tu capital">
                  <div className="h-full rounded-full bg-teal transition-[width] duration-700 ease-out" style={{ width: `${Math.min(1, payback) * 100}%` }} />
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <HeroFigure label="Retornos" value={formatMoney(pf.returned_crc, 'CRC')} tone="text-teal" hint={pf.returned_crc ? 'Lo que ya volvió a vos' : 'Todavía sin retornos recibidos'} />
              <HeroFigure label="Neto" value={formatMoney(pf.net_crc, 'CRC')} tone={net.good ? 'text-teal' : 'text-white'} hint={net.hint} />
              <HeroFigure label="Múltiplo (MOIC)" value={formatMultiple(pf.moic)} hint="Retornado ÷ aportado" />
              <HeroFigure label="TIR anual" value={pf.irr == null ? '—' : formatPercent(pf.irr, 1)}
                hint={pf.irr == null ? 'Se calcula con al menos un retorno' : 'Rendimiento anual según fechas reales'} />
            </dl>
          </div>
          {hasUsd && <p className="mt-4 text-xs text-panel-muted">Montos en colones: lo que está en dólares se convierte con el tipo de cambio guardado en cada movimiento.</p>}
        </div>
      </section>

      {toConfirm.length > 0 && (
        <section id="por-confirmar" className="card animate-rise scroll-mt-32 overflow-hidden border-amber/40" aria-labelledby="confirm-title">
          <SectionHead flush id="confirm-title" icon={HandCoins} tone="amber" title="Por confirmar"
            hint="Registrados a tu nombre: esperan tu respuesta."
            action={<Badge tone="amber">{toConfirm.length}</Badge>} />
          <ul className="divide-y divide-line">
            {/* Abiertos de entrada solo los dos primeros: con muchos pendientes la lista sigue siendo legible. */}
            {toConfirm.map((m, i) => <li key={m.id}><MovementItem m={m} showInvestment defaultOpen={i < 2} onChanged={changed} investmentLink /></li>)}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="investments-title" className="animate-rise">
            <div className="section-head mb-3">
              <div className="flex min-w-0 items-center gap-3">
                <IconTile icon={Layers} tone="blue" size="sm" />
                <div className="min-w-0">
                  <h2 id="investments-title" className="section-title">Tus inversiones</h2>
                  <p className="truncate text-xs text-muted">Tu parte en cada una y los totales del grupo.</p>
                </div>
              </div>
            </div>
            {investments.length === 0 ? (
              <EmptyState icon={Layers} title="Todavía no hay movimientos a tu nombre">
                Cuando JC Analytics registre tu primer aporte, lo vas a ver aquí para confirmarlo.
              </EmptyState>
            ) : (
              <div className={cx('stagger grid gap-3 sm:gap-4', investments.length > 1 && 'md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2')}>
                {investments.map((p) => <PositionCard key={p.id} p={p} />)}
              </div>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="chart-title">
            <SectionHead flush id="chart-title" icon={ChartLine} tone="blue" title="Evolución de tu capital"
              hint={hasUsd ? 'En colones, según cada movimiento.' : 'Acumulado, solo lo confirmado.'} />
            <div className="p-4 sm:p-5"><CashflowChart series={chartSeries(series)} currency="CRC" height={240} /></div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Contacto, movimientos recientes y estado de cuenta">
          <ContactCard contacts={contacts} className="animate-rise" />

          <section className="card animate-rise overflow-hidden" aria-labelledby="recent-title">
            <SectionHead flush id="recent-title" icon={History} tone="teal" title="Movimientos recientes"
              action={recent.length > 0 && <span className="hidden sm:flex"><SeeAll to="/inversionista/movimientos">Ver todos</SeeAll></span>} />
            {recent.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted sm:px-5">Aquí vas a ver tus aportes y retornos apenas se registren.</p>
            ) : (
              <>
                <ul className="divide-y divide-line">{recent.slice(0, 5).map((m) => <li key={m.id}><MovementRow m={m} /></li>)}</ul>
                <Link to="/inversionista/movimientos" className="tap flex items-center justify-center gap-1.5 border-t border-line bg-surface-2/60 px-4 py-3 text-sm font-semibold text-brand-ink sm:hidden">
                  Ver todos los movimientos<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </>
            )}
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="statement-title">
            <SectionHead flush id="statement-title" icon={ReceiptText} tone="violet" title="Estado de cuenta" hint="Todos tus movimientos, listos para Excel." />
            <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-1 xl:grid-cols-2">
              <a href="/api/investor/statement.csv" download className="btn btn-outline tap"><Download className="h-4 w-4" aria-hidden="true" />Descargar (Excel)</a>
              <Link to="/inversionista/movimientos" className="btn btn-ghost tap">Ver movimientos</Link>
            </div>
          </section>

          <TrustNote className="animate-rise" />
        </aside>
      </div>
    </div>
  );
}
