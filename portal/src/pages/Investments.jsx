// Portafolio de inversiones de los socios: capital aportado, retornos, neto, múltiplo y cuentas por socio.
// v6: la cartera incluye a los inversionistas (rol 'inversionista'), marcados con su insignia.
import { useState } from 'react';
import { Plus, Download, TrendingUp, Hourglass, Info, HandCoins, Users, ChartLine, ArrowUpRight, ArrowRight, Check, ShieldCheck, Wallet, CircleDot } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageLoader, Badge, ProgressBar, Modal, Field, Select, EmptyState, Avatar, Tabs, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, MoneyInput } from '../components/common.jsx';
import CashflowChart from '../components/CashflowChart.jsx';
import { RoleBadge } from '../components/people.jsx';
import { INVESTMENT_CATEGORIES, INVESTMENT_STATUS, isInvestorRole } from '../../shared/catalog.js';
import { formatMoney, formatPercent, formatMultiple, formatDate, todayKey } from '../lib/format.js';
import '../styles/investments-studio.css';

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
        {['meta_ads', 'google_ads'].includes(form.category) && <p className="sm:col-span-2 rounded-xl border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">Campaña de publicidad: las ventas cobradas y los gastos se vinculan desde Finanzas y costos. Allí se configura el porcentaje de utilidad anual, las personas del acuerdo y los anticipos mensuales. La devolución de capital se registra por separado.</p>}
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

const capital = (value, compact = false) => formatMoney(value, 'CRC', { compact, decimals: 0 });
const ALLOCATION_COLORS = ['#9dbb63', '#c2d991', '#588a77', '#d1ad72', '#9e94b0', '#82a6ac', '#d7cba6', '#718a50'];

function SectionTitle({ number, title, hint, children, id }) {
  return <div className="investment-section-heading">
    <div><p className="investment-eyebrow">{number} /</p><h2 id={id}>{title}</h2>{hint && <p className="investment-section-hint">{hint}</p>}</div>
    {children}
  </div>;
}

/** All figures are confirmed ledger amounts; net is explicitly returns minus contributions. */
function PortfolioHero({ pf, myPending }) {
  const payback = pf.contributed_crc ? pf.returned_crc / pf.contributed_crc : 0;
  const recovery = Math.min(100, Math.max(0, payback * 100));
  return <section className="investment-overview" aria-label="Resumen del portafolio">
    <div className="investment-capital-hero">
      <div className="investment-hero-art" aria-hidden="true">
        <svg viewBox="0 0 360 280" fill="none">
          {Array.from({ length: 17 }, (_, index) => <ellipse key={index} cx="220" cy="140" rx={64 + index * 4.5} ry={110 - index * 2.6} transform={`rotate(${-28 + index * 4} 220 140)`} stroke="currentColor" strokeWidth=".7" opacity={.32 + index * .025} />)}
          <circle cx="220" cy="140" r="128" stroke="currentColor" strokeWidth=".6" strokeDasharray="2 8" />
        </svg>
      </div>
      <div className="investment-hero-top"><span><Wallet size={15} />CAPITAL QUE NOS CONECTA</span><span><ShieldCheck size={13} />Confirmado</span></div>
      <p className="investment-hero-label">Aportado entre todos.</p>
      <p className="investment-hero-value">{capital(pf.contributed_crc)}</p>
      <p className="investment-hero-caption">Ideas compartidas. Aportes con nombre.<br />Cada movimiento tiene su lugar.</p>
      <div className="investment-recovery">
        <div><span>Recuperación del capital</span><strong>{pf.contributed_crc ? formatPercent(payback, 1) : 'Sin aportes'}</strong></div>
        <div className="investment-recovery-track" role="progressbar" aria-label="Recuperación del capital" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(recovery)} aria-valuetext={pf.contributed_crc ? `${formatPercent(payback, 1)} del capital aportado ha retornado` : 'Sin aportes confirmados'}><span style={{ width: `${recovery}%` }} /></div>
        <span>Retornos confirmados ÷ aportes confirmados</span>
      </div>
    </div>
    <div className="investment-overview-side">
      <div className="investment-return-panel"><div><span className="investment-eyebrow">LO QUE HA VUELTO</span><ArrowUpRight size={21} /></div><p>{capital(pf.returned_crc)}</p><span>Retornado al equipo, con confirmación.</span><div className="investment-return-footer"><span>Múltiplo (MOIC)</span><strong>{formatMultiple(pf.moic)}</strong></div></div>
      <div className="investment-net-panel"><div><span className="investment-eyebrow">NETO DEL PORTAFOLIO</span><CircleDot size={16} /></div><p>{capital(pf.net_crc)}</p><span>Retornos menos aportes confirmados.</span></div>
    </div>
    <div className="investment-overview-foot"><span><ShieldCheck size={15} />Montos consolidados en colones.</span><span><i />{pf.active_count} {pf.active_count === 1 ? 'inversión activa' : 'inversiones activas'}</span><Link to="/buzon"><Hourglass size={14} />{pf.pending_count} por confirmar{myPending > 0 ? ` · ${myPending} a tu nombre` : ''}<ArrowUpRight size={14} /></Link></div>
  </section>;
}

