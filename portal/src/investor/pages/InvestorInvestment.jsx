// Detalle de una inversión desde la mirada del inversionista: su posición completa, los
// totales del grupo (solo agregados), sus movimientos con el hilo de mensajes y el aviso
// de un aporte propio (queda "por confirmar" hasta que JC Analytics verifique la plata).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, Scale, PieChart, BookOpen, Users, ChartLine, Send, Info, Target, EyeOff, SearchX, ArrowDown, ArrowRight, ShieldCheck, Clock3, Sparkles, MessageCircle, CircleCheck,
} from 'lucide-react';
import { useResource, useSession } from '../../lib/session.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { Link, navigate, useLocation } from '../../lib/router.jsx';
import { PageLoader, Badge, ProgressBar, Modal, Field, EmptyState, useAction } from '../../components/ui.jsx';
import CashflowChart from '../../components/CashflowChart.jsx';
import { formatMoney, formatPercent, formatMultiple, formatDate, todayKey } from '../../lib/format.js';
import { MovementItem, InvestmentStatusBadge, AmountInput, BackLink, plural, expectedPct, chartSeries, netReading } from '../components.jsx';
import '../../styles/investor-investment.css';
import { AnnualProfitShare, ReturnBreakdown, isAdvertisingInvestment } from '../InvestorReturns.jsx';

const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('.investor-club')?.dataset.motion === 'paused' ? 'auto' : 'smooth';

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

// Una portada editorial hecha con formas, papel y conexiones; no representa rendimientos.
function IdeaCover() {
  return <div className="ii-cover" aria-hidden="true"><svg viewBox="0 0 560 370" fill="none" focusable="false">
    <circle cx="350" cy="171" r="143" fill="var(--ii-lavender)" />
    <path d="M44 305C91 226 101 355 161 286C197 245 187 213 236 238" stroke="var(--ii-plum)" strokeWidth="3" strokeLinecap="round" />
    <g transform="rotate(-10 200 171)"><rect x="76" y="72" width="235" height="226" rx="18" fill="var(--ii-cream)" stroke="var(--ii-plum)" strokeWidth="2" /><path d="M96 106H292" stroke="var(--ii-plum)" strokeWidth="1.5" /><circle cx="105" cy="91" r="3" fill="var(--ii-coral)" /><circle cx="116" cy="91" r="3" fill="var(--ii-lavender)" /><circle cx="127" cy="91" r="3" fill="var(--ii-plum)" /><path d="M122 183C122 151 149 124 181 124C213 124 240 151 240 183V243H122V183Z" fill="var(--ii-coral)" /><path d="M156 243V185C156 171 167 160 181 160C195 160 207 171 207 185V243" stroke="var(--ii-plum)" strokeWidth="2" /><path d="M107 260H260M107 273H202" stroke="var(--ii-plum)" strokeWidth="1.5" /></g>
    <g transform="rotate(9 350 227)"><rect x="241" y="116" width="210" height="211" rx="17" fill="var(--ii-plum)" /><path d="M266 141H307M266 151H291" stroke="var(--ii-cream)" strokeWidth="2" strokeLinecap="round" /><path d="M344 168C298 133 281 196 326 216C280 235 309 293 345 257C374 301 420 254 380 226C431 214 409 154 369 183C367 146 337 137 344 168Z" fill="var(--ii-lavender)" /><circle cx="350" cy="217" r="23" fill="var(--ii-coral)" /><path d="M339 217H361M350 206V228" stroke="var(--ii-plum)" strokeWidth="2" strokeLinecap="round" /><circle cx="418" cy="294" r="8" stroke="var(--ii-cream)" strokeWidth="1.5" /></g>
    <path d="M453 45L459 64L479 60L465 76L478 91L459 87L451 106L448 85L426 83L445 73L438 54L453 65V45Z" fill="var(--ii-coral)" />
    <path d="M436 161C470 155 496 181 487 210" stroke="var(--ii-plum)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 7" />
    <path d="M479 204L487 213L495 202" stroke="var(--ii-plum)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="49" cy="169" r="7" fill="var(--ii-lavender)" /><circle cx="485" cy="285" r="5" fill="var(--ii-coral)" />
    <path d="M173 45V57M167 51H179" stroke="var(--ii-plum)" strokeWidth="2" strokeLinecap="round" />
  </svg><span className="ii-cover-caption">IDEAS QUE NOS CONECTAN <span>↗</span></span></div>;
}

