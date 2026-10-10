// Detalle de una inversión: indicadores, participación por socio, libro de movimientos
// con su hilo de mensajes, reparto pro-rata de retornos y novedades.
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Pencil, ArrowDownLeft, ArrowUpRight, Split, Download, Send, Target, Percent, Scale, Hourglass, TrendingUp, Info } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, useLocation } from '../lib/router.jsx';
import { PageLoader, Stat, Badge, ProgressBar, Modal, Field, Avatar, Tabs, EmptyState, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, MoneyInput, PersonSelect } from '../components/common.jsx';
import { MovementCard } from '../components/movements.jsx';
import CashflowChart from '../components/CashflowChart.jsx';
import { InvestmentForm } from './Investments.jsx';
import { INVESTMENT_CATEGORIES, INVESTMENT_STATUS } from '../../shared/catalog.js';
import { allocateProRata } from '../../shared/finance.js';
import { formatMoney, formatPercent, formatMultiple, formatDate, todayKey, timeAgo } from '../lib/format.js';

function MovementModal({ investment, type, onClose, onSaved }) {
  const { user, investors, settings } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState({ partner_id: user.id, amount: null, date: todayKey(), message: '', reference: '', fx_rate: settings.fx_usd_crc ?? '' });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const self = form.partner_id === user.id;
  const confirmer = self ? 'otro socio' : investors.find((p) => p.id === form.partner_id)?.name.split(' ')[0];

  async function save(e) {
    e.preventDefault();
    const body = { type, partner_id: form.partner_id, amount: form.amount, date: form.date, message: form.message, reference: form.reference || null };
    if (investment.currency === 'USD' && String(form.fx_rate ?? '').trim()) body.fx_rate = Number(String(form.fx_rate).replace(',', '.'));
    const res = await run(() => api(`/api/investments/${investment.id}/movements`, { method: 'POST', body }), { success: `Registrado. Queda por confirmar por ${confirmer}.` });
    if (res) { onSaved(); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={type === 'aporte' ? 'Registrar aporte' : 'Registrar retorno a un socio'}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="mov-form" className="btn btn-primary" disabled={busy || !form.amount || form.amount <= 0 || form.message.trim().length < 3}>{busy ? 'Guardando…' : 'Registrar'}</button></>}>
      <form id="mov-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label={type === 'aporte' ? 'Socio que aporta' : 'Socio que recibe'}>{(id) => <PersonSelect id={id} people={investors} placeholder={null} value={form.partner_id} onChange={set('partner_id')} />}</Field>
        <Field label="Fecha del movimiento">{(id) => <input id={id} type="date" className="input" max={todayKey()} value={form.date} onChange={(e) => set('date')(e.target.value)} />}</Field>
        <Field label="Monto">{(id) => <MoneyInput id={id} currency={investment.currency} value={form.amount} onChange={set('amount')} />}</Field>
        {investment.currency === 'USD'
          ? <Field label="Tipo de cambio (₡ por $)" hint="Queda fijo en este movimiento.">{(id) => <input id={id} className="input tabular" inputMode="decimal" value={form.fx_rate} onChange={(e) => set('fx_rate')(e.target.value)} />}</Field>
          : <Field label="Referencia SINPE / transferencia" hint="Opcional, ayuda a conciliar.">{(id) => <input id={id} className="input" value={form.reference} onChange={(e) => set('reference')(e.target.value)} placeholder="SINPE 12345" />}</Field>}
        {investment.currency === 'USD' && <Field label="Referencia" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.reference} onChange={(e) => set('reference')(e.target.value)} placeholder="Transferencia / factura" />}</Field>}
        <Field label="Mensaje" className="sm:col-span-2" hint="Viaja con la plata: qué es, para qué y cómo se envió.">
          {(id) => <textarea id={id} className="input" rows={3} value={form.message} onChange={(e) => set('message')(e.target.value)} placeholder={type === 'aporte' ? 'Ej.: Transferí por SINPE mi parte de la pauta de noviembre.' : 'Ej.: Retorno de octubre por 12 suscripciones activas.'} />}
        </Field>
      </form>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-paper px-3 py-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Doble control: {self ? 'como lo registrás a tu nombre, lo confirma otro socio.' : `lo confirma ${confirmer} con su mensaje de vuelta.`} Solo lo confirmado suma en los indicadores.</p>
    </Modal>
  );
}