/** The ring uses API shares as-is: no re-normalization or invented allocation. */
function PartnerAllocation({ partners, portfolio, userId }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = partners.find((partner) => partner.id === selectedId) ?? null;
  const circumference = 2 * Math.PI * 96;
  const slices = partners.map((partner, index) => ({
    ...partner,
    chartColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
    offset: partners.slice(0, index).reduce((total, person) => total + Math.max(0, person.share || 0), 0),
  }));
  const select = (id) => setSelectedId((current) => current === id ? null : id);
  const missingShare = Math.max(0, 1 - partners.reduce((total, partner) => total + partner.share, 0));
  const contributed = selected ? selected.contributed_crc : portfolio.contributed_crc;
  const returned = selected ? selected.returned_crc : portfolio.returned_crc;
  const net = selected ? selected.net_crc : portfolio.net_crc;
  return <section className="investment-ownership" aria-labelledby="partners-title">
    <SectionTitle number="01" id="partners-title" title="Cuenta de cada socio e inversionista" hint="Elegí una persona para explorar su participación en el capital confirmado.">
      <span className="investment-section-tag"><Users size={14} />{partners.length} {partners.length === 1 ? 'persona' : 'personas'}</span>
    </SectionTitle>
    <div className="investment-ownership-grid">
      <div className="investment-allocation-card">
        <div className="investment-allocation-top"><span className="investment-eyebrow">ASÍ SE CONSTRUYE EL CAPITAL</span><button type="button" aria-pressed={!selected} onClick={() => setSelectedId(null)}>Ver total<ArrowUpRight size={13} /></button></div>
        <div className="investment-allocation-visual">
          <svg className="investment-allocation-ring" viewBox="0 0 260 260" role="img" aria-label={portfolio.contributed_crc ? 'Distribución de los aportes confirmados. Los nombres y porcentajes están en la lista de personas.' : 'Todavía no hay capital confirmado para distribuir.'}>
            <circle cx="130" cy="130" r="113" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 5" />
            <circle cx="130" cy="130" r="96" fill="none" stroke="var(--surface-3)" strokeWidth="20" />
            {slices.filter((partner) => partner.share > 0).map((partner) => <circle key={partner.id} cx="130" cy="130" r="96" fill="none" stroke={partner.chartColor} strokeWidth={selected?.id === partner.id ? 27 : 20} strokeDasharray={`${Math.max(0, partner.share * circumference)} ${circumference}`} strokeDashoffset={-partner.offset * circumference} transform="rotate(-90 130 130)" className={cx('investment-ring-segment', selected && selected.id !== partner.id && 'is-muted')} onClick={() => select(partner.id)}><title>{partner.name}: {formatPercent(partner.share, 1)}</title></circle>)}
          </svg>
          <div className="investment-ring-center" aria-live="polite" aria-atomic="true"><span>{selected ? 'Participación' : 'Capital aportado'}</span><strong>{selected ? formatPercent(selected.share, 1) : capital(portfolio.contributed_crc, true)}</strong><span>{selected ? selected.name : 'entre todos'}</span></div>
        </div>
        <div id="investment-account-detail" className="investment-selection" aria-live="polite" aria-atomic="true">
          <div className="investment-selection-title"><span>{selected ? 'LA CUENTA DE' : 'EL PANORAMA COMPLETO'}</span><strong>{selected ? selected.name : 'Todo el equipo'}</strong>{selected?.id === userId && <span className="investment-you">Tu participación</span>}</div>
          <dl><div><dt>Aportado</dt><dd>{capital(contributed)}</dd></div><div><dt>Retornado</dt><dd>{capital(returned)}</dd></div><div><dt>Neto <span>retornos − aportes</span></dt><dd>{capital(net)}</dd></div></dl>
          {selected?.pending_count > 0 && <p className="investment-selection-pending"><Hourglass size={13} />{selected.pending_count} {selected.pending_count === 1 ? 'movimiento pendiente' : 'movimientos pendientes'} · fuera de estos montos</p>}
        </div>
        <p className="investment-allocation-note">Participación = capital aportado ÷ capital total confirmado.{portfolio.contributed_crc > 0 && missingShare > 0.00001 ? ` El ${formatPercent(missingShare, 1)} restante corresponde a personas fuera de esta lista.` : ''}</p>
      </div>
      <div className="investment-partners-card">
        <div className="investment-partners-label"><span>QUIÉNES LO HACEN POSIBLE</span><span>PARTICIPACIÓN</span></div>
        <ul className="investment-partner-list">
          {slices.map((partner, index) => <li key={partner.id}>
            <button type="button" className={cx('investment-partner', selected?.id === partner.id && 'is-selected')} aria-pressed={selected?.id === partner.id} aria-controls="investment-account-detail" onClick={() => select(partner.id)}>
              <span className="investment-partner-number" style={{ '--partner-color': partner.chartColor }}>{String(index + 1).padStart(2, '0')}</span>
              <Avatar name={partner.name} color={partner.color} size={34} />
              <span className="investment-partner-identity"><span className="investment-partner-name">{partner.name}{partner.id === userId && <span className="investment-you">Vos</span>}</span><span className="investment-partner-roles">{isInvestorRole(partner) && <RoleBadge role={partner.role} />}{!partner.active && <span>Inactivo</span>}{partner.pending_count > 0 && <span>{partner.pending_count} pend.</span>}</span><span className="investment-partner-amount">{capital(partner.contributed_crc)} aportados</span></span>
              <span className="investment-partner-share"><strong>{formatPercent(partner.share, 1)}</strong>{selected?.id === partner.id ? <Check size={15} /> : <ArrowUpRight size={15} />}</span>
            </button>
          </li>)}
        </ul>
        {!partners.length && <div className="investment-empty-partners"><Users size={30} /><p>Todavía no hay aportes confirmados.</p></div>}
        <div className="investment-partner-help"><Info size={14} /><span>Los aportes y retornos se consultan juntos en la cuenta seleccionada. El porcentaje no incluye movimientos pendientes.</span></div>
      </div>
    </div>
  </section>;
}

