// Clientes: con quién trabajamos, quién lleva cada relación y qué tenemos en curso con cada uno.
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Building2, MessageCircle, CalendarDays, Clock3, FolderKanban } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, Tabs, cx } from '../components/ui.jsx';
import { ClientForm, ClientStatusBadge, clientWhatsapp } from '../components/clients.jsx';
import { formatMoney, formatDateTime, timeAgo } from '../lib/format.js';

const TABS = [
  { value: 'activo', label: 'Activos' },
  { value: 'prospecto', label: 'Prospectos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'todos', label: 'Todos' },
];

/** Fila de dato de la tarjeta: ícono, etiqueta y el valor en números a la derecha. */
function Fact({ icon: Icon, label, value, muted = false, accent = false, title }) {
  return (
    <li className="flex min-h-7 items-center gap-2.5 text-sm">
      <Icon className={cx('h-4 w-4 shrink-0', accent ? 'text-brand-ink' : 'text-muted-2')} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-muted">{label}</span>
      <span className={cx('num shrink-0 text-right text-[15px] font-semibold', muted ? 'text-muted-2' : accent ? 'text-brand-ink' : 'text-ink')} title={title}>{value}</span>
    </li>
  );
}

function ClientCard({ c, senderName }) {
  const wa = clientWhatsapp(c, senderName);
  const active = c.projects_active ?? 0;
  const initial = (c.name ?? '').trim().charAt(0).toUpperCase();
  return (
    <article className="card card-hover group relative flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="icon-tile tile-amber font-display text-lg font-bold" aria-hidden="true">{initial || <Building2 className="h-[18px] w-[18px]" />}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-bold leading-snug group-hover:text-brand-ink">
            {/* El enlace cubre toda la tarjeta; el botón de WhatsApp queda por encima. */}
            <Link to={`/clientes/${c.id}`} className="after:absolute after:inset-0 after:rounded-2xl">{c.name}</Link>
          </h3>
          <p className="mt-0.5 truncate text-sm text-muted">{c.sector || 'Sin sector'}</p>
        </div>
        <ClientStatusBadge status={c.status} />
      </div>

      <ul className="space-y-1.5">
        <Fact icon={FolderKanban} label={active === 1 ? 'Proyecto activo' : 'Proyectos activos'}
          value={c.value_crc > 0 ? <>{active}<span className="ml-1.5 text-xs font-medium text-muted">· {formatMoney(c.value_crc, 'CRC', { compact: true })}</span></> : active}
          muted={!active} title={c.value_crc > 0 ? 'Valor de sus proyectos abiertos' : undefined} />
        <Fact icon={Clock3} label="Último contacto" value={c.last_contact_at ? timeAgo(c.last_contact_at) : 'Sin registro'} muted={!c.last_contact_at} />
        <Fact icon={CalendarDays} label="Próxima cita" value={c.next_appointment_at ? <span className="first-letter:uppercase">{formatDateTime(c.next_appointment_at)}</span> : 'Sin agendar'}
          muted={!c.next_appointment_at} accent={!!c.next_appointment_at} />
      </ul>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        {c.owner_name ? (
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <Avatar name={c.owner_name} color={c.owner_color} size={26} />
            <span className="truncate"><span className="font-semibold text-ink">{c.owner_name.split(' ')[0]}</span> lleva la relación</span>
          </span>
        ) : <span className="text-xs text-muted">Nadie lleva la relación</span>}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm relative z-10 shrink-0 min-h-9" aria-label={`Escribir a ${c.name} por WhatsApp`}>
            <MessageCircle className="h-4 w-4 text-teal-ink" />WhatsApp
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
      <PageHeader eyebrow="Relación con clientes" title="Clientes" icon={Building2} tone="amber"
        subtitle="Con quién trabajamos, quién lleva cada relación y qué tenemos en curso." actions={newButton} />

      <div className="animate-rise mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: data ? counts[t.value] ?? 0 : undefined }))} />
        </div>
        <label className="relative min-w-0 lg:w-80">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
          <input className="input pl-9" type="search" placeholder="Buscar por nombre, sector o contacto" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {!data ? <PageLoader error={error} onRetry={reload} /> : all.length === 0 ? (
        <EmptyState icon={Building2} tone="amber" title="Todavía no hay clientes" action={newButton}>
          Registrá cada cliente con su contacto y quién del equipo lleva la relación. Después le colgás proyectos y citas.
        </EmptyState>
      ) : clients.length === 0 ? (
        <EmptyState icon={Search} tone="amber" title={q.trim() ? `Nada coincide con “${q.trim()}”` : `No hay clientes ${TABS.find((t) => t.value === tab).label.toLowerCase()}`}
          action={q.trim() ? <button type="button" className="btn btn-outline" onClick={() => setQ('')}>Borrar búsqueda</button>
            : tab !== 'todos' && <button type="button" className="btn btn-outline" onClick={() => setTab('todos')}>Ver todos</button>}>
          {q.trim() ? 'Probá con otra palabra o revisá las otras pestañas.' : 'Revisá las otras pestañas o agregá uno nuevo.'}
        </EmptyState>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{clients.map((c) => <ClientCard key={c.id} c={c} senderName={user.name} />)}</div>
      )}

      {creating && <ClientForm onClose={() => setCreating(false)} onSaved={(c) => { reload(); navigate(`/clientes/${c.id}`); }} />}
    </>
  );
}
