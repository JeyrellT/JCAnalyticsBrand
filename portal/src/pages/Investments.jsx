// Portafolio de inversiones de los socios: capital aportado, retornos, neto, múltiplo y cuentas por socio.
import { useState } from 'react';
import { Plus, Download, TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, Hourglass, Scale, Info } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageHeader, PageLoader, Stat, Badge, ProgressBar, Modal, Field, Select, EmptyState, Avatar, useAction, cx } from '../components/ui.jsx';
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

function InvestmentRow({ i }) {
  const m = i.metrics;
  return (
    <Link to={`/inversiones/${i.id}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{INVESTMENT_CATEGORIES[i.category]}{i.project_name ? ` · ${i.project_name}` : ''}</p>
          <h3 className="mt-0.5 font-display text-base font-bold leading-snug group-hover:text-brand">{i.name}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge map={INVESTMENT_STATUS} value={i.status} />
          {m.pendingCount > 0 && <Badge tone="amber"><Hourglass className="h-3 w-3" />{m.pendingCount} por confirmar</Badge>}
          {m.objectedCount > 0 && <Badge tone="red">{m.objectedCount} objetado</Badge>}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-[11px] text-muted">Aportado</dt><dd className="font-semibold tabular">{formatMoney(m.contributed, i.currency, { compact: true })}</dd></div>
        <div><dt className="text-[11px] text-muted">Retornado</dt><dd className="font-semibold tabular text-teal-dark">{formatMoney(m.returned, i.currency, { compact: true })}</dd></div>
        <div><dt className="text-[11px] text-muted">Múltiplo</dt><dd className="font-semibold tabular">{formatMultiple(m.moic)}</dd></div>
      </dl>
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-muted"><span>Recuperación del capital</span><span className="tabular">{formatPercent(m.payback, 0)}</span></div>
        <ProgressBar value={m.payback} tone={m.payback >= 1 ? 'teal' : 'brand'} label="Recuperación del capital" />
      </div>
      {i.target_amount ? <p className="text-[11px] text-muted">Meta {formatMoney(i.target_amount, i.currency)} · {formatPercent(m.target_progress, 0)} aportado</p> : null}
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
  const list = investments.filter((i) => (filter === 'vigentes' ? ['activa', 'propuesta'].includes(i.status) : filter === 'todas' ? true : !['activa', 'propuesta'].includes(i.status)));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Socios" title="Inversiones" subtitle="Cada colón que entra o sale queda con su mensaje y la confirmación de quien lo recibió. Montos consolidados en colones."
        actions={<>
          <a className="btn btn-outline" href="/api/investments/export.csv" download><Download className="h-4 w-4" />Excel</a>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nueva inversión</button>
        </>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Indicadores del portafolio">
        <Stat label="Capital aportado" value={formatMoney(pf.contributed_crc, 'CRC', { compact: true })} icon={ArrowDownLeft} tone="blue" hint="Solo confirmado" />
        <Stat label="Retornado a socios" value={formatMoney(pf.returned_crc, 'CRC', { compact: true })} icon={ArrowUpRight} tone="teal" hint={`${formatPercent(pf.contributed_crc ? pf.returned_crc / pf.contributed_crc : null, 0)} del capital`} />
        <Stat label="Neto" value={formatMoney(pf.net_crc, 'CRC', { compact: true })} icon={Scale} tone={pf.net_crc >= 0 ? 'teal' : 'amber'} hint={pf.net_crc >= 0 ? 'Capital recuperado' : 'Capital aún invertido'} />
        <Stat label="Múltiplo (MOIC)" value={formatMultiple(pf.moic)} icon={TrendingUp} hint={`${pf.active_count} inversiones activas`} />
        <Stat label="Por confirmar" value={pf.pending_count} icon={Hourglass} tone={pf.pending_count ? 'amber' : undefined} hint={data.my_pending.length ? `${data.my_pending.length} esperan tu confirmación` : 'Nada a tu nombre'} />
      </section>

      {data.my_pending.length > 0 && (
        <Link to="/buzon" className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 hover:shadow-sm">
          <Wallet className="h-5 w-5 shrink-0" /><span className="flex-1"><b>{data.my_pending.length} {data.my_pending.length === 1 ? 'movimiento espera' : 'movimientos esperan'} tu confirmación.</b> Respondé con tu mensaje de vuelta desde el buzón.</span>
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card card-pad" aria-labelledby="cf-title">
          <h2 id="cf-title" className="section-title">Capital acumulado del portafolio</h2>
          <p className="mb-3 text-xs text-muted">Equivalente en colones con el tipo de cambio de cada movimiento.</p>
          <CashflowChart series={pf.series} currency="CRC" />
        </section>

        <section className="card card-pad" aria-labelledby="partners-title">
          <h2 id="partners-title" className="section-title">Cuenta de cada socio</h2>
          <p className="mb-3 text-xs text-muted">Participación = capital aportado ÷ capital total confirmado.</p>
          <ul className="space-y-4">
            {partners.map((p) => (
              <li key={p.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} color={p.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">{p.name}{p.id === user.id && <Badge tone="blue">Vos</Badge>}{p.pending_count > 0 && <Badge tone="amber">{p.pending_count} pend.</Badge>}</p>
                    <p className="text-xs text-muted tabular">Aportó {formatMoney(p.contributed_crc, 'CRC', { compact: true })} · recibió {formatMoney(p.returned_crc, 'CRC', { compact: true })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold tabular">{formatPercent(p.share, 1)}</p>
                    <p className={cx('text-xs font-semibold tabular', p.net_crc >= 0 ? 'text-teal-dark' : 'text-muted')}>{p.net_crc >= 0 ? '+' : ''}{formatMoney(p.net_crc, 'CRC', { compact: true })}</p>
                  </div>
                </div>
                <ProgressBar value={p.share} className="mt-2" label={`Participación de ${p.name}`} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="list-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="list-title" className="section-title">Inversiones</h2>
          <Select className="w-auto" aria-label="Filtrar" value={filter} onChange={setFilter} options={[{ value: 'vigentes', label: 'Activas y propuestas' }, { value: 'cerradas', label: 'Recuperadas, cerradas o pérdida' }, { value: 'todas', label: 'Todas' }]} />
        </div>
        {list.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Todavía no hay inversiones aquí" action={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Registrar la primera</button>}>
            Creá una inversión (p. ej. pauta de un producto) y registrá los aportes de cada socio.
          </EmptyState>
        ) : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((i) => <InvestmentRow key={i.id} i={i} />)}</div>}
      </section>

      <p className="flex items-start gap-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Tipo de cambio de referencia para nuevos movimientos en dólares: ₡{data.fx_usd_crc} (ajustable en Equipo y ajustes). Fecha de corte: {formatDate(todayKey())}.</p>

      {creating && <InvestmentForm onClose={() => setCreating(false)} onSaved={(i) => navigate(`/inversiones/${i.id}`)} />}
    </div>
  );
}
