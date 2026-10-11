// Portal de proyectos: clientes, productos propios e internos con avance, equipo y compromiso de 72 h.
import { useEffect, useMemo, useState } from 'react';
import { Plus, FolderKanban, Search, Archive, CalendarCheck, LifeBuoy } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, ProgressBar, Badge, AvatarStack, Modal, Field, Select, Tabs, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonChip, PersonSelect, MoneyInput } from '../components/common.jsx';
import { ClientSelect, MembersEditor, normalizeMembers, membersToForm } from '../components/clients.jsx';
import { PROJECT_KINDS, PROJECT_STATUS, SERVICES } from '../../shared/catalog.js';
import { formatMoney, dueLabel, formatDate } from '../lib/format.js';

const options = (map) => Object.entries(map).map(([value, v]) => ({ value, label: typeof v === 'string' ? v : v.label }));

/** Nombre del cliente o marca del proyecto (el detalle puede traer el cliente como objeto). */
export const projectClientName = (p) => (p?.client && typeof p.client === 'object' ? p.client.name : p?.client) || '';

/** Equipo del proyecto con el responsable primero; si el API no trae miembros, al menos el responsable. */
export function projectMembers(p) {
  const list = Array.isArray(p?.members) && p.members.length ? p.members
    : p?.owner_id ? [{ id: p.owner_id, name: p.owner_name ?? 'Responsable', color: p.owner_color, role: 'responsable' }] : [];
  return [...list].sort((a, b) => (b.id === p.owner_id) - (a.id === p.owner_id));
}

export function ProjectForm({ open, onClose, project, defaults, onSaved }) {
  const { user } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => (project
    ? { ...project, client: projectClientName(project), members: membersToForm(project.members) }
    : { kind: 'cliente', status: 'en_curso', currency: 'CRC', owner_id: user.id, members: [], ...defaults }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k) => (e) => set(k)(e.target.value);
  const isClient = form.kind === 'cliente';
  const needsClient = !project && isClient && !form.client_id;

  function pickClient(clientId, client) {
    setForm((f) => ({
      ...f,
      client_id: clientId,
      client: client?.name ?? (clientId ? f.client : ''),
      contact_name: f.contact_name || client?.contact_name || '',
      contact_phone: f.contact_phone || client?.contact_phone || '',
    }));
  }

  // Si cambia el responsable, el anterior sigue en el equipo con rol "Equipo".
  function setOwner(ownerId) {
    setForm((f) => ({ ...f, owner_id: ownerId, members: f.members.map((m) => (m.role === 'responsable' && m.user_id !== ownerId ? { ...m, role: 'equipo' } : m)) }));
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      name: form.name, kind: form.kind, service: form.service || null, status: form.status, owner_id: form.owner_id || null,
      start_date: form.start_date || null, due_date: form.due_date || null, value_amount: form.value_amount ?? null, currency: form.currency,
      description: form.description || null, contact_name: form.contact_name || null, contact_phone: form.contact_phone || null, url: form.url || null,
      members: normalizeMembers(form.members, form.owner_id || null),
    };
    if (isClient && form.client_id) body.client_id = form.client_id;
    else {
      // Producto propio / interno (o un proyecto viejo sin ficha de cliente): marca en texto libre.
      body.client_id = null;
      body.client = form.client || null;
    }
    const res = await run(() => api(project ? `/api/projects/${project.id}` : '/api/projects', { method: project ? 'PATCH' : 'POST', body }), { success: project ? 'Proyecto actualizado' : 'Proyecto creado' });
    if (res) { onSaved?.(res.project); onClose(); }
  }

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Editar proyecto' : 'Nuevo proyecto'} size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="project-form" className="btn btn-primary" disabled={busy || !form.name || needsClient}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <form id="project-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del proyecto" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.name ?? ''} onChange={setE('name')} placeholder="Ej.: Pedidos en línea La Burrada" required />}</Field>
        <Field label="Tipo">{(id) => <Select id={id} options={options(PROJECT_KINDS)} value={form.kind} onChange={set('kind')} />}</Field>
        <Field label="Estado">{(id) => <Select id={id} options={options(PROJECT_STATUS)} value={form.status} onChange={set('status')} />}</Field>
        {isClient ? (
          <Field label="Cliente" hint={needsClient ? 'Elegí el cliente o creálo con «+ Nuevo cliente…».' : null}>
            {(id) => <ClientSelect id={id} value={form.client_id} selectedLabel={form.client} onChange={pickClient} />}
          </Field>
        ) : (
          <Field label="Marca o referencia" hint="Opcional. Ej.: BarberXCR, Taller Ticos.">{(id) => <input id={id} className="input" value={form.client ?? ''} onChange={setE('client')} placeholder="Opcional" />}</Field>
        )}
        <Field label="Servicio">{(id) => <Select id={id} options={options(SERVICES)} value={form.service} onChange={set('service')} placeholder="Elegí un servicio" />}</Field>
        <Field label="Responsable">{(id) => <PersonSelect id={id} value={form.owner_id} onChange={setOwner} />}</Field>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <Field label="Valor del proyecto">{(id) => <MoneyInput id={id} value={form.value_amount} currency={form.currency} onChange={set('value_amount')} />}</Field>
          <Field label="Moneda">{(id) => <Select id={id} options={[{ value: 'CRC', label: '₡ CRC' }, { value: 'USD', label: '$ USD' }]} value={form.currency} onChange={set('currency')} />}</Field>
        </div>
        <Field label="Equipo del proyecto" hint="Quién trabaja en este proyecto y en qué. Les llega un aviso al sumarlos." className="sm:col-span-2">
          <MembersEditor value={form.members} onChange={set('members')} ownerId={form.owner_id} />
        </Field>
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