function DistributeModal({ investment, metrics, onClose, onSaved }) {
  const { settings } = useSession();
  const [run, busy] = useAction();
  const [amount, setAmount] = useState(null);
  const [date, setDate] = useState(todayKey());
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const [fx, setFx] = useState(settings.fx_usd_crc ?? '');
  const holders = metrics.partners.filter((p) => p.contributed > 0);
  const shares = amount > 0 && holders.length ? allocateProRata(amount, holders.map((p) => p.contributed)) : null;

  async function save(e) {
    e.preventDefault();
    const body = { amount, date, message, reference: reference || null };
    if (investment.currency === 'USD' && String(fx ?? '').trim()) body.fx_rate = Number(String(fx).replace(',', '.'));
    const res = await run(() => api(`/api/investments/${investment.id}/distribute`, { method: 'POST', body }), { success: 'Retorno repartido. Cada socio debe confirmar su parte.' });
    if (res) { onSaved(); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title="Repartir retorno entre socios" size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="dist-form" className="btn btn-teal" disabled={busy || !shares || message.trim().length < 3}><Split className="h-4 w-4" />{busy ? 'Repartiendo…' : 'Repartir y notificar'}</button></>}>
      {holders.length === 0 ? <p className="text-sm text-muted">Se necesita al menos un aporte confirmado para calcular la participación.</p> : (
        <form id="dist-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Monto total a repartir">{(id) => <MoneyInput id={id} currency={investment.currency} value={amount} onChange={setAmount} />}</Field>
          <Field label="Fecha">{(id) => <input id={id} type="date" className="input" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          {investment.currency === 'USD' && <Field label="Tipo de cambio (₡ por $)">{(id) => <input id={id} className="input tabular" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} />}</Field>}
          <Field label="Referencia" className={investment.currency === 'USD' ? '' : 'sm:col-span-2'}>{(id) => <input id={id} className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Opcional" />}</Field>
          <Field label="Mensaje para los socios" className="sm:col-span-2" hint="Cada socio recibe este mensaje con su parte y lo confirma al recibir la plata.">
            {(id) => <textarea id={id} className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ej.: Retorno de octubre: 14 barberías activas." />}
          </Field>
          <div className="sm:col-span-2">
            <p className="label">Reparto según capital confirmado</p>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {holders.map((p, i) => (
                <li key={p.partner_id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={p.name} color={p.color} size={26} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-muted tabular">{formatPercent(p.share, 1)}</span>
                  <span className="w-28 text-right text-sm font-bold tabular">{shares ? formatMoney(shares[i], investment.currency) : '—'}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted">Redondeo por mayor residuo: la suma de las partes es exactamente el total.</p>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Notes({ investment, notes, onSaved }) {
  const [body, setBody] = useState('');
  const [run, busy] = useAction();
  async function send(e) {
    e.preventDefault();
    if (await run(() => api(`/api/investments/${investment.id}/notes`, { method: 'POST', body: { body } }), { success: 'Novedad publicada para los socios' })) { setBody(''); onSaved(); }
  }
  return (
    <section className="card card-pad" aria-labelledby="notes-title">
      <h2 id="notes-title" className="section-title">Novedades para los socios</h2>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Compartí un avance, una decisión o una propuesta…" aria-label="Novedad" />
        <button type="submit" className="btn btn-dark" disabled={busy || body.trim().length < 2} aria-label="Publicar"><Send className="h-4 w-4" /></button>
      </form>
      <ul className="mt-4 space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="flex gap-2.5">
            <Avatar name={n.user_name} color={n.user_color} size={28} />
            <div className="min-w-0 flex-1"><p className="text-xs text-muted"><span className="font-semibold text-ink">{n.user_name}</span> · {timeAgo(n.created_at)}</p><p className="whitespace-pre-line text-sm">{n.body}</p></div>
          </li>
        ))}
        {notes.length === 0 && <li className="text-sm text-muted">Sin novedades todavía.</li>}
      </ul>
    </section>
  );
}

export default function InvestmentDetail({ params }) {
  const { query } = useLocation();
  const { data, error, reload } = useResource(`/api/investments/${params.id}`);
  const { refresh } = useSession();
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState('todos');
  const highlight = Number(query.get('mov')) || null;

  useEffect(() => {
    if (!highlight || !data) return;
    const el = document.getElementById(`mov-${highlight}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight, data]);

  const movements = useMemo(() => {
    const list = data?.movements ?? [];
    if (tab === 'pendientes') return list.filter((m) => ['pendiente', 'objetado'].includes(m.status));
    if (tab === 'aporte' || tab === 'retorno') return list.filter((m) => m.type === tab);
    return list;
  }, [data, tab]);

  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { investment: inv, metrics: m, series } = data;
  const changed = () => { reload(); refresh(); };
  const cur = inv.currency;
  const closed = inv.status === 'cerrada';
  const pendingN = data.movements.filter((x) => ['pendiente', 'objetado'].includes(x.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/inversiones" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Inversiones</Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-dark">{INVESTMENT_CATEGORIES[inv.category]} · {cur === 'USD' ? 'Dólares' : 'Colones'}</p>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{inv.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge map={INVESTMENT_STATUS} value={inv.status} />
              {inv.project_name && <Link to={`/proyectos/${inv.project_id}`}><Badge tone="blue">{inv.project_name}</Badge></Link>}
              {inv.expected_date && <Badge>Recuperación esperada {formatDate(inv.expected_date)}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={closed} onClick={() => setModal('aporte')}><ArrowDownLeft className="h-4 w-4" />Aporte</button>
            <button type="button" className="btn btn-teal" disabled={closed || !m.contributed} onClick={() => setModal('distribute')} title={!m.contributed ? 'Se necesita capital confirmado' : undefined}><Split className="h-4 w-4" />Repartir retorno</button>
            <button type="button" className="btn btn-outline" disabled={closed} onClick={() => setModal('retorno')}><ArrowUpRight className="h-4 w-4" />Retorno a un socio</button>
            <a className="btn btn-ghost" href={`/api/investments/export.csv?investment_id=${inv.id}`} download><Download className="h-4 w-4" />Excel</a>
            <button type="button" className="btn btn-ghost" onClick={() => setModal('edit')}><Pencil className="h-4 w-4" />Editar</button>
          </div>
        </div>
        {inv.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-ink/80">{inv.description}</p>}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Indicadores">
        <Stat label="Aportado" value={formatMoney(m.contributed, cur, { compact: cur === 'CRC' })} icon={ArrowDownLeft} tone="blue" hint={inv.target_amount ? `${formatPercent(m.target_progress, 0)} de la meta ${formatMoney(inv.target_amount, cur, { compact: true })}` : 'Confirmado'} />
        <Stat label="Retornado" value={formatMoney(m.returned, cur, { compact: cur === 'CRC' })} icon={ArrowUpRight} tone="teal" hint={`Recuperado ${formatPercent(m.payback, 0)}`} />
        <Stat label="Neto" value={formatMoney(m.net, cur, { compact: cur === 'CRC' })} icon={Scale} tone={m.net >= 0 ? 'teal' : 'amber'} hint={cur === 'USD' ? `≈ ${formatMoney(m.net_crc, 'CRC', { compact: true })}` : m.net >= 0 ? 'En ganancia' : 'Aún por recuperar'} />
        <Stat label="TIR anual" value={formatPercent(m.irr, 1)} icon={Percent} hint={m.irr == null ? `Se calcula con más retornos · MOIC ${formatMultiple(m.moic)}` : `${inv.expected_return_pct != null ? `Esperado ${inv.expected_return_pct} % · ` : ''}MOIC ${formatMultiple(m.moic)}`} />
        <Stat label="En tránsito" value={m.pendingCount} icon={Hourglass} tone={m.pendingCount ? 'amber' : undefined} hint={m.pendingCount ? `${formatMoney(m.pendingContributions, cur, { compact: true })} aportes · ${formatMoney(m.pendingReturns, cur, { compact: true })} retornos` : 'Todo confirmado'} />
      </section>
      {inv.target_amount ? <div className="flex items-center gap-3"><Target className="h-4 w-4 shrink-0 text-muted" /><ProgressBar value={m.target_progress} label="Avance de la meta de capital" /><span className="shrink-0 text-xs font-semibold tabular text-muted">{formatPercent(m.target_progress, 0)}</span></div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="ledger-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="ledger-title" className="section-title">Libro de movimientos</h2>
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'todos', label: 'Todos', count: data.movements.length },
                { value: 'pendientes', label: 'Abiertos', count: pendingN },
                { value: 'aporte', label: 'Aportes' },
                { value: 'retorno', label: 'Retornos' },
              ]} />
            </div>
            {movements.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Sin movimientos en esta vista" action={!closed && <button type="button" className="btn btn-primary" onClick={() => setModal('aporte')}><ArrowDownLeft className="h-4 w-4" />Registrar aporte</button>}>
                Cada aporte o retorno lleva un mensaje y lo confirma quien recibe la plata.
              </EmptyState>
            ) : (
              <div className="space-y-2.5">{movements.map((mv) => <MovementCard key={mv.id} m={mv} highlight={mv.id === highlight} onChanged={changed} />)}</div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card card-pad" aria-labelledby="share-title">
            <h2 id="share-title" className="section-title">Participación por socio</h2>
            {m.partners.length === 0 ? <p className="mt-2 text-sm text-muted">Aún no hay aportes.</p> : (
              <ul className="mt-3 space-y-3.5">
                {m.partners.map((p) => (
                  <li key={p.partner_id}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.name} color={p.color} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                      <span className="font-display text-sm font-bold tabular">{formatPercent(p.share, 1)}</span>
                    </div>
                    <ProgressBar value={p.share} className="mt-1.5" label={`Participación de ${p.name}`} />
                    <p className="mt-1 text-xs text-muted tabular">Aportó {formatMoney(p.contributed, cur)} · recibió {formatMoney(p.returned, cur)} · <span className={cx('font-semibold', p.net >= 0 ? 'text-teal-dark' : 'text-ink')}>neto {formatMoney(p.net, cur)}</span></p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card card-pad" aria-labelledby="chart-title">
            <h2 id="chart-title" className="section-title mb-2">Capital acumulado</h2>
            <CashflowChart series={series} currency={cur} height={210} />
          </section>
          <Notes investment={inv} notes={data.notes} onSaved={reload} />
        </aside>
      </div>

      {(modal === 'aporte' || modal === 'retorno') && <MovementModal investment={inv} type={modal} onClose={() => setModal(null)} onSaved={changed} />}
      {modal === 'distribute' && <DistributeModal investment={inv} metrics={m} onClose={() => setModal(null)} onSaved={changed} />}
      {modal === 'edit' && <InvestmentForm investment={inv} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}