function InvestmentCard({ investment: i, index }) {
  const m = i.metrics;
  return <Link to={`/inversiones/${i.id}`} className={`investment-portfolio-card investment-card-tone-${index % 3}`}>
    <div className="investment-card-art" aria-hidden="true"><span>{String(index + 1).padStart(2, '0')}</span><svg viewBox="0 0 220 100" fill="none">{Array.from({ length: 8 }, (_, n) => <rect key={n} x={52 + n * 4} y={-4 + n * 3} width={85 - n * 3} height={110 - n * 5} rx="35" transform="rotate(35 110 50)" stroke="currentColor" strokeWidth=".8" />)}</svg><ArrowUpRight size={22} /></div>
    <div className="investment-card-body"><div className="investment-card-meta"><span>{INVESTMENT_CATEGORIES[i.category]}</span><StatusBadge map={INVESTMENT_STATUS} value={i.status} /></div><h3>{i.name}</h3><p className="investment-card-project">{i.project_name || 'Inversión independiente'}<span>{i.currency}</span></p>
      <dl className="investment-card-amounts"><div><dt>Capital aportado</dt><dd>{formatMoney(m.contributed, i.currency, { compact: true })}</dd></div><div><dt>Retornado</dt><dd>{formatMoney(m.returned, i.currency, { compact: true })}</dd></div></dl>
      <div className="investment-card-recovery"><div><span>Recuperación del capital</span><strong>{formatPercent(m.payback, 0)}</strong></div><ProgressBar value={m.payback} tone={m.payback >= 1 ? 'teal' : 'brand'} label={`Recuperación del capital de ${i.name}`} /></div>
      <div className="investment-card-multiple"><span>Múltiplo <strong>{formatMultiple(m.moic)}</strong></span>{i.target_amount ? <span>Meta {formatMoney(i.target_amount, i.currency, { compact: true })} · {formatPercent(m.target_progress, 0)} aportado</span> : <span>Sin meta de capital</span>}</div>
      {(m.pendingCount > 0 || m.objectedCount > 0) && <div className="investment-card-notices">{m.pendingCount > 0 && <Badge tone="amber"><Hourglass size={12} />{m.pendingCount} por confirmar</Badge>}{m.objectedCount > 0 && <Badge tone="red">{m.objectedCount} {m.objectedCount === 1 ? 'objetado' : 'objetados'}</Badge>}</div>}
      <div className="investment-card-footer"><span>Solo movimientos confirmados</span><strong>Ver detalle<ArrowRight size={14} /></strong></div>
    </div>
  </Link>;
}

