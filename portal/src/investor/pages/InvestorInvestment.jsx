// Detalle de una inversión desde la mirada del inversionista: su posición completa, los
// totales del grupo (solo agregados), sus movimientos con el hilo de mensajes y el aviso
// de un aporte propio (queda "por confirmar" hasta que JC Analytics verifique la plata).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TrendingUp, ArrowUpRight, ArrowDownLeft, Scale, PieChart, Percent, BookOpen, Users, ChartLine, Send, Info, Target, EyeOff, SearchX,
} from 'lucide-react';
import { useResource, useSession } from '../../lib/session.jsx';
import { api } from '../../lib/api.js';
import { Link, navigate, useLocation } from '../../lib/router.jsx';
import { PageLoader, Stat, Badge, ProgressBar, Modal, Field, EmptyState, IconTile, SectionHead, useAction, cx } from '../../components/ui.jsx';
import CashflowChart from '../../components/CashflowChart.jsx';
import { formatMoney, formatPercent, formatMultiple, formatDate, todayKey } from '../../lib/format.js';
import { MovementItem, InvestmentStatusBadge, AmountInput, BackLink, plural, expectedPct, chartSeries, netReading } from '../components.jsx';

/** Aviso de un aporte propio: monto en la moneda de la inversión (se envían céntimos), fecha ≤ hoy y mensaje. */
function NoticeModal({ investment, onClose, onSaved }) {
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
      onError: (err) => { if (err?.data?.field) setErrors({ [err.data.field]: err.data.message }); },
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
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-ink" aria-hidden="true" />
        <span>El aviso queda <b className="font-semibold">por confirmar</b> hasta que JC Analytics verifique que recibió la plata; mientras tanto no suma en tus totales. Si te equivocaste, lo podés retirar mientras siga pendiente.</span>
      </p>
    </Modal>
  );
}

function TotalsCard({ inv }) {
  const cur = inv.currency;
  const { totals } = inv;
  const progress = totals.target_progress;
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="totals-title">
      <SectionHead flush id="totals-title" icon={Users} tone="teal" title="La inversión completa" hint="Totales del grupo, solo lo confirmado." />
      <dl className="grid grid-cols-2 gap-px bg-line">
        <div className="min-w-0 bg-surface px-4 py-3.5 sm:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Capital total</dt>
          <dd className="num mt-1 truncate text-lg font-bold text-ink">{formatMoney(totals.contributed, cur)}</dd>
        </div>
        <div className="min-w-0 bg-surface px-4 py-3.5 sm:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Retornos totales</dt>
          <dd className="num mt-1 truncate text-lg font-bold text-teal-ink">{formatMoney(totals.returned, cur)}</dd>
        </div>
        <div className="col-span-2 min-w-0 bg-surface px-4 py-3.5 sm:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Participantes</dt>
          <dd className="mt-1 text-sm text-ink-2"><span className="num text-lg font-bold text-ink">{totals.holders}</span> {totals.holders === 1 ? 'persona con capital confirmado' : 'personas con capital confirmado'}, incluyéndote.</dd>
        </div>
      </dl>
      {progress != null && (
        <div className="border-t border-line px-4 py-3.5 sm:px-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-ink"><Target className="h-3.5 w-3.5 text-muted" aria-hidden="true" />Meta de capital</span>
            <span className="num shrink-0 text-muted">{formatMoney(inv.target_amount, cur, { compact: true })} · <span className={cx('font-bold', progress >= 1 ? 'text-teal-ink' : 'text-ink')}>{formatPercent(progress, 0)}</span></span>
          </div>
          <ProgressBar value={progress} tone={progress >= 1 ? 'teal' : 'brand'} label="Avance de la meta de capital" />
          {progress >= 1 && <p className="mt-1.5 text-xs text-teal-ink">Meta de capital lograda.</p>}
        </div>
      )}
      <p className="flex items-start gap-2 border-t border-line bg-surface-2/60 px-4 py-3 text-xs text-muted sm:px-5">
        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Ves los totales del grupo; los nombres y montos de cada participante son privados, igual que los tuyos.
      </p>
    </section>
  );
}

