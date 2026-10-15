// Portafolio de inversiones de los socios: capital aportado, retornos, neto, múltiplo y cuentas por socio.
import { useState } from 'react';
import { Plus, Download, TrendingUp, Hourglass, Scale, Info, HandCoins, Users, ChartLine, Layers, ChevronRight } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageHeader, PageLoader, Badge, ProgressBar, Modal, Field, Select, EmptyState, Avatar, IconTile, SectionHead, Tabs, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, MoneyInput } from '../components/common.jsx';
import CashflowChart from '../components/CashflowChart.jsx';
import { INVESTMENT_CATEGORIES, INVESTMENT_STATUS } from '../../shared/catalog.js';
import { formatMoney, formatPercent, formatMultiple, formatDate, todayKey } from '../lib/format.js';

export function InvestmentForm({ investment, onClose, onSaved }) {
  const { data: pdata } = useResource('/api/projects');
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => investment ?? { category: 'producto_propio', status: 'activa', currency: 'CRC' });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    const body = {
      name: form.name, category: form.category, status: form.status, currency: form.currency, project_id: form.project_id || null,
      target_amount: form.target_amount ?? null, expected_return_pct: form.expected_return_pct === '' || form.expected_return_pct == null ? null : Number(form.expected_return_pct),
      expected_date: form.expected_date || null, description: form.description || null,
    };
    if (investment) delete body.currency;
    const res = await run(() => api(investment ? `/api/investments/${investment.id}` : '/api/investments', { method: investment ? 'PATCH' : 'POST', body }), { success: investment ? 'Inversión actualizada' : 'Inversión creada' });
    if (res) { onSaved(res.investment); onClose(); }
  }

  return (
    <Modal open onClose={onClose} title={investment ? 'Editar inversión' : 'Nueva inversión'} size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="inv-form" className="btn btn-primary" disabled={busy || !form.name?.trim()}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <form id="inv-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.name ?? ''} onChange={(e) => set('name')(e.target.value)} placeholder="Ej.: BarberXCR · capital de crecimiento" />}</Field>
        <Field label="Categoría">{(id) => <Select id={id} options={Object.entries(INVESTMENT_CATEGORIES).map(([value, label]) => ({ value, label }))} value={form.category} onChange={set('category')} />}</Field>
        <Field label="Estado">{(id) => <Select id={id} options={Object.entries(INVESTMENT_STATUS).map(([value, v]) => ({ value, label: v.label }))} value={form.status} onChange={set('status')} />}</Field>
        <Field label="Moneda" hint={investment ? 'La moneda no cambia después de crearla.' : 'Los movimientos en dólares guardan su tipo de cambio.'}>
          {(id) => <Select id={id} disabled={!!investment} options={[{ value: 'CRC', label: '₡ Colones' }, { value: 'USD', label: '$ Dólares' }]} value={form.currency} onChange={set('currency')} />}
        </Field>
        <Field label="Meta de capital">{(id) => <MoneyInput id={id} value={form.target_amount} currency={form.currency} onChange={set('target_amount')} />}</Field>
        <Field label="Retorno esperado (%)" hint="Opcional, para comparar contra el real.">{(id) => <input id={id} className="input" inputMode="decimal" value={form.expected_return_pct ?? ''} onChange={(e) => set('expected_return_pct')(e.target.value.replace(',', '.'))} />}</Field>
        <Field label="Fecha esperada de recuperación">{(id) => <input id={id} type="date" className="input" value={form.expected_date ?? ''} onChange={(e) => set('expected_date')(e.target.value)} />}</Field>
        <Field label="Proyecto vinculado" className="sm:col-span-2">{(id) => <Select id={id} options={(pdata?.projects ?? []).map((p) => ({ value: String(p.id), label: p.name }))} value={form.project_id ? String(form.project_id) : ''} onChange={(v) => set('project_id')(v ? Number(v) : null)} placeholder="Sin proyecto" />}</Field>
        <Field label="Tesis de la inversión" className="sm:col-span-2" hint="¿En qué se usa la plata y cómo vuelve?">{(id) => <textarea id={id} className="input" rows={3} value={form.description ?? ''} onChange={(e) => set('description')(e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

/** Cifra del panel hero: etiqueta, valor en Bricolage y una línea de apoyo. */
function HeroFigure({ label, value, hint, tone }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.07] px-3.5 py-3 ring-1 ring-white/[0.07]">
      <dt className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-panel-muted">{label}</dt>
      <dd className={cx('num mt-1 truncate text-[22px] font-bold leading-none sm:text-2xl', tone)}>{value}</dd>
      {hint && <dd className="mt-1.5 truncate text-[11px] text-panel-muted">{hint}</dd>}
    </div>
  );
}

/** Resumen del portafolio en panel tinta: el neto manda; abajo las cuatro cifras que lo explican. */
function PortfolioHero({ pf, myPending }) {
  const positive = pf.net_crc >= 0;
  const payback = pf.contributed_crc ? pf.returned_crc / pf.contributed_crc : 0;
  return (
    <section className="card-panel animate-rise p-5 sm:p-6" aria-label="Resumen del portafolio">
      <div className="relative grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-end">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-panel-muted">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-teal"><Scale className="h-4 w-4" /></span>
            Neto del portafolio
          </p>
          <p className={cx('num mt-3 truncate text-[clamp(34px,9.5vw,44px)] font-bold leading-none', positive ? 'text-teal' : 'text-white')}>{formatMoney(pf.net_crc, 'CRC', { decimals: 0 })}</p>
          <p className="mt-2.5 text-sm text-panel-muted">{positive ? 'Los retornos ya superan el capital aportado.' : 'Capital que sigue invertido: retornos menos aportes, solo lo confirmado.'}</p>
          <div className="mt-5 max-w-md">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-panel-muted">Recuperación del capital</span>
              <span className="num text-sm font-bold text-white">{formatPercent(payback, 0)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(Math.min(1, payback) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Recuperación del capital">
              <div className="h-full rounded-full bg-teal transition-[width] duration-700 ease-out" style={{ width: `${Math.min(1, payback) * 100}%` }} />
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <HeroFigure label="Aportado" value={formatMoney(pf.contributed_crc, 'CRC', { compact: true })} hint="Solo confirmado" />
          <HeroFigure label="Retornado" value={formatMoney(pf.returned_crc, 'CRC', { compact: true })} hint={`${formatPercent(payback, 0)} del capital`} tone="text-teal" />
          <HeroFigure label="Múltiplo (MOIC)" value={formatMultiple(pf.moic)} hint={`${pf.active_count} ${pf.active_count === 1 ? 'inversión activa' : 'inversiones activas'}`} />
          <HeroFigure label="Por confirmar" value={pf.pending_count} hint={myPending ? `${myPending} a tu nombre` : 'Nada a tu nombre'} tone={pf.pending_count ? 'text-amber' : undefined} />
        </dl>
      </div>
    </section>
  );
}

function InvestmentCard({ i }) {
  const m = i.metrics;
  const recovered = m.payback >= 1;
  return (
    <Link to={`/inversiones/${i.id}`} className="card card-hover group flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow truncate">{INVESTMENT_CATEGORIES[i.category]}{i.project_name ? ` · ${i.project_name}` : ''}</p>
          <h3 className="mt-1 font-display text-[17px] font-bold leading-snug text-ink transition-colors group-hover:text-brand-ink">{i.name}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge map={INVESTMENT_STATUS} value={i.status} />
          {m.pendingCount > 0 && <Badge tone="amber"><Hourglass className="h-3 w-3" />{m.pendingCount} por confirmar</Badge>}
          {m.objectedCount > 0 && <Badge tone="red">{m.objectedCount} {m.objectedCount === 1 ? 'objetado' : 'objetados'}</Badge>}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <div className="min-w-0"><dt className="text-[11px] font-medium text-muted">Aportado</dt><dd className="num truncate text-base font-bold text-ink">{formatMoney(m.contributed, i.currency, { compact: true })}</dd></div>
        <div className="min-w-0"><dt className="text-[11px] font-medium text-muted">Retornado</dt><dd className="num truncate text-base font-bold text-teal-ink">{formatMoney(m.returned, i.currency, { compact: true })}</dd></div>
        <div className="min-w-0"><dt className="text-[11px] font-medium text-muted">Múltiplo</dt><dd className="num truncate text-base font-bold text-ink">{formatMultiple(m.moic)}</dd></div>
      </dl>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px]">
          <span className="text-muted">Recuperación del capital</span>
          <span className={cx('num font-semibold', recovered ? 'text-teal-ink' : 'text-ink-2')}>{formatPercent(m.payback, 0)}</span>
        </div>
        <ProgressBar value={m.payback} tone={recovered ? 'teal' : 'brand'} label="Recuperación del capital" />
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="truncate">{i.target_amount ? `Meta ${formatMoney(i.target_amount, i.currency)} · ${formatPercent(m.target_progress, 0)} aportado` : 'Sin meta de capital'}</span>
        <span className="flex shrink-0 items-center gap-0.5 font-semibold text-brand-ink">Ver detalle<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}

export default function Investments() {
  const { user } = useSession();
  const { data, error, reload } = useResource('/api/investments');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('vigentes');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { portfolio: pf, investments, partners } = data;
  const vigente = (i) => ['activa', 'propuesta'].includes(i.status);
  const list = investments.filter((i) => (filter === 'vigentes' ? vigente(i) : filter === 'todas' ? true : !vigente(i)));
  const counts = { vigentes: investments.filter(vigente).length, cerradas: investments.filter((i) => !vigente(i)).length };
  const myPending = data.my_pending.length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Socios" title="Inversiones" icon={TrendingUp} tone="teal" subtitle="Cada colón que entra o sale queda con su mensaje y la confirmación de quien lo recibió. Montos consolidados en colones."
        actions={<>
          <a className="btn btn-outline" href="/api/investments/export.csv" download><Download className="h-4 w-4" />Excel</a>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nueva inversión</button>
        </>} />

      <PortfolioHero pf={pf} myPending={myPending} />

      {myPending > 0 && (
        <Link to="/buzon" className="group flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet-soft p-3 text-sm text-violet-ink shadow-card transition hover:-translate-y-0.5 hover:shadow-raised sm:p-4">
          <IconTile icon={HandCoins} tone="violet" className="bg-violet text-white" />
          <span className="min-w-0 flex-1"><b>{myPending} {myPending === 1 ? 'movimiento espera' : 'movimientos esperan'} tu confirmación.</b> <span className="opacity-90">Respondé con tu mensaje de vuelta desde el buzón.</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-violet-ink/70 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card animate-rise overflow-hidden" aria-labelledby="cf-title">
          <SectionHead flush id="cf-title" icon={ChartLine} tone="blue" title="Capital acumulado del portafolio" hint="Equivalente en colones con el tipo de cambio de cada movimiento." />
          <div className="p-4 sm:p-5"><CashflowChart series={pf.series} currency="CRC" /></div>
        </section>

        <section className="card animate-rise overflow-hidden" aria-labelledby="partners-title">
          <SectionHead flush id="partners-title" icon={Users} tone="teal" title="Cuenta de cada socio" hint="Participación = capital aportado ÷ capital total confirmado." />
          <ul className="stagger divide-y divide-line">
            {partners.map((p) => (
              <li key={p.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} color={p.color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-ink">
                      <span className="truncate">{p.name}</span>
                      {p.id === user.id && <Badge tone="blue">Vos</Badge>}
                      {p.pending_count > 0 && <Badge tone="amber">{p.pending_count} pend.</Badge>}
                    </p>
                    <p className="truncate text-xs tabular text-muted">Aportó {formatMoney(p.contributed_crc, 'CRC', { compact: true })} · recibió {formatMoney(p.returned_crc, 'CRC', { compact: true })}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-base font-bold leading-tight text-ink">{formatPercent(p.share, 1)}</p>
                    <p className={cx('num text-xs font-semibold', p.net_crc >= 0 ? 'text-teal-ink' : 'text-muted')}>{p.net_crc >= 0 ? '+' : ''}{formatMoney(p.net_crc, 'CRC', { compact: true })}</p>
                  </div>
                </div>
                <ProgressBar value={p.share} tone="teal" className="mt-2.5" label={`Participación de ${p.name}`} />
              </li>
            ))}
            {partners.length === 0 && <li className="px-4 py-6 text-sm text-muted sm:px-5">Todavía no hay aportes confirmados.</li>}
          </ul>
        </section>
      </div>

      <section aria-labelledby="list-title">
        <SectionHead id="list-title" icon={Layers} tone="slate" title="Inversiones" className="flex-wrap" hint={filter === 'vigentes' ? 'Activas y propuestas.' : filter === 'cerradas' ? 'Recuperadas, cerradas o en pérdida.' : `${investments.length} en total.`}
          action={<Tabs value={filter} onChange={setFilter} tabs={[{ value: 'vigentes', label: 'Vigentes', count: counts.vigentes }, { value: 'cerradas', label: 'Cerradas', count: counts.cerradas }, { value: 'todas', label: 'Todas', count: investments.length }]} />} />
        {list.length === 0 ? (
          <EmptyState icon={TrendingUp} tone="teal" title="Todavía no hay inversiones aquí" action={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Registrar la primera</button>}>
            Creá una inversión (p. ej. pauta de un producto) y registrá los aportes de cada socio.
          </EmptyState>
        ) : <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((i) => <InvestmentCard key={i.id} i={i} />)}</div>}
      </section>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Tipo de cambio de referencia para nuevos movimientos en dólares: ₡{data.fx_usd_crc} (ajustable en Equipo y ajustes). Fecha de corte: {formatDate(todayKey())}.</p>

      {creating && <InvestmentForm onClose={() => setCreating(false)} onSaved={(i) => navigate(`/inversiones/${i.id}`)} />}
    </div>
  );
}