export default function Investments() {
  const { user } = useSession();
  const { data, error, reload } = useResource('/api/investments');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('vigentes');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const { portfolio: pf, investments, partners } = data;
  const vigente = (investment) => ['activa', 'propuesta'].includes(investment.status);
  const list = investments.filter((investment) => filter === 'vigentes' ? vigente(investment) : filter === 'todas' ? true : !vigente(investment));
  const counts = { vigentes: investments.filter(vigente).length, cerradas: investments.filter((investment) => !vigente(investment)).length };
  const myPending = data.my_pending.length;
  return <div className="investments-studio">
    <header className="investment-intro"><div><p className="investment-eyebrow"><span />SOCIOS E INVERSIONISTAS</p><h1>Inversiones<span>Lo que construimos juntos.</span></h1><p>Un lugar para ver cada aporte, cada retorno<br className="hidden sm:block" /> y las personas que hacen posible lo que sigue.</p></div><div className="investment-intro-actions"><a href="/api/investments/export.csv" download className="investment-export"><Download size={16} />Excel</a><button type="button" className="investment-create" onClick={() => setCreating(true)}><Plus size={17} />Nueva inversión<ArrowUpRight size={17} /></button></div></header>
    {error && <p className="investment-load-error" role="alert">No pudimos actualizar el portafolio. Se muestra la última información disponible.<button type="button" onClick={reload}>Reintentar</button></p>}
    <PortfolioHero pf={pf} myPending={myPending} />
    {myPending > 0 && <Link to="/buzon" className="investment-pending"><span><HandCoins size={22} /></span><div><strong>{myPending} {myPending === 1 ? 'movimiento espera' : 'movimientos esperan'} tu confirmación.</strong><p>Respondé con tu mensaje de vuelta desde el buzón.</p></div><ArrowUpRight size={19} /></Link>}
    <PartnerAllocation partners={partners} portfolio={pf} userId={user.id} />
    <section className="investment-history" aria-labelledby="cf-title"><SectionTitle number="02" id="cf-title" title="Capital acumulado del portafolio" hint="Equivalente en colones con el tipo de cambio de cada movimiento."><span className="investment-section-tag"><ChartLine size={14} />Historia confirmada</span></SectionTitle><div className="investment-chart"><CashflowChart series={pf.series} currency="CRC" height={260} /></div></section>
    <section className="investment-portfolio" aria-labelledby="list-title"><SectionTitle number="03" id="list-title" title="Nuestras inversiones" hint={filter === 'vigentes' ? 'Activas y propuestas. Cada una, con su siguiente paso.' : filter === 'cerradas' ? 'Recuperadas, cerradas o en pérdida.' : `${investments.length} inversiones en el portafolio.`}><Tabs value={filter} onChange={setFilter} tabs={[{ value: 'vigentes', label: 'Vigentes', count: counts.vigentes }, { value: 'cerradas', label: 'Cerradas', count: counts.cerradas }, { value: 'todas', label: 'Todas', count: investments.length }]} /></SectionTitle>
      {list.length ? <div className="investment-portfolio-grid">{list.map((investment, index) => <InvestmentCard key={investment.id} investment={investment} index={index} />)}</div> : <EmptyState icon={TrendingUp} tone="teal" title="Todavía no hay inversiones aquí" action={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} />Registrar la primera</button>}>Creá una inversión y registrá los aportes de cada socio o inversionista.</EmptyState>}
    </section>
    <p className="investment-footnote"><Info size={15} /><span>Tipo de cambio de referencia para nuevos movimientos en dólares: ₡{data.fx_usd_crc} (ajustable en Equipo y ajustes). Fecha de corte: {formatDate(todayKey())}.</span></p>
    {creating && <InvestmentForm onClose={() => setCreating(false)} onSaved={(investment) => navigate(`/inversiones/${investment.id}`)} />}
  </div>;
}
