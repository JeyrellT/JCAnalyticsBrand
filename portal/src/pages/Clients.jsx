// Clientes: con quién trabajamos, quién lleva cada relación y qué tenemos en curso con cada uno.
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Building2, MessageCircle, CalendarDays, Clock3, FolderKanban } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, Tabs } from '../components/ui.jsx';
import { ClientForm, ClientStatusBadge, clientWhatsapp } from '../components/clients.jsx';
import { formatMoney, formatDateTime, timeAgo } from '../lib/format.js';

const TABS = [
  { value: 'activo', label: 'Activos' },
  { value: 'prospecto', label: 'Prospectos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

function ClientCard({ c, senderName }) {
  const wa = clientWhatsapp(c, senderName);
  const active = c.projects_active ?? 0;
  return (
    <article className="card group relative flex min-w-0 flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold leading-snug group-hover:text-brand">
            {/* El enlace cubre toda la tarjeta; el botón de WhatsApp queda por encima. */}
            <Link to={`/clientes/${c.id}`} className="after:absolute after:inset-0 after:rounded-2xl">{c.name}</Link>
          </h3>
          <p className="truncate text-xs text-muted">{c.sector || 'Sin sector'}</p>
        </div>
        <ClientStatusBadge status={c.status} />
      </div>

      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate">
            {active ? `${active} ${active === 1 ? 'proyecto activo' : 'proyectos activos'}` : <span className="text-muted">Sin proyectos activos</span>}
          </span>
          {c.value_crc > 0 && <span className="shrink-0 font-semibold tabular" title="Valor de sus proyectos abiertos">{formatMoney(c.value_crc, 'CRC', { compact: true })}</span>}
        </li>
        <li className="flex items-center gap-2 text-muted">
          <Clock3 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{c.last_contact_at ? `Último contacto ${timeAgo(c.last_contact_at)}` : 'Sin contacto registrado'}</span>
        </li>
        {c.next_appointment_at && (
          <li className="flex items-center gap-2 font-medium text-brand">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate first-letter:uppercase">Cita: {formatDateTime(c.next_appointment_at)}</span>
          </li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        {c.owner_name ? (
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <Avatar name={c.owner_name} color={c.owner_color} size={26} />
            <span className="truncate"><span className="font-semibold text-ink">{c.owner_name.split(' ')[0]}</span> lleva la relación</span>
          </span>
        ) : <span className="text-xs text-muted">Nadie lleva la relación</span>}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm relative z-10 shrink-0" aria-label={`Escribir a ${c.name} por WhatsApp`}>
            <MessageCircle className="h-4 w-4 text-teal-dark" />WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}

export default function Clients() {
  const { user } = useSession();
  const { query } = useLocation();
  const { data, error, reload } = useResource('/api/clients');
  const [tab, setTab] = useState('activo');
  const [q, setQ] = useState('');

  // ?nuevo=1 abre el formulario al llegar (también desde el botón rápido estando ya aquí).
  const nuevo = query.get('nuevo') === '1';
  const [creating, setCreating] = useState(nuevo);
  const [seenNuevo, setSeenNuevo] = useState(nuevo);
  if (nuevo !== seenNuevo) {
    setSeenNuevo(nuevo);
    if (nuevo) setCreating(true);
  }
  useEffect(() => { if (nuevo) navigate('/clientes', { replace: true }); }, [nuevo]);

  const all = useMemo(() => data?.clients ?? [], [data]);
  const counts = useMemo(() => {
    const out = { todos: all.length };
    for (const c of all) out[c.status] = (out[c.status] ?? 0) + 1;
    return out;
  }, [all]);
  const clients = useMemo(() => {
    const text = q.trim().toLowerCase();
    return all
      .filter((c) => tab === 'todos' || c.status === tab)
      .filter((c) => !text || [c.name, c.sector, c.contact_name, c.owner_name].filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [all, tab, q]);

  const newButton = <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Nuevo cliente</button>;

  return (
    <>
      <PageHeader eyebrow="Relación con clientes" title="Clientes" subtitle="Con quién trabajamos, quién lleva cada relación y qué tenemos en curso." actions={newButton} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: data ? counts[t.value] ?? 0 : undefined }))} />
        </div>
        <label className="relative min-w-0 lg:w-72">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" type="search" placeholder="Buscar por nombre, sector o contacto" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : all.length === 0 ? (
        <EmptyState icon={Building2} title="Todavía no hay clientes" action={newButton}>
          Registrá cada cliente con su contacto y quién del equipo lleva la relación. Después le colgás proyectos y citas.
        </EmptyState>
      ) : clients.length === 0 ? (
        <EmptyState icon={Search} title={q.trim() ? `Nada coincide con “${q.trim()}”` : `No hay clientes ${TABS.find((t) => t.value === tab).label.toLowerCase()}`}
          action={q.trim() ? <button type="button" className="btn btn-outline" onClick={() => setQ('')}>Borrar búsqueda</button>
            : tab !== 'todos' && <button type="button" className="btn btn-outline" onClick={() => setTab('todos')}>Ver todos</button>}>
          {q.trim() ? 'Probá con otra palabra o revisá las otras pestañas.' : 'Revisá las otras pestañas o agregá uno nuevo.'}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{clients.map((c) => <ClientCard key={c.id} c={c} senderName={user.name} />)}</div>
      )}

      {creating && <ClientForm onClose={() => setCreating(false)} onSaved={(c) => { reload(); navigate(`/clientes/${c.id}`); }} />}
    </>
  );
}
