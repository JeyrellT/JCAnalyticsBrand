import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Banknote, BookOpen, Calculator, Check, CircleDollarSign, FileCheck2, Info, Megaphone, Pencil, Plus, Search, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api, errorMessage } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { Badge, Field, Modal, PageLoader, Select, useAction } from '../components/ui.jsx';
import { formatDate, formatMoney, todayKey, toMinor } from '../lib/format.js';
import { SERVICE_PRICING } from '../../shared/service-pricing.js';
import '../styles/finance-studio.css';

const TABS = [{ key: 'ventas', label: 'Ventas cobradas', icon: ArrowDownLeft }, { key: 'gastos', label: 'Gastos', icon: ArrowUpRight }, { key: 'costeo', label: 'Costear servicio', icon: Calculator }, { key: 'repartos', label: 'Anticipos y capital', icon: CircleDollarSign }];
const money = (amount, currency = 'CRC') => amount == null ? 'Por completar' : formatMoney(amount, currency);
const decimal = (raw) => Number(String(raw).replace(',', '.'));
const minorRaw = (value) => value == null ? '' : String(value / 100).replace('.', ',');
const financeError = (error) => error.data?.message ?? ({ closed_period: 'Este período ya está cerrado o tiene repartos. Registrá la corrección en un período abierto.', stale_preview: 'Los datos cambiaron. Revisá nuevamente el reparto antes de registrarlo.', policy_not_configured: 'Configurá primero el acuerdo y la revisión de costos.', payout_exceeds_available: 'El monto supera lo disponible. Revisá la vista previa.' }[error.data?.error] ?? errorMessage(error));
const defaultMonth = (year) => { const date = new Date(`${todayKey()}T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() - 1); return Number(date.getUTCFullYear()) === Number(year) ? date.toISOString().slice(0, 7) : `${year}-12`; };

function Amount({ label, value, onChange, currency = 'CRC', hint, required = false, disabled = false }) {
  const parsed = toMinor(value);
  return <Field label={label} hint={value !== '' && parsed != null ? `${money(parsed, currency)}${hint ? ` · ${hint}` : ''}` : hint} error={value !== '' && (parsed == null || parsed < 0) ? 'Ingresá un monto válido, igual o mayor a cero.' : undefined}>{(id) => <input id={id} className="input tabular" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Por completar" required={required} disabled={disabled} />}</Field>;
}
function Note({ children, warning = false }) { return <div className={`fn-note${warning ? ' fn-note-warning' : ''}`}><Info size={15} /><div>{children}</div></div>; }
function ResourceError({ error, onRetry }) { return <div className="fn-error" role="alert"><span>{financeError(error)}</span><button type="button" onClick={onRetry}>Reintentar</button></div>; }
function SectionHeading({ title, children, action }) { return <div className="fn-section-head"><div><h2>{title}</h2><p>{children}</p></div>{action && <div className="fn-section-actions">{action}</div>}</div>; }

function Dimensions({ value, onChange, options }) {
  return <>
    <Field label="Servicio">{(id) => <Select id={id} value={value.service_key ?? ''} onChange={(service_key) => onChange({ ...value, service_key: service_key || null })} placeholder="General de la empresa" options={options.services.map((service) => ({ value: service.key, label: service.name }))} />}</Field>
    <Field label="Proyecto">{(id) => <Select id={id} value={value.project_id ?? ''} onChange={(project_id) => onChange({ ...value, project_id: project_id ? Number(project_id) : null })} placeholder="Sin proyecto" options={options.projects.map((project) => ({ value: project.id, label: project.name }))} />}</Field>
    <Field label="Inversión o campaña" className="fn-wide">{(id) => <Select id={id} value={value.investment_id ?? ''} onChange={(investment_id) => onChange({ ...value, investment_id: investment_id ? Number(investment_id) : null })} placeholder="Sin inversión vinculada" options={options.investments.map((investment) => ({ value: investment.id, label: `${investment.is_campaign ? 'Publicidad · ' : ''}${investment.name}` }))} />}</Field>
  </>;
}

function EntryForm({ entry, kind, options, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [failure, setFailure] = useState('');
  const [form, setForm] = useState(() => ({ kind, category: kind === 'revenue' ? 'sale' : 'other', currency: 'CRC', date: todayKey(), paid: kind === 'revenue', paid_date: todayKey(), description: '', reference: '', fx_rate: '', ...entry }));
  const [amount, setAmount] = useState(minorRaw(entry?.amount));
  const [split, setSplit] = useState((entry?.allocations?.length ?? 0) > 1);
  const [allocations, setAllocations] = useState(() => (entry?.allocations ?? [{ amount: null }]).map((allocation) => ({ ...allocation, raw: minorRaw(allocation.amount) })));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const parsed = toMinor(amount);
  const splitTotal = allocations.reduce((total, allocation) => total + (toMinor(allocation.raw) ?? 0), 0);
  const valid = parsed > 0 && form.description.trim().length >= 3 && form.date && (form.currency !== 'USD' || decimal(form.fx_rate) > 0) && (!split || (allocations.every((allocation) => toMinor(allocation.raw) > 0) && splitTotal === parsed));
  async function save(event) {
    event.preventDefault();
    if (!valid || busy) return;
    setFailure('');
    const body = { kind, category: form.category, currency: form.currency, amount: parsed, date: form.date, paid: kind === 'revenue' || form.paid, paid_date: kind === 'revenue' ? form.date : (form.paid ? form.paid_date : null), description: form.description, reference: form.reference || null, ...(form.currency === 'USD' ? { fx_rate: decimal(form.fx_rate) } : {}), ...(split ? { allocations: allocations.map(({ raw, service_key, project_id, investment_id }) => ({ amount: toMinor(raw), service_key: service_key || null, project_id: project_id || null, investment_id: investment_id || null })) } : { service_key: form.service_key || null, project_id: form.project_id || null, investment_id: form.investment_id || null }) };
    const result = await run(() => api(entry ? `/api/finance/entries/${entry.id}` : '/api/finance/entries', { method: entry ? 'PATCH' : 'POST', body }), { success: entry ? 'Registro actualizado' : kind === 'revenue' ? 'Venta cobrada registrada' : 'Gasto registrado', onError: (error) => setFailure(financeError(error)) });
    if (result) { onSaved(); onClose(); }
  }
  return <Modal open title={entry ? 'Editar registro' : kind === 'revenue' ? 'Registrar venta cobrada' : 'Registrar gasto'} onClose={onClose} size="lg" footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="finance-entry" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Guardando…' : 'Guardar registro'}</button></>}>
    <form id="finance-entry" className="finance-dialog" onSubmit={save}>
      <p className="fn-dialog-intro"><BookOpen size={20} /><span>{kind === 'revenue' ? 'Registrá únicamente dinero ya cobrado por una venta. Los aportes de capital se registran en Inversiones.' : 'Registrá el costo cuando se incurre. Indicá por separado si ya se pagó; un gasto pendiente también reduce la utilidad.'}</span></p>
      <div className="fn-dialog-fields">
        <Field label="Descripción" className="fn-wide">{(id) => <input id={id} className="input" value={form.description} required onChange={(event) => set('description', event.target.value)} placeholder={kind === 'revenue' ? 'Ej.: Dashboard entregado · pago final' : 'Ej.: Pauta Meta · octubre'} />}</Field>
        <Field label="Fecha del registro">{(id) => <input id={id} className="input" type="date" required max={todayKey()} value={form.date} onChange={(event) => set('date', event.target.value)} />}</Field>
        <Field label="Categoría contable">{(id) => <Select id={id} value={form.category} onChange={(value) => set('category', value)} options={options.categories.map((category) => ({ value: category.key, label: category.label }))} />}</Field>
        <Amount label="Monto del registro" value={amount} onChange={setAmount} currency={form.currency} required />
        <Field label="Moneda del registro">{(id) => <Select id={id} value={form.currency} onChange={(value) => set('currency', value)} options={[{ value: 'CRC', label: 'Colones · CRC' }, { value: 'USD', label: 'Dólares · USD' }]} />}</Field>
        {form.currency === 'USD' && <Field label="Tipo de cambio (₡ por $)" hint="Valor real de este registro; queda guardado.">{(id) => <input id={id} className="input" inputMode="decimal" required value={form.fx_rate ?? ''} onChange={(event) => set('fx_rate', event.target.value)} placeholder="Por completar" />}</Field>}
        <Field label="Referencia / comprobante">{(id) => <input id={id} className="input" value={form.reference ?? ''} onChange={(event) => set('reference', event.target.value)} />}</Field>
        {kind === 'expense' && <><label className="fn-wide flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.paid} onChange={(event) => set('paid', event.target.checked)} />Este gasto ya fue pagado</label>{form.paid && <Field label="Fecha del pago">{(id) => <input id={id} className="input" type="date" required max={todayKey()} value={form.paid_date ?? ''} onChange={(event) => set('paid_date', event.target.value)} />}</Field>}</>}
        {!split && <Dimensions value={form} onChange={setForm} options={options} />}
        <label className="fn-wide flex items-center gap-2 text-sm"><input type="checkbox" checked={split} onChange={(event) => setSplit(event.target.checked)} />Distribuir el importe entre varios servicios o campañas</label>
        {split && <div className="fn-wide space-y-4">{allocations.map((allocation, index) => <fieldset key={index} className="rounded-xl border border-line p-4"><legend className="px-2 text-xs font-semibold">Asignación {index + 1}</legend><div className="fn-dialog-fields"><Amount label={`Monto de asignación ${index + 1}`} currency={form.currency} value={allocation.raw} onChange={(raw) => setAllocations((current) => current.map((row, i) => i === index ? { ...row, raw } : row))} /><Dimensions value={allocation} onChange={(value) => setAllocations((current) => current.map((row, i) => i === index ? value : row))} options={options} /></div>{allocations.length > 1 && <button type="button" className="btn btn-ghost mt-3" onClick={() => setAllocations((current) => current.filter((_, i) => i !== index))}>Quitar asignación {index + 1}</button>}</fieldset>)}<div className="flex flex-wrap items-center gap-3"><button type="button" className="btn btn-outline" onClick={() => setAllocations((current) => [...current, { raw: '' }])}><Plus size={15} />Agregar asignación</button><span className="text-xs text-muted">Asignado: {money(splitTotal, form.currency)} / {money(parsed, form.currency)}</span></div></div>}
      </div>
      {failure && <p className="fn-form-error" role="alert">{failure}</p>}
    </form>
  </Modal>;
}

function VoidForm({ entry, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [failure, setFailure] = useState('');
  const [run, busy] = useAction();
  async function submit(event) {
    event.preventDefault();
    if (busy || reason.trim().length < 3) return;
    const result = await run(() => api(`/api/finance/entries/${entry.id}/void`, { method: 'POST', body: { reason } }), { success: 'Registro anulado; el historial se conserva', onError: (error) => setFailure(financeError(error)) });
    if (result) { onSaved(); onClose(); }
  }
  return <Modal open title="Anular registro" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button form="finance-void" type="submit" className="btn btn-danger" disabled={busy || reason.trim().length < 3}>Anular registro</button></>}><form id="finance-void" onSubmit={submit}><p className="mb-4 text-sm text-muted">{entry.description} · {money(entry.amount, entry.currency)}. Quedará en el historial, sin sumar en los totales.</p><Field label="Motivo de la anulación">{(id) => <textarea id={id} className="input" value={reason} onChange={(event) => setReason(event.target.value)} required rows={3} />}</Field>{failure && <p className="mt-3 text-sm text-coral-ink" role="alert">{failure}</p>}</form></Modal>;
}

function ExpensePayment({ entry, onClose, onSaved }) {
  const [date, setDate] = useState(todayKey());
  const [reference, setReference] = useState(entry.reference ?? '');
  const [failure, setFailure] = useState('');
  const [run, busy] = useAction();
  async function submit(event) {
    event.preventDefault();
    if (busy || !date) return;
    const result = await run(() => api(`/api/finance/entries/${entry.id}`, { method: 'PATCH', body: { paid: true, paid_date: date, reference: reference || null } }), { success: 'Pago del gasto registrado', onError: (error) => setFailure(financeError(error)) });
    if (result) { onSaved(); onClose(); }
  }
  return <Modal open title="Registrar pago del gasto" onClose={onClose} footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="finance-expense-payment" className="btn btn-primary" disabled={busy || !date}>{busy ? 'Guardando…' : 'Confirmar gasto pagado'}</button></>}><form id="finance-expense-payment" onSubmit={submit} className="space-y-4"><p className="text-sm leading-relaxed text-muted">{entry.description} · {money(entry.amount, entry.currency)}. Registrá el pago completo ya realizado. El costo original conserva su fecha e importe.</p><Field label="Fecha del pago del gasto">{(id) => <input id={id} type="date" className="input" required min={entry.date} max={todayKey()} value={date} onChange={(event) => setDate(event.target.value)} />}</Field><Field label="Comprobante del pago">{(id) => <input id={id} className="input" value={reference} onChange={(event) => setReference(event.target.value)} />}</Field>{failure && <p role="alert" className="text-sm text-coral-ink">{failure}</p>}</form></Modal>;
}

function Ledger({ year, kind, options, onChanged }) {
  const { isAdmin } = useSession();
  const resource = useResource(`/api/finance/entries?year=${year}&kind=${kind}`);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [investmentId, setInvestmentId] = useState('');
  const [editor, setEditor] = useState(null);
  const [annulling, setAnnulling] = useState(null);
  const [paying, setPaying] = useState(null);
  const expense = kind === 'expense';
  const entries = (resource.data?.entries ?? []).filter((entry) => (status === 'all' || entry.status === status) && (!investmentId || entry.investment_id === Number(investmentId) || entry.allocations.some((allocation) => allocation.investment_id === Number(investmentId))) && `${entry.description} ${entry.reference ?? ''}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
  const changed = () => { resource.reload(); onChanged(); };
  const add = isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditor({})}><Plus size={16} />{expense ? 'Registrar gasto' : 'Registrar venta cobrada'}</button>;
  return <>
    <SectionHeading title={expense ? 'Cada costo cuenta.' : 'Lo vendido, ya cobrado.'} action={add}>{expense ? 'Software, equipo, pauta, impuestos y costos de entregar. Pagado o pendiente: ambos forman parte del resultado.' : 'Ingresos reales de la empresa, vinculados al servicio y la campaña que los generaron.'}</SectionHeading>
    <div className="fn-filter-row"><label className="fn-search"><Search size={15} /><input aria-label="Buscar registros" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descripción o comprobante" /></label><select className="input w-auto" aria-label="Estado de los registros" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Vigentes</option><option value="void">Anulados</option><option value="all">Todos</option></select><select className="input w-auto" aria-label="Filtrar por inversión" value={investmentId} onChange={(event) => setInvestmentId(event.target.value)}><option value="">Todas las inversiones</option>{options.investments.map((investment) => <option key={investment.id} value={investment.id}>{investment.name}</option>)}</select><span>{entries.length} registros</span></div>
    {resource.error ? <ResourceError error={resource.error} onRetry={resource.reload} /> : resource.loading ? <PageLoader /> : entries.length ? <div className={`fn-ledger${expense ? ' fn-ledger-expense' : ''}`}>{entries.map((entry) => <article className="fn-ledger-row" key={entry.id} data-entry-id={entry.id}><div className="fn-ledger-mark">{expense ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}</div><div className="fn-ledger-label"><strong>{entry.description}</strong><span>{formatDate(entry.date)} · {options.categories.find((category) => category.key === entry.category)?.label ?? entry.category}</span><span>{entry.status === 'void' ? 'Anulado · conserva historial' : expense ? entry.paid ? `Pagado ${formatDate(entry.paid_date)}` : 'Por pagar' : 'Cobro recibido'}{entry.reference && ` · ${entry.reference}`}</span></div><div className="fn-ledger-meta">{entry.allocations.length > 1 ? `${entry.allocations.length} asignaciones` : <>{options.services.find((service) => service.key === entry.service_key)?.name ?? 'General de la empresa'}<br />{options.investments.find((investment) => investment.id === entry.investment_id)?.name ?? 'Sin inversión vinculada'}</>}</div><div className="fn-ledger-value"><strong>{money(entry.amount, entry.currency)}</strong><span>{entry.currency === 'USD' ? `${money(entry.amount_crc)} · FX ${entry.fx_rate}` : 'CRC · colones'}</span></div>{isAdmin && entry.status === 'active' && <div className="fn-row-actions">{expense && !entry.paid && <button type="button" aria-label={`Registrar pago de ${entry.description}`} title="Registrar pago del gasto" onClick={() => setPaying(entry)}><Banknote size={14} /></button>}<button type="button" aria-label={`Editar ${entry.description}`} title="Editar registro" onClick={() => setEditor(entry)}><Pencil size={13} /></button><button type="button" aria-label={`Anular ${entry.description}`} title="Anular registro" onClick={() => setAnnulling(entry)}><Trash2 size={13} /></button></div>}</article>)}</div> : <div className="fn-empty"><BookOpen size={28} /><h3>{search || investmentId || status !== 'active' ? 'Ningún registro coincide.' : expense ? 'Empecemos por los costos reales.' : 'Tu primer cobro tiene lugar aquí.'}</h3><p>{expense ? 'Registrar los costos completos permite decidir con una utilidad que sí contempla lo que cuesta entregar.' : 'Agregá las ventas que ya entraron a la cuenta. Una cotización todavía no es un ingreso.'}</p>{add}</div>}
    <div className="mt-5"><Note>Una asignación vincula el mismo importe al servicio, proyecto e inversión. Las vistas no duplican ingresos ni gastos. Los aportes y devoluciones de capital se llevan en <Link to="/inversiones">Inversiones</Link>.</Note></div>
    {editor && <EntryForm entry={editor.id ? editor : null} kind={kind} options={options} onSaved={changed} onClose={() => setEditor(null)} />}
    {paying && <ExpensePayment entry={paying} onSaved={changed} onClose={() => setPaying(null)} />}
    {annulling && <VoidForm entry={annulling} onSaved={changed} onClose={() => setAnnulling(null)} />}
  </>;
}