function ParticipationRing({ share }) {
  const value = Number.isFinite(share) ? Math.max(0, Math.min(1, share)) : 0;
  return <svg className="ii-ring" viewBox="0 0 240 240" role="img" aria-label={`Tu participación: ${formatPercent(share)} del capital confirmado del grupo`}>
    <circle cx="120" cy="120" r="87" fill="none" stroke="var(--ii-ring-track)" strokeWidth="26" />
    {value > 0 && <circle cx="120" cy="120" r="87" fill="none" stroke="var(--ii-coral)" strokeWidth="26" pathLength="100" strokeDasharray={`${value * 100} 100`} transform="rotate(-90 120 120)" />}
    <circle cx="120" cy="120" r="62" fill="var(--ii-paper)" />
    <text x="120" y="121" textAnchor="middle" className="ii-ring-value">{formatPercent(share)}</text>
    <text x="120" y="143" textAnchor="middle" className="ii-ring-label">tu participación</text>
  </svg>;
}

function PositionPanel({ inv, view, setView }) {
  const { mine, totals, currency: cur } = inv;
  const own = view === 'mine';
  const net = netReading(mine.net, mine.contributed);
  const facts = own ? [
    { label: 'Aportaste', value: formatMoney(mine.contributed, cur), hint: mine.pending_contributions ? `${formatMoney(mine.pending_contributions, cur)} pendiente, aparte` : 'Confirmado', icon: ArrowUpRight },
    { label: 'Recibiste', value: formatMoney(mine.returned, cur), hint: mine.pending_returns ? `${formatMoney(mine.pending_returns, cur)} pendiente, aparte` : mine.returned ? 'Confirmado' : 'Todavía sin retornos', icon: ArrowDownLeft },
    { label: 'Neto', value: formatMoney(mine.net, cur), hint: net.short, icon: Scale },
  ] : [
    { label: 'Capital total', value: formatMoney(totals.contributed, cur), hint: 'Aportes confirmados del grupo', icon: Users },
    { label: 'Retornos totales', value: formatMoney(totals.returned, cur), hint: 'Retornos confirmados del grupo', icon: ArrowDownLeft },
    { label: 'Participantes', value: totals.holders, hint: 'Personas con capital confirmado', icon: PieChart },
  ];
  return <section id="ii-position" className="ii-position" aria-labelledby="ii-position-title" tabIndex={-1}>
    <div className="ii-section-heading"><div><p className="ii-eyebrow">01 / EN PERSPECTIVA</p><h2 id="ii-position-title">Tu lugar en esta idea.</h2></div><div className="ii-view-switch" role="group" aria-label="Mirada de la inversión"><button type="button" aria-pressed={own} onClick={() => setView('mine')}>Tu parte</button><button type="button" aria-pressed={!own} onClick={() => setView('project')}>El proyecto</button></div></div>
    <div className="ii-position-grid">
      <div className="ii-facts" aria-live="polite"><p className="ii-context-label">{own ? 'TU POSICIÓN' : 'LA INVERSIÓN COMPLETA'}<span>Solo lo confirmado · {cur}</span></p><dl>{facts.map((fact) => <div key={fact.label}><dt><fact.icon size={16} aria-hidden="true" />{fact.label}</dt><dd>{fact.value}</dd><dd className="ii-fact-hint">{fact.hint}</dd></div>)}</dl>
        {own ? <div className="ii-indicators"><div><span>Múltiplo (MOIC)</span><strong>{formatMultiple(mine.moic)}</strong><small>Retornado / aportado</small></div><div><span>TIR de flujos anual</span><strong>{mine.irr == null ? '—' : formatPercent(mine.irr, 1)}</strong><small>{mine.irr == null ? 'Aún no se puede calcular' : 'No incluye el capital pendiente'}</small></div></div> : <div className="ii-project-target">{totals.target_progress != null ? <><div><span><Target size={16} aria-hidden="true" />Meta de capital</span><strong>{formatPercent(totals.target_progress, 0)}</strong></div><ProgressBar value={totals.target_progress} tone="brand" label="Avance de la meta de capital" /><p>{formatMoney(totals.contributed, cur)} confirmados de {formatMoney(inv.target_amount, cur)} de meta. {totals.target_progress >= 1 ? 'Meta de capital lograda.' : ''}</p></> : <p><Target size={16} aria-hidden="true" />No hay una meta de capital definida.</p>}</div>}
      </div>
      <div className="ii-participation"><p className="ii-participation-heading"><span>Una parte de algo compartido.</span><Sparkles size={17} aria-hidden="true" /></p><ParticipationRing share={mine.share} /><dl><div><dt><i className="ii-key-mine" />Tu capital confirmado</dt><dd>{formatMoney(mine.contributed, cur)}</dd></div><div><dt><i className="ii-key-group" />Capital total del grupo</dt><dd>{formatMoney(totals.contributed, cur)}</dd></div></dl><p className="ii-privacy"><EyeOff size={14} aria-hidden="true" />Los nombres y montos de otras personas son privados.</p></div>
    </div>
  </section>;
}
export default function InvestorInvestment({ params }) {
  const { query } = useLocation();
  const highlight = Number(query.get('mov')) || null;
  const { refresh } = useSession();
  const { data, error, reload } = useResource(`/api/investor/investments/${params.id}`);
  const [notice, setNotice] = useState(false);
  const [view, setView] = useState('mine');
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
          action={<Link to="/inversionista" className="btn btn-primary">Volver a mi espacio</Link>}>
          Puede que el enlace esté incompleto o que no tengas acceso a esta inversión.
        </EmptyState>
      );
    }
    return <PageLoader error={error} onRetry={reload} />;
  }

  const { investment: inv, movements, series } = data;
  const cur = inv.currency;
  const mine = inv.mine;
  const closed = inv.status === 'cerrada' || inv.status === 'perdida';
  const canContribute = inv.can_contribute === true;
  const changed = () => { reload(); refresh(); };
  const pendingMine = movements.filter((m) => m.status === 'pendiente').length;
  const expected = expectedPct(inv.expected_return_pct);
  const confirmed = movements.filter((m) => m.status === 'confirmado');
  const returned = confirmed.filter((m) => m.type === 'retorno');
  const toConfirm = movements.filter((m) => m.can_resolve).length;
  const ordered = [...movements].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const shownMovements = movements.filter((m) => ledgerFilter === 'all' || (ledgerFilter === 'pending' ? m.status === 'pendiente' : ledgerFilter === 'confirmed' ? m.status === 'confirmado' : m.type === 'retorno'));
  const ledgerFilters = [
    { key: 'all', label: 'Todos', count: movements.length },
    { key: 'pending', label: 'Pendientes', count: pendingMine },
    { key: 'confirmed', label: 'Confirmados', count: confirmed.length },
    { key: 'returns', label: 'Retornos', count: movements.filter((m) => m.type === 'retorno').length },
  ];
  const scrollTo = (id) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    section.focus({ preventScroll: true });
  };

  const onNoticeSaved = (movement) => {
    setLedgerFilter('all');
    changed();
    if (movement?.id) navigate(`/inversionista/inversiones/${inv.id}?mov=${movement.id}`, { replace: true });
  };

  return (
    <div className="investor-investment">
      <div className="ii-breadcrumb"><BackLink to="/inversionista">Mi inversión</BackLink><span>UNA IDEA EN COMÚN</span></div>
      <header className="ii-hero">
        <div className="ii-hero-copy"><p className="ii-eyebrow">{inv.category_label}<span>·</span>{cur === 'USD' ? 'Dólares' : 'Colones'}</p><h1>{inv.name}</h1><div className="ii-hero-badges"><InvestmentStatusBadge status={inv.status} label={inv.status_label} />{inv.project_name && <Badge tone="violet">{inv.project_name}</Badge>}</div><p className="ii-hero-intro">Este es tu lugar para seguir la idea,<br />entender tus números y conversar.</p>{inv.description && <p className="ii-description">{inv.description}</p>}<div className="ii-hero-footer"><span>Tu perspectiva. Cada detalle.</span><button type="button" onClick={() => scrollTo('ii-position')} aria-label="Explorar mi participación"><ArrowDown size={18} aria-hidden="true" /></button></div></div>
        <IdeaCover />
      </header>

      <nav className="ii-local-nav" aria-label="Secciones de esta inversión"><div><button type="button" onClick={() => scrollTo('ii-position')}><PieChart size={15} aria-hidden="true" />Participación</button><button type="button" onClick={() => scrollTo('ii-ledger')}><BookOpen size={15} aria-hidden="true" />Movimientos{pendingMine > 0 && <span>{pendingMine}</span>}</button><button type="button" onClick={() => scrollTo('ii-history')}><ChartLine size={15} aria-hidden="true" />Historia</button></div><span className="ii-private-label"><EyeOff size={13} aria-hidden="true" />Tu espacio privado</span></nav>

      <PositionPanel inv={inv} view={view} setView={setView} />
      <ReturnBreakdown metrics={mine} currency={cur} />
      <AnnualProfitShare investment={inv} />

      {!isAdvertisingInvestment(inv) && (expected || inv.expected_date) && <aside className="ii-expectations" aria-label="Expectativas del proyecto"><span className="ii-expectations-icon"><Info size={18} aria-hidden="true" /></span><div><h3>Lo previsto para el proyecto</h3><p>{expected && <span>Retorno esperado <strong>{expected}</strong></span>}{inv.expected_date && <span>Recuperación prevista <strong>{formatDate(inv.expected_date)}</strong></span>}</p><small>Son estimaciones del proyecto; tus cifras de arriba reflejan movimientos confirmados.</small></div></aside>}

      <section className="ii-notice-bar" aria-label="Avisar un envío realizado"><div className="ii-notice-mark"><MessageCircle size={25} aria-hidden="true" /></div><div><h2>{canContribute ? '¿Ya hiciste un envío?' : closed ? 'Los registros siguen aquí.' : 'Tu historial sigue siendo tuyo.'}</h2><p id="contribution-access-note">{closed ? 'Esta inversión ya no recibe aportes. Podés consultar y conversar sobre tus movimientos.' : canContribute ? 'Tenés acceso para aportar. Dejá el monto, la fecha y un mensaje. JC Analytics verifica y confirma el aporte.' : 'Los nuevos aportes requieren que administración vuelva a habilitar tu acceso. Podés consultar tus movimientos y responder las confirmaciones pendientes.'}</p></div><button type="button" className="ii-notice-button" disabled={!canContribute} aria-describedby="contribution-access-note" onClick={() => setNotice(true)}><Send size={16} aria-hidden="true" />Avisar un aporte<ArrowUpRight size={15} aria-hidden="true" /></button></section>

      <section id="ii-ledger" className="ii-ledger" aria-labelledby="ledger-title" tabIndex={-1}>
        <div className="ii-section-heading"><div><p className="ii-eyebrow">02 / LA CONVERSACIÓN, CON CONTEXTO</p><h2 id="ledger-title">Libro de movimientos</h2><p>Tus aportes y retornos, con sus mensajes y confirmaciones.</p></div><span className="ii-record-count"><BookOpen size={15} aria-hidden="true" />{plural(movements.length, 'registro', 'registros')}</span></div>
        {pendingMine > 0 && <div className="ii-pending-note"><Clock3 size={17} aria-hidden="true" /><p>{plural(pendingMine, 'movimiento pendiente', 'movimientos pendientes')}.{toConfirm > 0 ? ` ${plural(toConfirm, 'espera tu respuesta', 'esperan tu respuesta')}.` : ' JC Analytics revisa los avisos.'}<span>Mientras estén pendientes, no suman en tus totales.</span></p><button type="button" onClick={() => setLedgerFilter('pending')}>Ver pendientes<ArrowRight size={14} aria-hidden="true" /></button></div>}
        <div className="ii-ledger-filters" role="group" aria-label="Filtrar movimientos">{ledgerFilters.map((filter) => <button type="button" key={filter.key} aria-label={filter.label} aria-pressed={ledgerFilter === filter.key} onClick={() => setLedgerFilter(filter.key)}>{filter.label}<span>{filter.count}</span></button>)}</div>
        {shownMovements.length === 0 ? <div className="ii-ledger-empty"><BookOpen size={30} aria-hidden="true" /><h3>{movements.length === 0 ? 'Tu historia todavía no tiene registros.' : 'No hay movimientos en esta vista.'}</h3><p>{movements.length === 0 ? 'Cuando haya un aporte o un retorno a tu nombre, aparecerá aquí con su conversación.' : 'Podés elegir otra categoría para consultar los demás registros.'}</p>{ledgerFilter !== 'all' && <button type="button" onClick={() => setLedgerFilter('all')}>Ver todos los movimientos <ArrowRight size={14} aria-hidden="true" /></button>}</div> : <ul className="ii-movement-list">{shownMovements.map((m) => <li key={m.id}><MovementItem m={m} highlight={m.id === highlight} defaultOpen={m.can_resolve} onChanged={changed} /></li>)}</ul>}
      </section>

      <section id="ii-history" className="ii-history" aria-labelledby="ii-history-title" tabIndex={-1}>
        <div className="ii-section-heading"><div><p className="ii-eyebrow">03 / LA HISTORIA, CON NÚMEROS</p><h2 id="ii-history-title">Cada registro cuenta una parte.</h2><p>Tu capital en esta inversión, en {cur === 'USD' ? 'dólares' : 'colones'}. Solo lo confirmado.</p></div><span className="ii-history-doodle" aria-hidden="true"><Sparkles size={27} /></span></div>
        <div className="ii-history-grid"><div className="ii-chart"><div className="ii-chart-heading"><span><ChartLine size={17} aria-hidden="true" />Tu capital, con fechas</span><span>{cur}</span></div><CashflowChart series={chartSeries(series)} currency={cur} height={250} /></div>
          <aside className="ii-journey" aria-labelledby="ii-journey-title"><p className="ii-eyebrow">ASÍ SE LEEN TUS REGISTROS</p><h3 id="ii-journey-title">Claro de principio a fin.</h3><ol><li><span className="ii-journey-icon"><BookOpen size={18} aria-hidden="true" /></span><div><h4>Un movimiento se registra<span>{movements.length}</span></h4><p>{ordered.length ? `Tu primer movimiento: ${formatDate(ordered[0].date)}.` : 'Todavía no hay movimientos a tu nombre.'}</p></div></li><li><span className="ii-journey-icon"><ShieldCheck size={18} aria-hidden="true" /></span><div><h4>Ambas partes confirman<span>{confirmed.length}</span></h4><p>{confirmed.length ? `${plural(confirmed.length, 'registro confirmado', 'registros confirmados')} en tus cifras.` : 'Lo pendiente queda aparte hasta que se confirme.'}</p></div></li><li><span className="ii-journey-icon"><ArrowDownLeft size={18} aria-hidden="true" /></span><div><h4>Los retornos se reflejan<span>{returned.length}</span></h4><p>{returned.length ? `${formatMoney(mine.returned, cur)} en retornos confirmados.` : 'Todavía no hay retornos confirmados.'}</p></div></li></ol><p className="ii-journey-footer"><CircleCheck size={14} aria-hidden="true" />Cada estado se puede revisar en el libro.</p></aside>
        </div>
      </section>

      {notice && canContribute && <NoticeModal investment={inv} onClose={closeNotice} onSaved={onNoticeSaved} onAccessChanged={reload} />}
    </div>
  );
}
