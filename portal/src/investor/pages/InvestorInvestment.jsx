// Detalle de una inversión desde la mirada del inversionista: estado del doble control, su
// posición (solo lo confirmado, en la moneda de la inversión), sus movimientos con el hilo
// de mensajes, los totales del grupo (solo agregados) y el aviso de un aporte propio, que
// queda "por confirmar" hasta que JC Analytics verifique la plata.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Info, SearchX, EyeOff } from 'lucide-react';
import { useResource, useSession } from '../../lib/session.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { Link, navigate, useLocation } from '../../lib/router.jsx';
import { PageLoader, Badge, ProgressBar, Modal, Field, EmptyState, SectionHead, Tabs, useAction, cx } from '../../components/ui.jsx';
import CashflowChart from '../../components/CashflowChart.jsx';
import { formatMoney, formatPercent, formatDate, todayKey } from '../../lib/format.js';
import {
  MovementItem, InvestmentStatusBadge, AmountInput, BackLink, ControlStatus, Figure, MiniFigure, FigureNote,
  expectedPct, chartSeries, netTone, receivedTone,
} from '../components.jsx';
import { AnnualProfitShare, ReturnFigures, isAdvertisingInvestment } from '../InvestorFigures.jsx';

const scrollBehavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

const LEDGER_FILTERS = {
  all: { label: 'Todos', matches: () => true },
  pending: { label: 'Pendientes', matches: (m) => m.status === 'pendiente' },
  confirmed: { label: 'Confirmados', matches: (m) => m.status === 'confirmado' },
  returns: { label: 'Retornos', matches: (m) => m.type === 'retorno' },
};