export function ProjectCard({ p }) {
  const due = ['entregado', 'soporte', 'cerrado'].includes(p.status) ? null : dueLabel(p.due_date);
  const members = projectMembers(p);
  const clientName = projectClientName(p);
  return (
    <Link to={`/proyectos/${p.id}`} className="card group flex min-w-0 flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{clientName || PROJECT_KINDS[p.kind]?.label}</p>
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
        <div className="flex items-center justify-between gap-2 pt-1">
          {members.length > 1 ? (
            <span className="flex min-w-0 items-center gap-2" title={members.map((m) => m.name).join(', ')}>
              <AvatarStack people={members} size={24} max={4} />
              <span className="truncate text-xs text-muted">{(p.owner_name ?? members[0].name).split(' ')[0]} y {members.length - 1} más</span>
            </span>
          ) : <PersonChip name={p.owner_name} color={p.owner_color} />}
          {p.value_amount ? <span className="shrink-0 text-xs font-semibold tabular text-ink">{formatMoney(p.value_amount, p.currency)}</span> : null}
        </div>
      </div>
    </Link>
  );
}

export default function Projects() {
  const { query } = useLocation();
  const [archived, setArchived] = useState(false);
  const { data, error, reload } = useResource(`/api/projects${archived ? '?archived=1' : ''}`);
  const [kind, setKind] = useState('todos');
  const [status, setStatus] = useState('');
  const [service, setService] = useState(() => (SERVICES[query.get('servicio')] ? query.get('servicio') : ''));
  const [person, setPerson] = useState(() => Number(query.get('persona')) || null);
  const [q, setQ] = useState('');

  // ?nuevo=1 abre el formulario (también si ya estábamos en esta página).
  const nuevo = query.get('nuevo') === '1';
  const [creating, setCreating] = useState(nuevo);
  const [seenNuevo, setSeenNuevo] = useState(nuevo);
  if (nuevo !== seenNuevo) {
    setSeenNuevo(nuevo);
    if (nuevo) setCreating(true);
  }
  useEffect(() => { if (nuevo) navigate('/proyectos', { replace: true }); }, [nuevo]);

  const projects = useMemo(() => {
    const list = data?.projects ?? [];
    const text = q.trim().toLowerCase();
    return list
      .filter((p) => kind === 'todos' || p.kind === kind)
      .filter((p) => !status || p.status === status)
      .filter((p) => !service || p.service === service)
      .filter((p) => !person || p.owner_id === person || (p.members ?? []).some((m) => (m.id ?? m.user_id) === person))
      .filter((p) => !text || `${p.name} ${projectClientName(p)}`.toLowerCase().includes(text))
      .sort((a, b) => ({ late: 0, warn: 1 }[a.sla_state] ?? 2) - ({ late: 0, warn: 1 }[b.sla_state] ?? 2));
  }, [data, kind, status, service, person, q]);

  const counts = useMemo(() => Object.fromEntries(['cliente', 'producto', 'interno'].map((k) => [k, (data?.projects ?? []).filter((p) => p.kind === k).length])), [data]);
  const filtered = Boolean(status || service || person || q.trim());
  const clearFilters = () => { setStatus(''); setService(''); setPerson(null); setQ(''); };

  return (
    <>
      <PageHeader eyebrow="Portal de proyectos" title="Proyectos" subtitle="Clientes, productos propios e iniciativas internas, con su equipo. Los de cliente en curso muestran el semáforo del avance cada 72 h."
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nuevo proyecto</button>} />

      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={kind} onChange={setKind} tabs={[
              { value: 'todos', label: 'Todos', count: data?.projects.length },
              { value: 'cliente', label: 'Clientes', count: counts.cliente },
              { value: 'producto', label: 'Productos', count: counts.producto },
              { value: 'interno', label: 'Internos', count: counts.interno },
            ]} />
          </div>
          <label className="relative min-w-0 lg:w-72">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Buscar proyecto o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Select className="sm:w-auto" options={options(PROJECT_STATUS)} value={status} onChange={setStatus} placeholder="Todos los estados" aria-label="Estado" />
          <Select className="sm:w-auto sm:max-w-[16rem]" options={options(SERVICES)} value={service} onChange={setService} placeholder="Todos los servicios" aria-label="Servicio" />
          <label className="min-w-0 sm:w-auto">
            <span className="sr-only">Persona</span>
            <PersonSelect value={person} onChange={setPerson} placeholder="Todas las personas" className="sm:w-auto" />
          </label>
          <button type="button" className={cx('btn', archived ? 'btn-dark' : 'btn-outline')} onClick={() => setArchived((a) => !a)} aria-pressed={archived}><Archive className="h-4 w-4" />Archivados</button>
          {filtered && <button type="button" className="btn btn-ghost col-span-2 text-brand sm:col-span-1" onClick={clearFilters}>Limpiar filtros</button>}
        </div>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title={archived ? 'No hay proyectos archivados' : 'No hay proyectos con estos filtros'}
          action={filtered ? <button type="button" className="btn btn-outline" onClick={clearFilters}>Limpiar filtros</button>
            : !archived && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Crear proyecto</button>}>
          {filtered ? 'Probá con otro estado, servicio o persona.' : 'Registrá cada cliente o producto para seguir tareas, citas, avances e inversiones en un solo lugar.'}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      )}

      {creating && <ProjectForm open onClose={() => setCreating(false)} onSaved={(p) => { reload(); navigate(`/proyectos/${p.id}`); }} />}
    </>
  );
}