const COSTS = [{ key: 'software', label: 'Software y licencias', category: 'software' }, { key: 'hosting', label: 'Hosting e infraestructura', category: 'software' }, { key: 'ai', label: 'IA y consumo de API', category: 'software' }, { key: 'third', label: 'Terceros y proveedores', category: 'delivery' }, { key: 'overhead', label: 'Gasto general asignado', category: 'overhead' }, { key: 'tax', label: 'Impuestos del trabajo', category: 'tax' }, { key: 'other', label: 'Otros costos', category: 'other' }];
function Costing({ options }) {
  const { isAdmin } = useSession();
  const resource = useResource('/api/finance/costing');
  const [run, busy] = useAction();
  const [failure, setFailure] = useState('');
  const [form, setForm] = useState({ name: '', service_key: '', currency: 'CRC', units: '1', hours: '', hourly: '', price: '', margin: '', ...Object.fromEntries(COSTS.map((cost) => [cost.key, ''])) });
  const [result, setResult] = useState(null);
  const [dirty, setDirty] = useState(false);
  const set = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  const source = SERVICE_PRICING[form.service_key];
  const hours = decimal(form.hours);
  const laborRate = toMinor(form.hourly);
  const complete = form.name.trim().length >= 3 && form.service_key && form.hours !== '' && hours >= 0 && laborRate != null && laborRate >= 0 && COSTS.every((cost) => toMinor(form[cost.key]) != null && toMinor(form[cost.key]) >= 0) && toMinor(form.price) != null && toMinor(form.price) >= 0 && form.margin !== '' && decimal(form.margin) >= 0 && decimal(form.margin) <= 95 && Number.isInteger(Number(form.units)) && Number(form.units) > 0;
  async function save(event) {
    event.preventDefault();
    if (!complete || busy) return;
    setFailure('');
    const body = { name: form.name, service_key: form.service_key, currency: form.currency, units: Number(form.units), price_per_unit: toMinor(form.price), margin_bps: Math.round(decimal(form.margin) * 100), costs: [{ label: `Trabajo · ${hours} h a ${money(laborRate, form.currency)}/h`, category: 'labor', amount: Math.round(hours * laborRate) }, ...COSTS.map((cost) => ({ label: cost.label, category: cost.category, amount: toMinor(form[cost.key]) }))] };
    const response = await run(() => api('/api/finance/costing', { method: 'POST', body }), { success: 'Costeo guardado', onError: (error) => setFailure(financeError(error)) });
    if (response) { setResult(response.plan); setDirty(false); resource.reload(); }
  }
  return <><SectionHeading title="El precio empieza por el costo.">Una mesa para costear el trabajo completo. Las tarifas del documento son referencias de venta; el costo de tu equipo lo ingresás vos.</SectionHeading><div className="fn-workbench"><form className="fn-workbench-main" onSubmit={save}>
    <h3>Armar un costeo</h3><p>Completá cada partida. Si no aplica, escribí 0; un campo vacío sigue pendiente.</p>
    <fieldset disabled={!isAdmin || busy}><div className="fn-form-grid">
      <Field label="Nombre del costeo" className="fn-form-wide">{(id) => <input id={id} className="input" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Ej.: CRM · implementación y entrega" required />}</Field>
      <Field label="Servicio a costear">{(id) => <Select id={id} value={form.service_key} onChange={(value) => set('service_key', value)} placeholder="Elegí un servicio" options={options.services.map((service) => ({ value: service.key, label: service.name }))} />}</Field>
      <Field label="Moneda del costeo">{(id) => <Select id={id} value={form.currency} onChange={(value) => set('currency', value)} options={[{ value: 'CRC', label: 'Colones · CRC' }, { value: 'USD', label: 'Dólares · USD' }]} />}</Field>
      <Field label="Horas de trabajo" hint="Total estimado de todas las personas.">{(id) => <input id={id} className="input" inputMode="decimal" value={form.hours} onChange={(event) => set('hours', event.target.value)} placeholder="Por completar" required />}</Field>
      <Amount label="Costo real por hora" value={form.hourly} onChange={(value) => set('hourly', value)} currency={form.currency} hint="Costo interno, no tarifa de venta." required />
      {COSTS.map((cost) => <Amount key={cost.key} label={cost.label} value={form[cost.key]} onChange={(value) => set(cost.key, value)} currency={form.currency} required />)}
      <Field label="Unidades a vender">{(id) => <input id={id} className="input" type="number" min="1" step="1" value={form.units} onChange={(event) => set('units', event.target.value)} required />}</Field>
      <Amount label="Precio de venta por unidad" value={form.price} onChange={(value) => set('price', value)} currency={form.currency} required />
      <Field label="Margen objetivo (%)" hint="Porcentaje sobre la venta; sin tasa predefinida.">{(id) => <input id={id} className="input" inputMode="decimal" value={form.margin} onChange={(event) => set('margin', event.target.value)} placeholder="Por completar" required />}</Field>
    </div></fieldset>
    {failure && <p className="mt-4 text-sm text-coral-ink" role="alert">{failure}</p>}
    {isAdmin ? <div className="fn-form-actions"><button type="submit" className="btn btn-primary" disabled={busy || !complete}><Calculator size={16} />{busy ? 'Calculando…' : 'Calcular y guardar costeo'}</button></div> : <div className="mt-5"><Note>Los socios pueden consultar los costeos. Administración registra y actualiza los datos.</Note></div>}
  </form><aside className="fn-workbench-result"><p className="fn-eyebrow"><Calculator size={13} />El trabajo en números</p><h3 className="mt-3">{result ? result.name : 'Primero, completar la base.'}</h3>{result && dirty && <div className="mt-4"><Note warning>Hay cambios sin calcular. Estos resultados corresponden al último costeo seleccionado o guardado.</Note></div>}
    <dl className="fn-cost-lines">{[{ label: 'Costo total del trabajo', key: 'total_cost' }, { label: 'Costo por unidad', key: 'unit_cost' }, { label: 'Precio sugerido por margen', key: 'suggested_unit_price' }, { label: 'Venta proyectada', key: 'projected_revenue' }, { label: 'Utilidad proyectada', key: 'projected_profit' }].map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{money(result?.[item.key], result?.currency ?? form.currency)}</dd></div>)}</dl>
    {result?.actual_margin_bps != null && <p className="mt-4 text-xs text-muted">Margen calculado: {(result.actual_margin_bps / 100).toLocaleString('es-CR')}%.</p>}
    {source ? <div className="fn-source"><strong>Tarifa de referencia · {source.label}</strong><p>Base: {money(source.base_usd * 100, 'USD')} · Con IA: {money(source.with_ai_usd * 100, 'USD')}</p>{source.support_monthly_usd > 0 && <p>Soporte: {money(source.support_monthly_usd * 100, 'USD')} / mes · {source.support_hours_per_week} h / semana.</p>}<p>{source.scope}</p><small>Fuente: {source.source.file} · diapositivas {source.source.slides.join(', ')}. Valores de venta en USD, sin conversión automática ni sustitución del costo real.</small></div> : <div className="fn-source"><strong>Tarifas con fuente.</strong><p>Elegí un servicio para consultar la referencia del documento aprobado.</p></div>}
    <Note>Este plan es una estimación. Solo los cobros y gastos del libro afectan la utilidad real de la empresa.</Note>
  </aside></div>
  <div className="fn-panel mt-5"><h3>Costeos guardados</h3>{resource.error ? <ResourceError error={resource.error} onRetry={resource.reload} /> : resource.loading ? <p className="mt-3 text-sm text-muted">Cargando costeos…</p> : !resource.data.plans.length ? <p>Todavía no hay costeos completos guardados.</p> : <div className="fn-overhead-list">{resource.data.plans.map((plan) => <div key={plan.id}><span>{plan.name}<small className="block text-xs text-muted">{plan.units} unidades · {money(plan.total_cost, plan.currency)} de costo total</small></span><button type="button" className="btn btn-outline" onClick={() => { setResult(plan); setDirty(true); }} aria-label={`Ver costeo ${plan.name}`}>Ver resultado<ArrowUpRight size={14} /></button></div>)}</div>}</div>
  </>;
}