/** Aviso de un aporte propio: monto en la moneda de la inversión (se envían céntimos), fecha ≤ hoy y mensaje. */
function NoticeModal({ investment, onClose, onSaved, onAccessChanged }) {
  const [run, busy] = useAction();
  const cur = investment.currency;
  const today = todayKey();
  const [form, setForm] = useState({ amount: null, date: today, reference: '', message: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.amount > 0 && form.message.trim().length >= 3 && !!form.date && form.date <= today;

  async function save(e) {
    e.preventDefault();
    if (!valid) return;
    setErrors({});
    const body = { amount: form.amount, date: form.date, message: form.message.trim(), reference: form.reference.trim() || undefined };
    const res = await run(() => api(`/api/investor/investments/${investment.id}/movements`, { method: 'POST', body }), {
      success: 'Aviso enviado. JC Analytics lo confirma cuando verifique la plata.',
      onError: (err) => {
        setErrors(err?.data?.field ? { [err.data.field]: err.data.message } : { request: errorMessage(err) });
        if (err?.status === 404 || ['investment_not_allowed', 'investment_closed'].includes(err?.data?.error)) onAccessChanged();
      },
    });
    if (res) { onSaved(res.movement); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title="Avisar un aporte"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form="notice-form" className="btn btn-primary" disabled={busy || !valid}><Send className="h-4 w-4" aria-hidden="true" />{busy ? 'Enviando…' : 'Enviar aviso'}</button>
      </>}>
      <form id="notice-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={`Monto en ${cur === 'USD' ? 'dólares' : 'colones'}`} error={errors.amount}>
          {(id) => <AmountInput id={id} currency={cur} onChange={set('amount')} />}
        </Field>
        <Field label="Fecha del envío" hint="Hoy o una fecha anterior." error={errors.date ?? (form.date > today ? 'La fecha no puede ser futura.' : null)}>
          {(id) => <input id={id} type="date" className="input" max={today} value={form.date} onChange={(e) => set('date')(e.target.value)} required />}
        </Field>
        <Field label="Referencia SINPE o transferencia" hint="Opcional: ayuda a ubicar la plata más rápido." className="sm:col-span-2" error={errors.reference}>
          {(id) => <input id={id} className="input" maxLength={80} autoComplete="off" value={form.reference} onChange={(e) => set('reference')(e.target.value)} placeholder="Ej.: SINPE 70211" />}
        </Field>
        <Field label="Mensaje para JC Analytics" className="sm:col-span-2" hint="Contanos desde dónde la enviaste o cualquier detalle útil." error={errors.message}>
          {(id) => <textarea id={id} className="input" rows={3} maxLength={1000} value={form.message} onChange={(e) => set('message')(e.target.value)} placeholder="Ej.: Envié mi segundo tramo desde mi cuenta del BN." required />}
        </Field>
      </form>
      {errors.request && <p role="alert" className="mt-4 text-sm text-coral-ink">{errors.request}</p>}
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-ink" aria-hidden="true" />
        <span>El aviso queda <b className="font-semibold">por confirmar</b> hasta que JC Analytics verifique que recibió la plata; mientras tanto no suma en tus totales. Si te equivocaste, lo podés retirar mientras siga pendiente.</span>
      </p>
    </Modal>
  );
}

/** Tu posición en la inversión, en su moneda: lo confirmado, con lo pendiente aparte. */
function PositionFigures({ inv }) {
  const { mine, currency: cur } = inv;
  const money = (value) => formatMoney(value, cur);
  return (
    <section className="card overflow-hidden" aria-labelledby="position-title">
      <SectionHead flush id="position-title" title="Tu posición" hint={`En ${cur === 'USD' ? 'dólares' : 'colones'}, solo lo confirmado.`} />
      <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
        <Figure label="Aportado" value={money(mine.contributed)} valueProps={{ 'data-position-contributed': '' }}
          hint={mine.pending_contributions ? `${money(mine.pending_contributions)} pendiente, aparte` : 'Confirmado'} />
        <Figure label="Recibido" value={money(mine.returned)} tone={receivedTone(mine.returned)} valueProps={{ 'data-position-returned': '' }}
          hint={mine.pending_returns ? `${money(mine.pending_returns)} pendiente, aparte` : mine.returned ? 'Confirmado' : 'Todavía sin retornos'} />
        <Figure label="Neto" value={money(mine.net)} tone={netTone(mine.net, mine.contributed)} hint="Recibido menos aportado" valueProps={{ 'data-position-net': '' }} />
        <Figure label="Participación" value={formatPercent(mine.share, 1)} hint="Sobre el capital confirmado del grupo" valueProps={{ 'data-position-share': '' }}>
          <ProgressBar value={mine.share} tone="teal" label="Tu participación en la inversión" />
        </Figure>
      </dl>
      <ReturnFigures metrics={mine} currency={cur} />
    </section>
  );
}

/** La inversión completa: solo agregados del grupo, nunca nombres ni montos de otras personas. */
function ProjectTotals({ inv }) {
  const { totals, currency: cur } = inv;
  const progress = totals.target_progress;
  const estimates = !isAdvertisingInvestment(inv);
  const expected = estimates ? expectedPct(inv.expected_return_pct) : null;
  return (
    <section className="card overflow-hidden" aria-labelledby="project-title">
      <SectionHead flush id="project-title" title="El proyecto" hint="Totales del grupo, solo lo confirmado." />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5">
        <MiniFigure label="Capital total" value={formatMoney(totals.contributed, cur)} valueProps={{ 'data-project-contributed': '' }} />
        <MiniFigure label="Retornos totales" value={formatMoney(totals.returned, cur)} tone={receivedTone(totals.returned)} valueProps={{ 'data-project-returned': '' }} />
        <MiniFigure label="Participantes" value={totals.holders} valueProps={{ 'data-project-holders': '' }} />
        {expected && <MiniFigure label="Retorno esperado" value={expected} />}
        {estimates && inv.expected_date && <MiniFigure label="Recuperación prevista" value={formatDate(inv.expected_date)} />}
      </dl>
      {progress != null && (
        <div className="border-t border-line px-4 py-3.5 sm:px-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted">Meta de capital: <span className="num font-semibold text-ink">{formatMoney(inv.target_amount, cur)}</span></span>
            <span className={cx('num shrink-0 text-sm font-semibold', progress >= 1 ? 'text-teal-ink' : 'text-ink')}>{formatPercent(progress, 0)}</span>
          </div>
          <ProgressBar value={progress} tone={progress >= 1 ? 'teal' : 'brand'} label="Avance de la meta de capital" />
        </div>
      )}
      <FigureNote>
        <span className="flex items-start gap-2"><EyeOff className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />Los nombres y montos de otras personas son privados, igual que los tuyos.</span>
      </FigureNote>
    </section>
  );
}

export default function InvestorInvestment({ params }) {
  const { query } = useLocation();
  const highlight = Number(query.get('mov')) || null;
  const { refresh } = useSession();
  const { data, error, reload } = useResource(`/api/investor/investments/${params.id}`);
  const [notice, setNotice] = useState(false);
  const [ledgerSelection, setLedgerSelection] = useState({ key: 'all', highlight });
  // Un enlace directo siempre puede mostrar su movimiento, aunque hubiera otro filtro activo.
  const ledgerFilter = ledgerSelection.highlight === highlight ? ledgerSelection.key : 'all';
  const setLedgerFilter = (key) => setLedgerSelection({ key, highlight });
  // Estable: el modal reenfoca su primer campo cada vez que cambia onClose.
  const closeNotice = useCallback(() => setNotice(false), []);
  const scrolledTo = useRef(null);
  const name = data?.investment?.name;

  useEffect(() => { if (name) document.title = `${name} · Inversionistas · JC Analytics`; }, [name]);

  // El movimiento del aviso (?mov=) se resalta y se lleva a la vista una sola vez.
  useEffect(() => {
    if (!highlight || !data || scrolledTo.current === highlight) return;
    const el = document.getElementById(`mov-${highlight}`);
    if (!el) return;
    scrolledTo.current = highlight;
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  }, [highlight, data, ledgerFilter]);

  if (!data || error?.status === 404) {
    if (error?.status === 404) {
      return (
        <EmptyState icon={SearchX} tone="slate" className="mx-auto mt-6 max-w-lg" title="No encontramos esa inversión"
          action={<Link to="/inversionista" className="btn btn-primary">Volver al inicio</Link>}>
          Puede que el enlace esté incompleto o que no tengas acceso a esta inversión.
        </EmptyState>
      );
    }
    return <PageLoader error={error} onRetry={reload} />;
  }

  const { investment: inv, movements, series } = data;
  const cur = inv.currency;
  const closed = inv.status === 'cerrada' || inv.status === 'perdida';
  const canContribute = inv.can_contribute === true;
  const changed = () => { reload(); refresh(); };
  const toConfirm = movements.filter((m) => m.can_resolve).length;
  const awaiting = movements.filter((m) => m.status === 'pendiente' && !m.can_resolve).length;
  const shown = movements.filter(LEDGER_FILTERS[ledgerFilter].matches);
  const accessNote = closed ? 'Esta inversión ya no recibe aportes. Tu historial sigue disponible.'
    : canContribute ? '¿Enviaste plata? Avisanos y JC Analytics la confirma.'
      : 'Los nuevos aportes requieren que administración habilite tu acceso. Tu historial sigue disponible.';

  const showPending = () => {
    setLedgerFilter('pending');
    const ledger = document.getElementById('ii-ledger');
    ledger?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    ledger?.focus({ preventScroll: true });
  };
  const onNoticeSaved = (movement) => {
    setLedgerFilter('all');
    changed();
    if (movement?.id) navigate(`/inversionista/inversiones/${inv.id}?mov=${movement.id}`, { replace: true });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <BackLink to="/inversionista">Inicio</BackLink>
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">{inv.category_label} · {cur === 'USD' ? 'Dólares' : 'Colones'}</p>
            <h1 className="mt-1 font-display text-[26px] font-bold leading-tight sm:text-[30px]">{inv.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <InvestmentStatusBadge status={inv.status} label={inv.status_label} />
              {inv.project_name && <Badge tone="blue">{inv.project_name}</Badge>}
            </div>
            {inv.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-2">{inv.description}</p>}
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 lg:max-w-xs lg:items-end">
            <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!canContribute} aria-describedby="contribution-access-note" onClick={() => setNotice(true)}>
              <Send className="h-4 w-4" aria-hidden="true" />Avisar un aporte
            </button>
            <p id="contribution-access-note" className="text-xs text-muted lg:text-right">{accessNote}</p>
          </div>
        </div>
      </header>

      <ControlStatus toConfirm={toConfirm} awaiting={awaiting} empty={movements.length === 0}
        action={(toConfirm > 0 || awaiting > 0) && (
          <button type="button" className="btn btn-outline w-full shrink-0 sm:w-auto" onClick={showPending}>Ver pendientes</button>
        )} />

      <PositionFigures inv={inv} />
      <AnnualProfitShare investment={inv} />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <section id="ii-ledger" tabIndex={-1} className="card scroll-mt-24 overflow-hidden outline-none" aria-labelledby="ledger-title">
          <SectionHead flush id="ledger-title" title="Movimientos" hint="Con sus mensajes y confirmaciones." />
          {movements.length > 0 && (
            <div className="no-scrollbar overflow-x-auto border-b border-line px-4 py-2.5 sm:px-5">
              <Tabs value={ledgerFilter} onChange={setLedgerFilter}
                tabs={Object.entries(LEDGER_FILTERS).map(([value, f]) => ({ value, label: f.label, count: movements.filter(f.matches).length }))} />
            </div>
          )}
          {shown.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted sm:px-5">
              <p>{movements.length === 0 ? 'Todavía no hay movimientos a tu nombre en esta inversión.' : 'No hay movimientos en esta vista.'}</p>
              {ledgerFilter !== 'all' && <button type="button" className="link mt-2" onClick={() => setLedgerFilter('all')}>Ver todos</button>}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((m) => <li key={m.id}><MovementItem m={m} highlight={m.id === highlight} onChanged={changed} /></li>)}
            </ul>
          )}
        </section>

        <aside className="space-y-5 sm:space-y-6" aria-label="El proyecto y la evolución de tu capital">
          <ProjectTotals inv={inv} />
          <section className="card overflow-hidden" aria-labelledby="ii-chart-title">
            <SectionHead flush id="ii-chart-title" title="Evolución" hint={`Tu capital en ${cur === 'USD' ? 'dólares' : 'colones'}, solo lo confirmado.`} />
            <div className="p-4 sm:p-5"><CashflowChart series={chartSeries(series)} currency={cur} height={200} /></div>
          </section>
        </aside>
      </div>

      {notice && canContribute && <NoticeModal investment={inv} onClose={closeNotice} onSaved={onNoticeSaved} onAccessChanged={reload} />}
    </div>
  );
}