export default function InvestorInvestment({ params }) {
  const { query } = useLocation();
  const { refresh } = useSession();
  const { data, error, reload } = useResource(`/api/investor/investments/${params.id}`);
  const [notice, setNotice] = useState(false);
  // Estable: el modal reenfoca su primer campo cada vez que cambia onClose.
  const closeNotice = useCallback(() => setNotice(false), []);
  const highlight = Number(query.get('mov')) || null;
  const scrolledTo = useRef(null);
  const name = data?.investment?.name;

  useEffect(() => { if (name) document.title = `${name} · Inversionistas · JC Analytics`; }, [name]);

  // El movimiento del aviso (?mov=) se resalta y se lleva a la vista una sola vez.
  useEffect(() => {
    if (!highlight || !data || scrolledTo.current === highlight) return;
    const el = document.getElementById(`mov-${highlight}`);
    if (!el) return;
    scrolledTo.current = highlight;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, data]);

  if (!data) {
    if (error?.status === 404) {
      return (
        <EmptyState icon={SearchX} tone="slate" className="mx-auto mt-6 max-w-lg" title="No encontramos esa inversión"
          action={<Link to="/inversionista" className="btn btn-primary">Volver a mi inversión</Link>}>
          Puede que el enlace esté incompleto o que no tengas movimientos en ella.
        </EmptyState>
      );
    }
    return <PageLoader error={error} onRetry={reload} />;
  }

  const { investment: inv, movements, series } = data;
  const cur = inv.currency;
  const mine = inv.mine;
  const closed = inv.status === 'cerrada' || inv.status === 'perdida';
  const changed = () => { reload(); refresh(); };
  const pendingMine = movements.filter((m) => m.status === 'pendiente').length;
  const expected = expectedPct(inv.expected_return_pct);
  const net = netReading(mine.net, mine.contributed);

  const onNoticeSaved = (movement) => {
    changed();
    if (movement?.id) navigate(`/inversionista/inversiones/${inv.id}?mov=${movement.id}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <BackLink to="/inversionista">Mi inversión</BackLink>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile icon={TrendingUp} tone="teal" size="lg" className="mt-0.5 hidden sm:inline-flex" />
            <div className="min-w-0">
              <p className="eyebrow">{inv.category_label} · {cur === 'USD' ? 'Dólares' : 'Colones'}</p>
              <h1 className="mt-1 font-display text-[26px] font-bold leading-tight sm:text-[32px]">{inv.name}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <InvestmentStatusBadge status={inv.status} label={inv.status_label} />
                {inv.project_name && <Badge tone="blue">{inv.project_name}</Badge>}
                {expected && <Badge>Retorno esperado {expected}</Badge>}
                {inv.expected_date && <Badge>Recuperación prevista {formatDate(inv.expected_date)}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
            <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={closed} onClick={() => setNotice(true)}>
              <Send className="h-4 w-4" aria-hidden="true" />Avisar un aporte
            </button>
            <p className="text-xs text-muted sm:text-right">{closed ? 'Esta inversión ya no recibe aportes.' : '¿Enviaste plata? Avisanos y la confirmamos.'}</p>
          </div>
        </div>
        {inv.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-2 sm:ml-[60px]">{inv.description}</p>}
      </header>

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Tu posición">
        <Stat label="Aportaste" value={formatMoney(mine.contributed, cur)} icon={ArrowUpRight} tone="blue"
          hint={mine.pending_contributions ? `+ ${formatMoney(mine.pending_contributions, cur)} pendiente` : 'Confirmado'} />
        <Stat label="Recibiste" value={formatMoney(mine.returned, cur)} icon={ArrowDownLeft} tone="teal"
          hint={mine.pending_returns ? `+ ${formatMoney(mine.pending_returns, cur)} pendiente` : mine.returned ? 'Confirmado' : 'Todavía sin retornos'} />
        <Stat label="Neto" value={formatMoney(mine.net, cur)} icon={Scale} tone={net.good ? 'teal' : 'slate'} hint={net.short} />
        <Stat label="Participación" value={formatPercent(mine.share)} icon={PieChart} tone="violet"
          hint={`De ${plural(inv.totals.holders, 'participante', 'participantes')}`} />
      </section>

      <div className="card animate-rise flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm sm:px-5">
        <span className="flex items-center gap-2 text-muted"><Percent className="h-4 w-4" aria-hidden="true" />Múltiplo (MOIC) <span className="num font-bold text-ink">{formatMultiple(mine.moic)}</span></span>
        <span className="flex items-center gap-2 text-muted">TIR anual <span className="num font-bold text-ink">{mine.irr == null ? '—' : formatPercent(mine.irr, 1)}</span>
          {mine.irr == null && <span className="text-xs text-muted-2">(se calcula con al menos un retorno)</span>}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section aria-labelledby="ledger-title" className="min-w-0">
          <SectionHead id="ledger-title" icon={BookOpen} tone="blue" title="Tus movimientos" className="flex-wrap"
            hint={pendingMine ? `${plural(pendingMine, 'movimiento', 'movimientos')} sin confirmar todavía.` : 'Cada aporte o retorno, con su mensaje y su confirmación.'} />
          {movements.length === 0 ? (
            <EmptyState icon={BookOpen} title="Sin movimientos todavía">Cuando haya un aporte o un retorno a tu nombre, aparece aquí.</EmptyState>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {movements.map((m) => <li key={m.id}><MovementItem m={m} highlight={m.id === highlight} defaultOpen={m.can_resolve} onChanged={changed} /></li>)}
            </ul>
          )}
        </section>

        <aside className="min-w-0 space-y-6" aria-label="Totales y evolución">
          <TotalsCard inv={inv} />
          <section className="card animate-rise overflow-hidden" aria-labelledby="chart-title">
            <SectionHead flush id="chart-title" icon={ChartLine} tone="blue" title="Tu capital en esta inversión" hint={cur === 'USD' ? 'En dólares, solo lo confirmado.' : 'Aportado y retornado, solo lo confirmado.'} />
            <div className="p-4 sm:p-5"><CashflowChart series={chartSeries(series)} currency={cur} height={210} /></div>
          </section>
        </aside>
      </div>

      {notice && <NoticeModal investment={inv} onClose={closeNotice} onSaved={onNoticeSaved} />}
    </div>
  );
}
