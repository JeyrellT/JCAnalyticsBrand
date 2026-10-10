// Portal de proyectos: clientes, productos propios e internos con avance, responsable y compromiso de 72 h.
import { useMemo, useState } from 'react';
import { Plus, FolderKanban, Search, Archive, CalendarCheck, LifeBuoy } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, ProgressBar, Badge, Modal, Field, Select, Tabs, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonChip, PersonSelect, MoneyInput } from '../components/common.jsx';
import { PROJECT_KINDS, PROJECT_STATUS, SERVICES } from '../../shared/catalog.js';
import { formatMoney, dueLabel, formatDate } from '../lib/format.js';

const options = (map) => Object.entries(map).map(([value, v]) => ({ value, label: typeof v === 'string' ? v : v.label }));

export function ProjectForm({ open, onClose, project, onSaved }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => project ?? { kind: 'cliente', status: 'en_curso', currency: 'CRC', owner_id: user.id });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k) => (e) => set(k)(e.target.value);

  async function save(e) {
    e.preventDefault();
    const body = {
      name: form.name, client: form.client || null, kind: form.kind, service: form.service || null, status: form.status, owner_id: form.owner_id || null,
      start_date: form.start_date || null, due_date: form.due_date || null, value_amount: form.value_amount ?? null, currency: form.currency,
      description: form.description || null, contact_name: form.contact_name || null, contact_phone: form.contact_phone || null, url: form.url || null,
    };
    const res = await run(() => api(project ? `/api/projects/${project.id}` : '/api/projects', { method: project ? 'PATCH' : 'POST', body }), { success: project ? 'Proyecto actualizado' : 'Proyecto creado' });
    if (res) { onSaved?.(res.project); onClose(); }
  }

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Editar proyecto' : 'Nuevo proyecto'} size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="project-form" className="btn btn-primary" disabled={busy || !form.name}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <form id="project-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del proyecto" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.name ?? ''} onChange={setE('name')} placeholder="Ej.: Pedidos en línea La Burrada" required />}</Field>
        <Field label="Tipo">{(id) => <Select id={id} options={options(PROJECT_KINDS)} value={form.kind} onChange={set('kind')} />}</Field>
        <Field label="Estado">{(id) => <Select id={id} options={options(PROJECT_STATUS)} value={form.status} onChange={set('status')} />}</Field>
        <Field label="Cliente o marca">{(id) => <input id={id} className="input" value={form.client ?? ''} onChange={setE('client')} placeholder={form.kind === 'cliente' ? 'Nombre del cliente' : 'Opcional'} />}</Field>
        <Field label="Servicio">{(id) => <Select id={id} options={options(SERVICES)} value={form.service} onChange={set('service')} placeholder="Elegí un servicio" />}</Field>
        <Field label="Responsable">{(id) => <PersonSelect id={id} value={form.owner_id} onChange={set('owner_id')} />}</Field>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <Field label="Valor del proyecto">{(id) => <MoneyInput id={id} value={form.value_amount} currency={form.currency} onChange={set('value_amount')} />}</Field>
          <Field label="Moneda">{(id) => <Select id={id} options={[{ value: 'CRC', label: '₡ CRC' }, { value: 'USD', label: '$ USD' }]} value={form.currency} onChange={set('currency')} />}</Field>
        </div>
        <Field label="Inicio">{(id) => <input id={id} type="date" className="input" value={form.start_date ?? ''} onChange={setE('start_date')} />}</Field>
        <Field label="Entrega comprometida">{(id) => <input id={id} type="date" className="input" value={form.due_date ?? ''} onChange={setE('due_date')} />}</Field>
        <Field label="Contacto del cliente">{(id) => <input id={id} className="input" value={form.contact_name ?? ''} onChange={setE('contact_name')} />}</Field>
        <Field label="WhatsApp / teléfono" hint="Para enviar avances con un toque.">{(id) => <input id={id} className="input" inputMode="tel" value={form.contact_phone ?? ''} onChange={setE('contact_phone')} placeholder="8888-0000" />}</Field>
        <Field label="Sitio o enlace" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.url ?? ''} onChange={setE('url')} placeholder="https://" />}</Field>
        <Field label="Descripción y alcance" className="sm:col-span-2">{(id) => <textarea id={id} className="input" rows={3} value={form.description ?? ''} onChange={setE('description')} />}</Field>
      </form>
    </Modal>
  );
}

