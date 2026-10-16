// Portal de proyectos: clientes, productos propios e internos con avance, equipo y compromiso de 72 h.
import { useEffect, useMemo, useState } from 'react';
import { Plus, FolderKanban, Search, Archive, CalendarCheck, LifeBuoy, ListChecks, ArrowUpRight, LayoutGrid, List, X, ArrowRight, Users, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageLoader, EmptyState, ProgressBar, Badge, AvatarStack, Modal, Field, Select, useAction, cx } from '../components/ui.jsx';
import { StatusBadge, SlaBadge, PersonChip, PersonSelect, MoneyInput } from '../components/common.jsx';
import { ClientSelect, MembersEditor, normalizeMembers, membersToForm } from '../components/clients.jsx';
import { PROJECT_KINDS, PROJECT_STATUS, SERVICES } from '../../shared/catalog.js';
import { formatMoney, dueLabel, formatDate } from '../lib/format.js';
import '../styles/projects-studio.css';

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

/** Original geometric covers: each project kind has its own visual language. */
function ProjectArtwork({ kind, id, compact = false }) {
  return (
    <div className={cx('ps-art', `ps-art-${kind}`, compact && 'ps-art-compact')} aria-hidden="true">
      <span className="ps-art-code">JC / {String(id).padStart(3, '0')}</span>
      <svg className="ps-art-sculpture" viewBox="0 0 320 190" fill="none">
        {kind === 'producto' ? (
          <g transform="translate(165 98) rotate(-25)">
            {Array.from({ length: 17 }, (_, i) => <ellipse key={i} rx={83 - i * 2.1} ry={24 + i * 3.7} transform={`rotate(${i * 8})`} stroke="currentColor" strokeWidth=".8" opacity={.25 + i * .035} />)}
            <circle r="10" fill="currentColor" opacity=".8" />
          </g>
        ) : kind === 'interno' ? (
          <g transform="translate(154 94) rotate(-30) skewX(18)">
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={-66 + i * 5} y={-52 + i * 7} width="112" height="94" rx="12" stroke="currentColor" strokeWidth="1" opacity={.18 + i * .09} />)}
            <path d="M-81 21H97M-25-69V101M42-69V101" stroke="currentColor" strokeOpacity=".25" strokeDasharray="3 5" />
          </g>
        ) : (
          <g transform="translate(161 110) rotate(-15)">
            {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${-83 + i * 6} 58V-10a${83 - i * 6} ${83 - i * 6} 0 0 1 ${166 - i * 12} 0v68`} stroke="currentColor" strokeWidth="1" opacity={.3 + i * .055} />)}
            <path d="M-105 58H105" stroke="currentColor" strokeOpacity=".3" />
          </g>
        )}
        <path d="M15 95H41M28 82V108M281 95H305M293 83V107" stroke="currentColor" strokeOpacity=".18" />
      </svg>
      <span className="ps-art-caption">{kind === 'producto' ? 'IDEAS CON VIDA PROPIA' : kind === 'interno' ? 'CONSTRUIR DESDE ADENTRO' : 'CREAR EN COMPAÑÍA'}</span>
      <span className="ps-art-open"><ArrowUpRight size={17} /></span>
    </div>
  );
}

const progressOf = (project) => Math.max(0, Math.min(1, Number.isFinite(project.progress)
  ? project.progress : project.tasks_total ? (project.tasks_done ?? 0) / project.tasks_total : 0));
const normalizeSearch = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const SORT_OPTIONS = [
  { value: 'attention', label: 'Necesitan atención' },
  { value: 'updated', label: 'Actualizados recientemente' },
  { value: 'due', label: 'Fecha de entrega' },
  { value: 'progress', label: 'Mayor avance' },
  { value: 'name', label: 'Nombre, de A a Z' },
];
const KIND_TABS = [{ value: 'todos', label: 'Todo el estudio' }, { value: 'cliente', label: 'Clientes' }, { value: 'producto', label: 'Productos propios' }, { value: 'interno', label: 'Internos' }];

export function ProjectCard({ p, view = 'gallery' }) {
  const due = ['entregado', 'soporte', 'cerrado'].includes(p.status) ? null : dueLabel(p.due_date);
  const members = projectMembers(p);
  const clientName = projectClientName(p);
  const progress = progressOf(p);
  const pct = Math.round(progress * 100);
  return (
    <Link to={`/proyectos/${p.id}`} data-project-id={p.id}
      className={cx('ps-card', view === 'list' && 'ps-card-list', p.sla_state === 'late' && 'ps-card-late')}>
      <ProjectArtwork kind={p.kind} id={p.id} compact={view === 'list'} />
      <div className="ps-card-body">
        <div className="ps-card-heading">
          <div className="ps-card-context"><span>{PROJECT_KINDS[p.kind]?.label}</span><span className="ps-card-dot" /><span>{clientName || 'JC Analytics'}</span></div>
          <h2>{p.name}</h2>
          <div className="ps-card-service">{p.service ? SERVICES[p.service] ?? p.service : 'Un proyecto del equipo'}</div>
        </div>
        <div className="ps-card-health">
          <StatusBadge map={PROJECT_STATUS} value={p.status} />
          <SlaBadge state={p.sla_state} hours={p.hours_since_update} />
          {p.support_ends && ['entregado', 'soporte'].includes(p.status) && <Badge tone="amber"><LifeBuoy size={12} />Soporte hasta {formatDate(p.support_ends)}</Badge>}
          {due && <Badge tone={due.tone}><CalendarCheck size={12} />{due.text}</Badge>}
        </div>
        <div className="ps-card-progress">
          <div><span><ListChecks size={13} />{p.tasks_total ? `${p.tasks_done ?? 0} de ${p.tasks_total} tareas` : 'Sin tareas registradas'}</span><strong>{p.tasks_total ? `${pct}%` : '—'}</strong></div>
          <ProgressBar value={progress} tone={p.tasks_overdue ? 'amber' : progress >= 1 ? 'teal' : 'brand'} label={`Avance de tareas de ${p.name}`} />
          {p.tasks_overdue > 0 && <span className="ps-overdue">{p.tasks_overdue} {p.tasks_overdue === 1 ? 'tarea vencida' : 'tareas vencidas'}</span>}
        </div>
        <div className="ps-card-footer">
          <div className="ps-card-people" title={members.map((member) => member.name).join(', ')}>
            {members.length > 1 ? <><AvatarStack people={members} size={25} max={3} /><span>{(p.owner_name ?? members[0].name).split(' ')[0]} +{members.length - 1}</span></> : <PersonChip name={p.owner_name} color={p.owner_color} />}
          </div>
          <span className="ps-card-value">{p.value_amount != null ? formatMoney(p.value_amount, p.currency) : 'Ver proyecto'}<ArrowUpRight size={15} /></span>
        </div>
      </div>
    </Link>
  );
}

export default function Projects() {
  const { query } = useLocation();
  const { team } = useSession();
  const [archived, setArchived] = useState(false);
  const { data, error, reload } = useResource(`/api/projects${archived ? '?archived=1' : ''}`);
  const [kind, setKind] = useState('todos');
  const [status, setStatus] = useState('');
  const [service, setService] = useState(() => (SERVICES[query.get('servicio')] ? query.get('servicio') : ''));
  const [person, setPerson] = useState(() => Number(query.get('persona')) || null);
  const [q, setQ] = useState('');
  const [attention, setAttention] = useState(false);
  const [sort, setSort] = useState('attention');
  const [view, setView] = useState(() => { try { return localStorage.getItem('jcp:projects:view') === 'list' ? 'list' : 'gallery'; } catch { return 'gallery'; } });
  const changeView = (next) => { setView(next); try { localStorage.setItem('jcp:projects:view', next); } catch { /* View selection works without storage. */ } };

  // The existing Create shortcut remains valid even when already on this page.
  const nuevo = query.get('nuevo') === '1';
  const [creating, setCreating] = useState(nuevo);
  const [seenNuevo, setSeenNuevo] = useState(nuevo);
  if (nuevo !== seenNuevo) {
    setSeenNuevo(nuevo);
    if (nuevo) setCreating(true);
  }
  useEffect(() => { if (nuevo) navigate('/proyectos', { replace: true }); }, [nuevo]);

  const projects = useMemo(() => {
    const tokens = normalizeSearch(q).split(/\s+/).filter(Boolean);
    const list = (data?.projects ?? [])
      .filter((p) => kind === 'todos' || p.kind === kind)
      .filter((p) => !status || p.status === status)
      .filter((p) => !service || p.service === service)
      .filter((p) => !person || p.owner_id === person || (p.members ?? []).some((m) => (m.id ?? m.user_id) === person))
      .filter((p) => !attention || p.sla_state === 'late')
      .filter((p) => tokens.every((token) => normalizeSearch(`${p.name} ${projectClientName(p)} ${p.owner_name ?? ''} ${SERVICES[p.service] ?? ''}`).includes(token)));
    const byName = (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    return list.sort((a, b) => {
      if (sort === 'name') return byName(a, b);
      if (sort === 'progress') return progressOf(b) - progressOf(a) || byName(a, b);
      if (sort === 'due') return (a.due_date || '9999').localeCompare(b.due_date || '9999') || byName(a, b);
      if (sort === 'updated') return (b.updated_at || '').localeCompare(a.updated_at || '') || byName(a, b);
      return (({ late: 0, warn: 1 }[a.sla_state] ?? 2) - ({ late: 0, warn: 1 }[b.sla_state] ?? 2))
        || (b.tasks_overdue ?? 0) - (a.tasks_overdue ?? 0) || byName(a, b);
    });
  }, [data, kind, status, service, person, q, attention, sort]);

  const portfolio = useMemo(() => {
    const all = data?.projects ?? [];
    return {
      total: all.length,
      active: all.filter((p) => ['en_curso', 'en_revision', 'soporte'].includes(p.status)).length,
      late: all.filter((p) => p.sla_state === 'late').length,
      completed: all.reduce((sum, p) => sum + (p.tasks_done ?? 0), 0),
      people: new Set(all.flatMap((p) => projectMembers(p).map((member) => member.id))).size,
      counts: Object.fromEntries(['cliente', 'producto', 'interno'].map((key) => [key, all.filter((p) => p.kind === key).length])),
    };
  }, [data]);
  const activeFilters = [
    kind !== 'todos' && { key: 'kind', label: PROJECT_KINDS[kind]?.label, clear: () => setKind('todos') },
    status && { key: 'status', label: PROJECT_STATUS[status]?.label, clear: () => setStatus('') },
    service && { key: 'service', label: SERVICES[service], clear: () => setService('') },
    person && { key: 'person', label: team.find((member) => member.id === person)?.name ?? 'Persona seleccionada', clear: () => setPerson(null) },
    q.trim() && { key: 'query', label: `“${q.trim()}”`, clear: () => setQ('') },
    attention && { key: 'attention', label: 'Avance pendiente', clear: () => setAttention(false) },
    archived && { key: 'archived', label: 'Archivados', clear: () => setArchived(false) },
  ].filter(Boolean);
  const clearFilters = () => { setKind('todos'); setStatus(''); setService(''); setPerson(null); setQ(''); setAttention(false); setArchived(false); };
  const filtered = activeFilters.length > 0;

  return (
    <div className="projects-studio">
      <header className="ps-header">
        <div className="ps-header-copy">
          <p className="ps-eyebrow"><span /> EL ESTUDIO / LO QUE ESTAMOS CREANDO</p>
          <h1>Proyectos</h1>
          <p className="ps-header-line">Buenas ideas, <em>tomando forma.</em></p>
          <p className="ps-header-description">Clientes, productos propios y todo lo que construimos como equipo. Cada proyecto tiene su historia. Sigamos escribiéndola.</p>
          <button type="button" className="ps-create" onClick={() => setCreating(true)}><Plus size={17} />Nuevo proyecto<ArrowUpRight size={16} /></button>
        </div>
        <div className="ps-portfolio" aria-label={archived ? 'Resumen de proyectos archivados' : 'Resumen de proyectos sin archivar'}>
          <span className="ps-portfolio-label"><Sparkles size={14} />{archived ? 'EL ARCHIVO DEL EQUIPO' : 'EN ESTE ESPACIO'}</span>
          <div className="ps-portfolio-total"><strong>{data ? String(portfolio.total).padStart(2, '0') : '—'}</strong><span>proyectos.<br />Muchas posibilidades.</span></div>
          <div className="ps-portfolio-bottom"><span><strong>{data ? portfolio.active : '—'}</strong> {archived ? 'con estado activo' : 'en marcha'}</span><span><strong>{data ? portfolio.completed : '—'}</strong> tareas completadas</span></div>
          <svg viewBox="0 0 180 180" className="ps-portfolio-art" fill="none" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <circle key={i} cx={90 + i * 4} cy="90" r={74 - i * 5.6} stroke="currentColor" strokeWidth=".8" />)}</svg>
        </div>
      </header>

      <section className="ps-controls" aria-label="Explorar proyectos">
        <div className="ps-kind-row">
          <div className="ps-kind-tabs" role="group" aria-label="Tipo de proyecto">
            {KIND_TABS.map((tab) => <button key={tab.value} type="button" aria-pressed={kind === tab.value} onClick={() => setKind(tab.value)}>{tab.label}<span>{data ? (tab.value === 'todos' ? portfolio.total : portfolio.counts[tab.value]) : '—'}</span></button>)}
          </div>
          <div className="ps-view-toggle" role="group" aria-label="Vista de proyectos">
            <button type="button" aria-label="Vista de galería" aria-pressed={view === 'gallery'} onClick={() => changeView('gallery')}><LayoutGrid size={17} /></button>
            <button type="button" aria-label="Vista de lista" aria-pressed={view === 'list'} onClick={() => changeView('list')}><List size={18} /></button>
          </div>
        </div>
        <div className="ps-search-row">
          <label className="ps-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar</span><input type="search" placeholder="Buscar proyecto, cliente o responsable" value={q} onChange={(event) => setQ(event.target.value)} /></label>
          <label className="ps-sort"><span>Ordenar por</span><Select options={SORT_OPTIONS} value={sort} onChange={setSort} aria-label="Ordenar proyectos" /></label>
        </div>
        <div className="ps-filter-row" id="project-filters">
          <span className="ps-filter-label"><SlidersHorizontal size={14} />Afiná la vista</span>
          <Select options={options(PROJECT_STATUS)} value={status} onChange={setStatus} placeholder="Todos los estados" aria-label="Estado" />
          <Select options={options(SERVICES)} value={service} onChange={setService} placeholder="Todos los servicios" aria-label="Servicio" />
          <div className="ps-person-filter"><label className="sr-only" htmlFor="project-person-filter">Persona</label><PersonSelect id="project-person-filter" value={person} onChange={setPerson} placeholder="Todas las personas" /></div>
          <button type="button" className="ps-archive" onClick={() => setArchived((value) => !value)} aria-pressed={archived}><Archive size={14} />Archivados</button>
        </div>
        {filtered && <div className="ps-filter-chips" aria-label="Filtros aplicados">
          {activeFilters.map((filter) => <button key={filter.key} type="button" onClick={filter.clear} aria-label={`Quitar filtro ${filter.label}`}><span>{filter.label}</span><X size={12} /></button>)}
          <button type="button" className="ps-clear-filters" onClick={clearFilters}>Limpiar filtros</button>
        </div>}
      </section>

      {!data ? <PageLoader error={error} onRetry={reload} /> : <>
        {error && <div className="ps-error" role="alert">No pudimos actualizar los proyectos. Mostramos la última información disponible.<button type="button" onClick={reload}>Reintentar</button></div>}
        <div className="ps-results-head">
          <p role="status"><strong>{projects.length}</strong> {projects.length === 1 ? 'proyecto' : 'proyectos'}{archived ? ' en el archivo' : filtered ? ' en esta vista' : ' para seguir construyendo'}</p>
          {!archived && portfolio.late > 0 && <button type="button" className="ps-attention" aria-pressed={attention} onClick={() => setAttention((value) => !value)}><span />{portfolio.late} con avance pendiente<ArrowRight size={13} /></button>}
        </div>
        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title={archived ? 'No hay proyectos archivados con estos filtros' : filtered ? 'No hay proyectos con estos filtros' : 'La próxima buena idea empieza acá'}
            action={filtered ? <button type="button" className="btn btn-outline" onClick={clearFilters}>Limpiar filtros</button> : <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} />Crear proyecto</button>}>
            {filtered ? 'Probá con otra palabra, estado o persona. Siempre podés volver a ver todo el estudio.' : 'Registrá un proyecto y conectá a su equipo, tareas, citas y avances.'}
          </EmptyState>
        ) : (
          <div className={cx('ps-gallery', view === 'list' && 'ps-list')} aria-label={view === 'gallery' ? 'Galería de proyectos' : 'Lista de proyectos'}>
            {projects.map((project) => <ProjectCard key={project.id} p={project} view={view} />)}
          </div>
        )}
        <footer className="ps-footer"><span><Users size={13} />{portfolio.people} {portfolio.people === 1 ? 'persona' : 'personas'} {archived ? 'en estos proyectos archivados' : 'construyendo en este espacio'}</span><span>UN EQUIPO. MUCHAS POSIBILIDADES.</span></footer>
      </>}
      {creating && <ProjectForm open onClose={() => setCreating(false)} onSaved={(project) => { reload(); navigate(`/proyectos/${project.id}`); }} />}
    </div>
  );
}