function PolicyForm({ preview, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [failure, setFailure] = useState('');
  const [reserve, setReserve] = useState(minorRaw(preview.policy.reserve_amount));
  const [rate, setRate] = useState(preview.policy.rate_bps == null ? '20' : String(preview.policy.rate_bps / 100));
  const [reviewed, setReviewed] = useState(preview.policy.costs_reviewed_through ?? '');
  const [fx, setFx] = useState(preview.policy.fx_rate ?? '');
  const [beneficiaries, setBeneficiaries] = useState(preview.policy.beneficiary_ids ?? []);
  const [acknowledged, setAcknowledged] = useState(false);
  const candidates = preview.partners;
  const valid = acknowledged && beneficiaries.length > 0 && toMinor(reserve) != null && toMinor(reserve) >= 0 && decimal(rate) > 0 && decimal(rate) <= 100 && reviewed && (preview.investment.currency !== 'USD' || decimal(fx) > 0);
  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;
    const result = await run(() => api(`/api/finance/policies/${preview.investment.id}`, { method: 'PUT', body: { year: preview.year, configured: true, rate_bps: Math.round(decimal(rate) * 100), beneficiary_ids: beneficiaries, reserve_amount: toMinor(reserve), costs_reviewed_through: reviewed, ...(preview.investment.currency === 'USD' ? { fx_rate: decimal(fx) } : {}) } }), { success: 'Acuerdo y revisión de costos guardados', onError: (error) => setFailure(financeError(error)) });
    if (result) { onSaved(); onClose(); }
  }
  return <Modal open title="Configurar acuerdo y costos" onClose={onClose} size="lg" footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="finance-policy" className="btn btn-primary" disabled={busy || !valid}>{busy ? 'Guardando…' : 'Guardar acuerdo'}</button></>}><form id="finance-policy" className="finance-dialog" onSubmit={submit}><p className="fn-dialog-intro"><ShieldCheck size={20} /><span>{preview.investment.name} · {preview.year}. Definí las personas incluidas en este acuerdo de campaña y revisá todos los costos antes de habilitar anticipos.</span></p><div className="fn-dialog-fields"><Field label="Participación sobre utilidad anual (%)" hint="El 20% es la referencia inicial, no un rendimiento sobre el capital.">{(id) => <input id={id} className="input" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} required />}</Field><Amount label="Reserva antes del reparto" currency={preview.investment.currency} value={reserve} onChange={setReserve} required /><Field label="Costos revisados hasta" hint="Fecha hasta la que confirmás que el libro está completo.">{(id) => <input id={id} className="input" type="date" max={todayKey()} required value={reviewed} onChange={(event) => setReviewed(event.target.value)} />}</Field>{preview.investment.currency === 'USD' && <Field label="Tipo de cambio del acuerdo (₡ por $)">{(id) => <input id={id} className="input" inputMode="decimal" required value={fx} onChange={(event) => setFx(event.target.value)} />}</Field>}<fieldset className="fn-wide rounded-xl border border-line p-4"><legend className="px-2 text-sm font-semibold">Personas incluidas en el acuerdo</legend><div className="space-y-3">{candidates.map((person) => <label className="flex items-center gap-2 text-sm" key={person.id}><input type="checkbox" checked={beneficiaries.includes(person.id)} onChange={(event) => setBeneficiaries((current) => event.target.checked ? [...current, person.id] : current.filter((id) => id !== person.id))} />{person.name}</label>)}</div>{!candidates.length && <p className="text-sm text-muted">Primero debe haber aportes confirmados en esta campaña.</p>}</fieldset><label className="fn-wide flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />Confirmo el acuerdo con estas personas y que registré todos los costos correspondientes al período revisado.</label></div>{failure && <p className="fn-form-error" role="alert">{failure}</p>}</form></Modal>;
}

