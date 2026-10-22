// Inicio del portal de inversionistas: el control de tu capital de un vistazo.
// Orden: estado del doble control → totales confirmados → lo que espera tu confirmación →
// tus inversiones → disponibles → movimientos recientes y evolución → contacto.
// Totales consolidados en colones; cada inversión, en su moneda.
import { ArrowDown } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageHeader, PageLoader, SectionHead, RowArrow } from '../../components/ui.jsx';
import CashflowChart from '../../components/CashflowChart.jsx';
import { formatMoney, todayKey } from '../../lib/format.js';
import {
  ControlStatus, FigureNote, PositionRow, MovementItem, MovementRow, ContactCard, StatementLink, InvestmentStatusBadge,
  greeting, firstName, longDate, chartSeries,
} from '../components.jsx';
import { PortfolioFigures } from '../InvestorFigures.jsx';

function goToConfirm() {
  const section = document.getElementById('por-confirmar');
  if (!section) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  section.focus({ preventScroll: true });
}

/** Inversión habilitada por administración que todavía no tiene movimientos tuyos. */
function AvailableRow({ p }) {
  return (
    <Link to={`/inversionista/inversiones/${p.id}`} data-available-investment-id={p.id} className="group row min-h-16 px-4 py-3 sm:px-5">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-ink group-hover:text-brand-ink">{p.name}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{p.category_label} · {p.currency}</span>
          <InvestmentStatusBadge status={p.status} label={p.status_label} />
          <span>{p.can_contribute ? 'Aportes habilitados' : 'Solo consulta'}</span>
        </span>
      </span>
      {p.target_amount > 0 && (
        <span className="hidden shrink-0 text-right text-xs text-muted sm:block">
          Meta del proyecto<span className="num block text-sm font-semibold text-ink">{formatMoney(p.target_amount, p.currency)}</span>
        </span>
      )}
      <RowArrow />
    </Link>
  );
}

export default function InvestorHome() {
  const { refresh } = useSession();
  const { data, error, reload } = useResource('/api/investor/overview');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { me, portfolio: pf, investments, available_investments: available = [], to_confirm: toConfirm, recent, series, contacts } = data;
  const changed = () => { reload(); refresh(); };
  const hasUsd = investments.some((p) => p.currency === 'USD');
  const awaiting = Math.max(0, pf.pending_count - toConfirm.length);

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title={`${greeting()}, ${firstName(me.name)}`} subtitle={`Tu posición al ${longDate(todayKey())}.`} actions={<StatementLink />} />
      {error && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-soft px-4 py-2.5 text-sm text-amber-ink">
          No pudimos actualizar tu resumen; mostramos la última información disponible.
          <button type="button" className="link" onClick={reload}>Reintentar</button>
        </p>
      )}

      <ControlStatus toConfirm={toConfirm.length} awaiting={awaiting} empty={recent.length === 0}
        action={toConfirm.length > 0 && (
          <button type="button" className="btn btn-primary w-full shrink-0 sm:w-auto" onClick={goToConfirm}>
            Revisar y confirmar<ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        )} />

      <PortfolioFigures pf={pf} hasUsd={hasUsd} />

      {toConfirm.length > 0 && (
        <section id="por-confirmar" tabIndex={-1} className="card scroll-mt-24 overflow-hidden border-amber/50 outline-none" aria-labelledby="confirm-title">
          <SectionHead flush id="confirm-title" title="Por confirmar" hint="Registrados a tu nombre: revisá que coincidan." />
          <ul className="divide-y divide-line">
            {toConfirm.map((m) => <li key={m.id}><MovementItem m={m} showInvestment onChanged={changed} investmentLink /></li>)}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden" aria-labelledby="investments-title">
        <SectionHead flush id="investments-title" title="Tus inversiones" hint="Tu parte en cada una, solo lo confirmado." />
        {investments.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted sm:px-5">Cuando haya movimientos a tu nombre, sus inversiones aparecen aquí.</p>
        ) : (
          <ul className="divide-y divide-line">{investments.map((p) => <li key={p.id}><PositionRow p={p} /></li>)}</ul>
        )}
      </section>

      {available.length > 0 && (
        <section className="card overflow-hidden" aria-labelledby="available-title">
          <SectionHead flush id="available-title" title="Disponibles para vos" hint="Habilitadas por administración." />
          <ul className="divide-y divide-line">{available.map((p) => <li key={p.id}><AvailableRow p={p} /></li>)}</ul>
          <FigureNote>Tener acceso no registra ningún aporte ni cambia tu capital.</FigureNote>
        </section>
      )}

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-start">
        <section className="card overflow-hidden" aria-labelledby="recent-title">
          <SectionHead flush id="recent-title" title="Movimientos recientes"
            action={recent.length > 0 && <Link to="/inversionista/movimientos" className="link tap -my-2 flex items-center text-sm lg:min-h-9">Ver todos</Link>} />
          {recent.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted sm:px-5">Tus aportes y retornos aparecen aquí apenas se registren.</p>
          ) : (
            <ul className="divide-y divide-line">{recent.slice(0, 5).map((m) => <li key={m.id}><MovementRow m={m} /></li>)}</ul>
          )}
        </section>
        <section className="card overflow-hidden" aria-labelledby="chart-title">
          <SectionHead flush id="chart-title" title="Evolución de tu capital" hint="Acumulado en colones, solo lo confirmado." />
          <div className="p-4 sm:p-5"><CashflowChart series={chartSeries(series)} currency="CRC" height={220} /></div>
        </section>
      </div>

      <ContactCard contacts={contacts} />
    </div>
  );
}