function ProjectCard({ p }) {
  const due = ['entregado', 'soporte', 'cerrado'].includes(p.status) ? null : dueLabel(p.due_date);
  return (
    <Link to={`/proyectos/${p.id}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{p.client || PROJECT_KINDS[p.kind].label}</p>
          <h3 className="mt-0.5 font-display text-base font-bold leading-snug group-hover:text-brand">{p.name}</h3>
        </div>
        <StatusBadge map={PROJECT_STATUS} value={p.status} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.service && <Badge>{SERVICES[p.service]}</Badge>}
        <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
        {p.support_ends && ['entregado', 'soporte'].includes(p.status) && <Badge tone="amber"><LifeBuoy className="h-3 w-3" />Soporte hasta {formatDate(p.support_ends)}</Badge>}
        {due && <Badge tone={due.tone}><CalendarCheck className="h-3 w-3" />{due.text}</Badge>}
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{p.tasks_total ? `${p.tasks_done}/${p.tasks_total} tareas` : 'Sin tareas'}{p.tasks_overdue ? <span className="ml-1 font-semibold text-coral">· {p.tasks_overdue} vencidas</span> : null}</span>
          <span className="tabular">{Math.round(p.progress * 100)} %</span>
        </div>
        <ProgressBar value={p.progress} tone={p.tasks_overdue ? 'amber' : 'brand'} label="Avance de tareas" />
        <div className="flex items-center justify-between pt-1">
          <PersonChip name={p.owner_name} color={p.owner_color} />
          {p.value_amount ? <span className="text-xs font-semibold tabular text-ink">{formatMoney(p.value_amount, p.currency)}</span> : null}
        </div>
      </div>
    </Link>
  );
}

export default function Projects() {
  const [archived, setArchived] = useState(false);
  const { data, error, reload } = useResource(`/api/projects${archived ? '?archived=1' : ''}`);
  const [kind, setKind] = useState('todos');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const projects = useMemo(() => {
    const list = data?.projects ?? [];
    const text = q.trim().toLowerCase();
    return list
      .filter((p) => kind === 'todos' || p.kind === kind)
      .filter((p) => !status || p.status === status)
      .filter((p) => !text || `${p.name} ${p.client ?? ''}`.toLowerCase().includes(text))
      .sort((a, b) => ({ late: 0, warn: 1 }[a.sla_state] ?? 2) - ({ late: 0, warn: 1 }[b.sla_state] ?? 2));
  }, [data, kind, status, q]);

  const counts = useMemo(() => Object.fromEntries(['cliente', 'producto', 'interno'].map((k) => [k, (data?.projects ?? []).filter((p) => p.kind === k).length])), [data]);

  return (
    <>
      <PageHeader eyebrow="Portal de proyectos" title="Proyectos" subtitle="Clientes, productos propios e iniciativas internas. Los de cliente en curso muestran el semáforo del avance cada 72 h."
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nuevo proyecto</button>} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={kind} onChange={setKind} tabs={[
            { value: 'todos', label: 'Todos', count: data?.projects.length },
            { value: 'cliente', label: 'Clientes', count: counts.cliente },
            { value: 'producto', label: 'Productos', count: counts.producto },
            { value: 'interno', label: 'Internos', count: counts.interno },
          ]} />
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Buscar proyecto o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Select className="w-auto" options={options(PROJECT_STATUS)} value={status} onChange={setStatus} placeholder="Todos los estados" aria-label="Estado" />
          <button type="button" className={cx('btn', archived ? 'btn-dark' : 'btn-outline')} onClick={() => setArchived((a) => !a)} aria-pressed={archived}><Archive className="h-4 w-4" />Archivados</button>
        </div>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title={archived ? 'No hay proyectos archivados' : 'No hay proyectos con estos filtros'}
          action={!archived && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Crear proyecto</button>}>
          Registrá cada cliente o producto para seguir tareas, citas, avances e inversiones en un solo lugar.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      )}

      {creating && <ProjectForm open onClose={() => setCreating(false)} onSaved={(p) => { reload(); navigate(`/proyectos/${p.id}`); }} />}
    </>
  );
}