function PaymentForm({ preview, profitAmount, capitalAmount, onClose, onSaved, onStale }) {
  const [run, busy] = useAction();
  const [date, setDate] = useState(todayKey());
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  async function submit(event) {
    event.preventDefault();
    if (!sent || message.trim().length < 3 || busy) return;
    setFailure('');
    const result = await run(() => api('/api/finance/distributions', { method: 'POST', body: { investment_id: preview.investment.id, month: preview.month, date, message, reference: reference || null, profit_amount: profitAmount, capital_amount: capitalAmount, preview_token: preview.preview_token, idempotency_key: key, acknowledge_sent: true } }), { success: 'Envío registrado y aprobado. Cada persona recibe el aviso.', onError: (error) => { setFailure(financeError(error)); if (error.status === 409) { setNeedsReview(true); onStale(); } } });
    if (result) { onSaved(); onClose(); }
  }
  return <Modal open title="Registrar envío realizado" onClose={onClose} size="lg" footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="finance-payment" className="btn btn-primary" disabled={busy || !sent || message.trim().length < 3 || !date || needsReview}>{busy ? 'Registrando…' : 'Registrar y aprobar'}</button></>}><form id="finance-payment" className="finance-dialog" onSubmit={submit}><p className="fn-dialog-intro"><Banknote size={21} /><span>Utilidad: {money(profitAmount, preview.investment.currency)} · capital: {money(capitalAmount, preview.investment.currency)}. Este registro no mueve dinero: documenta un envío ya realizado, queda aprobado y le avisa a cada receptor.</span></p><div className="fn-dialog-fields"><Field label="Fecha del envío">{(id) => <input id={id} type="date" max={todayKey()} className="input" value={date} onChange={(event) => setDate(event.target.value)} required />}</Field><Field label="Referencia de transferencia">{(id) => <input id={id} className="input" value={reference} onChange={(event) => setReference(event.target.value)} />}</Field><Field label="Mensaje para quienes reciben" className="fn-wide">{(id) => <textarea id={id} className="input" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} required />}</Field><label className="fn-wide flex items-start gap-2 text-sm leading-relaxed"><input className="mt-1" type="checkbox" checked={sent} onChange={(event) => setSent(event.target.checked)} />Confirmo que envié estos importes a las personas indicadas en la vista previa.</label></div>{failure && <p className="fn-form-error" role="alert">{failure}{needsReview && ' Cerrá esta ventana para revisar la vista previa actualizada.'}</p>}</form></Modal>;
}

function CloseYear({ preview, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [run, busy] = useAction();
  const [failure, setFailure] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy || reason.trim().length < 3) return;
    const result = await run(() => api(`/api/finance/policies/${preview.investment.id}/close`, { method: 'POST', body: { year: preview.year, reason } }), { success: 'Cierre anual guardado con su ajuste', onError: (error) => setFailure(financeError(error)) });
    if (result) { onSaved(); onClose(); }
  }
  return <Modal open title={`Cerrar el año ${preview.year}`} onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit" form="finance-close" disabled={busy || reason.trim().length < 3}>Guardar cierre anual</button></>}><form id="finance-close" onSubmit={submit}><p className="mb-4 text-sm leading-relaxed text-muted">Primero liquidá y confirmá el ajuste final: no debe quedar utilidad disponible ni envíos pendientes de resolver. El cierre conserva el resultado definitivo, no transfiere ni cobra dinero, y el período deja de admitir cambios.</p><Field label="Motivo y revisión del cierre">{(id) => <textarea id={id} className="input" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} required />}</Field>{failure && <p role="alert" className="mt-3 text-sm text-coral-ink">{failure}</p>}</form></Modal>;
}

function CampaignDistribution({ investmentId, month, isAdmin }) {
  const [profit, setProfit] = useState('');
  const [capital, setCapital] = useState('0');
  const [modal, setModal] = useState(null);
  const profitAmount = toMinor(profit);
  const capitalAmount = toMinor(capital);
  const validAmounts = profitAmount != null && profitAmount >= 0 && capitalAmount != null && capitalAmount >= 0;
  const query = new URLSearchParams({ investment_id: String(investmentId), month, ...(validAmounts ? { profit_amount: String(profitAmount), capital_amount: String(capitalAmount) } : {}) });
  const resource = useResource(`/api/finance/distributions/preview?investment_id=${investmentId}&month=${month}`);
  const proposal = useResource(validAmounts ? `/api/finance/distributions/preview?${query}` : null);
  const history = useResource(`/api/finance/distributions?investment_id=${investmentId}&year=${month.slice(0, 4)}`);
  const changed = () => { resource.reload(); proposal.reload(); history.reload(); };
  if (resource.error) return <ResourceError error={resource.error} onRetry={resource.reload} />;
  if (!resource.data) return <PageLoader />;
  const preview = proposal.data ?? resource.data;
  const { totals, policy, investment } = preview;
  const rate = (policy.rate_bps ?? 2000) / 100;
  const canRecord = isAdmin && validAmounts && profitAmount + capitalAmount > 0 && !!proposal.data && !proposal.error && !preview.blockers.length && !!preview.preview_token;
  return <><div className="fn-panel"><div className="fn-section-head"><div><p className="fn-eyebrow"><Megaphone size={14} />{investment.name} · {month}</p><h3 className="mt-2">Anticipos que respetan el acuerdo.</h3><p>{policy.configured ? `${rate}% de la utilidad anual asignable a las personas acordadas.` : 'Acuerdo pendiente de configurar: la referencia inicial es 20% de utilidad anual.'} Cálculo acumulado hasta {formatDate(preview.cutoff_date)}.</p></div>{isAdmin && !policy.closed_at && <button type="button" className="btn btn-outline" onClick={() => setModal('policy')}>Configurar acuerdo y costos</button>}</div>
    <dl className="fn-repartition"><div><dt>Resultado acumulado</dt><dd>{money(totals.net_profit, investment.currency)}</dd><small>{money(totals.revenue_collected, investment.currency)} cobrados − {money(totals.expenses_incurred, investment.currency)} de costos.</small></div><div><dt>Bolsa anual de utilidad</dt><dd>{money(totals.annual_pool, investment.currency)}</dd><small>{rate}% después de la reserva acordada. No es rendimiento sobre el capital.</small></div><div><dt>Utilidad disponible para anticipar</dt><dd>{money(totals.profit_available, investment.currency)}</dd><small>{money(totals.profit_reserved, investment.currency)} ya asignados, incluidos pendientes y objetados.</small></div></dl>
    <div className="mt-5 space-y-3">{preview.blockers.map((blocker) => <Note key={blocker.code} warning>{blocker.message}</Note>)}{preview.warnings.map((warning, index) => <Note key={warning.code ?? index}>{warning.message ?? warning}</Note>)}{totals.overpaid > 0 && <Note warning>Hay {money(totals.overpaid, investment.currency)} de anticipos por compensar en el ajuste. No se genera un cobro automático.</Note>}</div>
    <div className="fn-workbench mt-5"><div><h3>Preparar el anticipo del mes</h3><div className="fn-form-grid"><Amount label="Utilidad a anticipar" value={profit} onChange={setProfit} currency={investment.currency} disabled={!isAdmin || !!policy.closed_at} /><Amount label="Capital a devolver" value={capital} onChange={setCapital} currency={investment.currency} disabled={!isAdmin || !!policy.closed_at} /></div><p className="mt-3 text-xs leading-relaxed text-muted">Capital disponible: {money(totals.capital_available, investment.currency)}. El capital devuelto se registra separado de la utilidad.</p></div><div className="fn-source"><strong>Mes a mes. Ajuste al cerrar el año.</strong><p>El reparto usa capital confirmado y el tiempo que participó durante cada mes. Los anticipos reservan su importe hasta confirmación o anulación.</p><small>{policy.costs_reviewed_through ? `Costos revisados hasta ${formatDate(policy.costs_reviewed_through)}.` : 'Revisión de costos pendiente.'} {policy.closed_at ? 'Año cerrado.' : 'Solo se registran anticipos de meses terminados.'}</small></div></div>
    {validAmounts && proposal.error && <div className="mt-5"><ResourceError error={proposal.error} onRetry={proposal.reload} /></div>}
    {validAmounts && proposal.loading && <p className="mt-4 text-xs text-muted" role="status">Actualizando la vista previa…</p>}
    {validAmounts && proposal.data?.payments?.length > 0 && <div className="mt-6"><h3>Vista previa por persona</h3><ul className="fn-split-list">{proposal.data.payments.map((payment) => <li key={payment.partner_id}><span>{payment.name}<small>Recibe y confirma cada concepto.</small></span><span>{money(payment.profit_amount, investment.currency)}<small>Utilidad</small></span><span>{money(payment.capital_amount, investment.currency)}<small>Capital</small></span><span>{money(payment.total, investment.currency)}<small>Total</small></span></li>)}</ul></div>}
    {isAdmin && <div className="fn-form-actions">{Number(preview.year) < Number(todayKey().slice(0, 4)) && !policy.closed_at && <button type="button" className="btn btn-outline" onClick={() => setModal('close')}>Cerrar año y guardar ajuste</button>}<button type="button" className="btn btn-primary" disabled={!canRecord} onClick={() => setModal('payment')}><FileCheck2 size={16} />Registrar envío realizado</button></div>}
  </div>
  <div className="fn-panel mt-5"><h3>Anticipos y devoluciones registrados</h3>{history.error ? <ResourceError error={history.error} onRetry={history.reload} /> : !history.data ? <p>Cargando historial…</p> : !history.data.distributions.length ? <p>Aún no hay envíos registrados para esta campaña y año.</p> : <div className="fn-overhead-list">{history.data.distributions.map((distribution) => <div key={distribution.id}><span>{distribution.month} · {distribution.message}<small className="block text-xs text-muted">{distribution.movements.map((movement) => `${movement.partner_name}: ${movement.status}`).join(' · ')}</small></span><strong>{money(distribution.profit_amount + distribution.capital_amount, distribution.currency)}</strong></div>)}</div>}</div>
  {modal === 'policy' && <PolicyForm preview={preview} onClose={() => setModal(null)} onSaved={changed} />}{modal === 'payment' && <PaymentForm preview={preview} profitAmount={profitAmount} capitalAmount={capitalAmount} onClose={() => setModal(null)} onSaved={changed} onStale={changed} />}{modal === 'close' && <CloseYear preview={preview} onClose={() => setModal(null)} onSaved={changed} />}
  </>;
}

function Distributions({ year, options, initialInvestmentId }) {
  const { isAdmin } = useSession();
  const campaigns = options.investments.filter((investment) => investment.is_campaign);
  const [selected, setSelected] = useState(String(initialInvestmentId ?? campaigns[0]?.id ?? ''));
  const [month, setMonth] = useState(() => defaultMonth(year));
  const investmentId = campaigns.some((campaign) => String(campaign.id) === selected) ? selected : String(campaigns[0]?.id ?? '');
  return <><SectionHeading title="Capital de vuelta. Utilidad con fundamento.">Socios e inversionistas, con acuerdos explícitos por campaña. Anticipos mensuales y ajuste anual, separados de la devolución de capital.</SectionHeading>{!campaigns.length ? <div className="fn-empty"><Megaphone size={29} /><h3>Primero, una campaña de inversión.</h3><p>Creá una inversión de categoría Meta Ads o Google Ads. Vinculá sus ventas cobradas y sus costos antes de configurar el reparto.</p><Link to="/inversiones" className="btn btn-primary">Ir a inversiones<ArrowUpRight size={15} /></Link></div> : <><div className="fn-campaigns" role="group" aria-label="Campañas de inversión">{campaigns.map((campaign) => <button key={campaign.id} type="button" aria-pressed={String(campaign.id) === investmentId} onClick={() => setSelected(String(campaign.id))}><Megaphone size={14} />{campaign.name}</button>)}</div><div className="fn-filter-row"><Field label="Mes del anticipo">{(id) => <input id={id} type="month" className="input" min={`${year}-01`} max={`${year}-12`} value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} />}</Field><Link to={`/inversiones/${investmentId}`} className="btn btn-ghost">Ver inversión y confirmaciones<ArrowUpRight size={15} /></Link></div><CampaignDistribution key={`${investmentId}-${month}`} investmentId={investmentId} month={month} isAdmin={isAdmin} /></>}</>;
}

export default function Finance() {
  const { query } = useLocation();
  const { isAdmin } = useSession();
  const [year, setYear] = useState(Number(todayKey().slice(0, 4)));
  const resource = useResource(`/api/finance/overview?year=${year}`);
  const tab = TABS.some((item) => item.key === query.get('tab')) ? query.get('tab') : 'ventas';
  const selectTab = (key) => { const params = new URLSearchParams(query); params.set('tab', key); navigate(`/finanzas?${params}`, { replace: true }); };
  if (!resource.data) return <PageLoader error={resource.error} onRetry={resource.reload} />;
  const { totals, options } = resource.data;
  return <div className="finance-studio"><header className="fn-header"><div><p className="fn-eyebrow"><WalletCards size={14} />Un espacio para decidir</p><h1>Finanzas y costos</h1><p>Lo que entra, lo que cuesta y lo que vuelve a quienes aportan. Cada cifra, con su origen.</p></div><div className="fn-period"><label>Año del libro<select className="input" aria-label="Año del libro" value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 9 }, (_, index) => Number(todayKey().slice(0, 4)) + 1 - index).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><Badge tone={isAdmin ? 'teal' : 'slate'}>{isAdmin ? 'Administración' : 'Consulta de socios'}</Badge></div></header>
    <section className="fn-hero" aria-label="Libro de la empresa"><div className="fn-hero-main"><svg viewBox="0 0 300 260" fill="none" aria-hidden="true">{Array.from({ length: 17 }, (_, index) => <ellipse key={index} cx="175" cy="130" rx={65 + index * 4} ry={100 - index * 2} transform={`rotate(${index * 6 - 45} 175 130)`} stroke="currentColor" strokeWidth=".8" />)}</svg><p className="fn-eyebrow">EL NEGOCIO, CON TODAS SUS PARTES</p><h2>Cuentas claras.<br /><em>Decisiones con base.</em></h2><p>Un libro de ingresos cobrados y costos reales. Una mirada completa para sostener lo que estamos construyendo.</p><div className="fn-hero-foot"><span><ShieldCheck size={13} />Libro {year}</span><span><Check size={13} />Consolidado en CRC</span><span><BookOpen size={13} />Montos registrados</span></div></div><div className="fn-policy-card"><div className="fn-policy-head"><span className="fn-eyebrow">ACUERDOS DE PUBLICIDAD</span><Megaphone size={21} /></div><div className="fn-policy-rate"><strong>20%</strong><span>referencia de utilidad anual</span></div><p>Anticipos mensuales según el acuerdo de cada campaña. Personas, porcentaje y costos se configuran antes de repartir.</p><button type="button" onClick={() => selectTab('repartos')}>Revisar anticipos y capital<ArrowRight size={17} /></button></div></section>
    <dl className="fn-summary">{[{ label: 'Ventas cobradas', key: 'revenue_collected_crc', hint: 'Ingresos que ya se recibieron.' }, { label: 'Costos incurridos', key: 'expenses_incurred_crc', hint: 'Pagados y pendientes del año.' }, { label: 'Resultado registrado', key: 'net_profit_crc', hint: 'Cobros menos costos registrados.' }, { label: 'Gastos por pagar', key: 'unpaid_expenses_crc', hint: 'Compromisos que aún no se pagan.' }].map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{money(totals[item.key])}</dd><small>{item.hint}</small></div>)}</dl>
    {resource.error && <ResourceError error={resource.error} onRetry={resource.reload} />}
    <div className="fn-tabs" role="tablist" aria-label="Secciones de finanzas">{TABS.map((item, index) => <button key={item.key} id={`fn-tab-${item.key}`} type="button" role="tab" aria-selected={tab === item.key} aria-controls="finance-panel" tabIndex={tab === item.key ? 0 : -1} onClick={() => selectTab(item.key)} onKeyDown={(event) => { const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0; if (!direction && !['Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + direction + TABS.length) % TABS.length; selectTab(TABS[next].key); requestAnimationFrame(() => document.getElementById(`fn-tab-${TABS[next].key}`)?.focus()); }}><span>0{index + 1}</span><span>{item.label}</span><item.icon size={16} /></button>)}</div>
    <section id="finance-panel" role="tabpanel" aria-labelledby={`fn-tab-${tab}`} tabIndex={0}>
      {(tab === 'ventas' || tab === 'gastos') && <Ledger key={`${tab}-${year}`} kind={tab === 'ventas' ? 'revenue' : 'expense'} year={year} options={options} onChanged={resource.reload} />}
      {tab === 'costeo' && <Costing options={options} />}
      {tab === 'repartos' && <Distributions key={year} year={year} options={options} initialInvestmentId={query.get('investment_id')} />}
    </section><footer className="fn-footer"><ShieldCheck size={14} /><p>El resultado depende de que el libro esté completo. Administración confirma la revisión de costos antes de un reparto. Los socios consultan; cada receptor confirma sus movimientos.</p></footer>
  </div>;
}
