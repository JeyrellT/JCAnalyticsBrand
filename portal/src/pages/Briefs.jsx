// Briefs (v5): bandeja del equipo con los requerimientos creativos de los clientes
// (por estado, cliente y búsqueda) y la pestaña Entregables (lo compartido para aprobación).
import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, Flame, CalendarDays, Store, PackageCheck, ExternalLink, FileText, MessageSquareQuote } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Badge, Avatar, ProgressBar, Tabs, RowArrow, cx } from '../components/ui.jsx';
import { StatusBadge } from '../components/common.jsx';
import { BRIEF_STATUS, BRIEF_FINAL_STATUSES } from '../../shared/brief.js';
import { DELIVERABLE_STATUS } from '../../shared/client-portal.js';
import { BriefStatusBadge } from '../components/brief/BriefSteps.jsx';
import { useLastData } from '../components/brief/brief-ui.js';
import { formatDate, timeAgo, daysUntil } from '../lib/format.js';

/** Lee y escribe filtros en la URL (?tab, ?estado, ?cliente) para que los enlaces del inicio funcionen. */
function useQueryFilters() {
  const { path, query } = useLocation();
  const set = (patch) => {
    const next = new URLSearchParams(query);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    const qs = next.toString();
    navigate(`${path}${qs ? `?${qs}` : ''}`, { replace: true });
  };
  return [query, set];
}

/** Fila de chips de filtro con conteo, con scroll propio en el celular. */
function FilterChips({ items, value, onChange, label }) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={label}>
      <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
        {items.map((it) => {
          const on = value === it.value;
          return (
            <button key={it.value || 'todos'} type="button" aria-pressed={on} onClick={() => onChange(it.value)}
              className={cx('inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition',
                on ? 'border-transparent bg-contrast text-contrast-fg shadow-card' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink')}>
              {it.tone && <span className={cx('h-1.5 w-1.5 rounded-full', `dot-${it.tone}`)} aria-hidden="true" />}
              {it.label}
              {it.count != null && <span className={cx('num tabular text-xs', on ? 'opacity-70' : 'text-muted-2')}>{it.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Falló la recarga pero hay datos anteriores a la vista. */
function StaleError({ onRetry }) {
  return (
    <p className="mb-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-coral-soft px-3 py-2 text-sm text-coral-ink">
      No se pudo actualizar la lista; se muestran los datos anteriores.
      <button type="button" className="font-semibold underline" onClick={onRetry}>Reintentar</button>
    </p>
  );
}

function ClientFilter({ value, onChange, clients }) {
  return (
    <label className="min-w-0 sm:w-60">
      <span className="sr-only">Cliente</span>
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Todos los clientes</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

/** Ventana de envío con la cercanía de la fecha (solo importa mientras el brief no salió). */
function SendWindow({ b }) {
  if (!b.send_start) return <span className="text-muted-2">Sin fecha de envío</span>;
  const d = daysUntil(b.send_start);
  const pending = !['entregado', 'cerrado', 'cancelado'].includes(b.status);
  const rel = !pending || d == null ? null : d < 0 ? { t: 'ya pasó', c: 'text-coral-ink' } : d === 0 ? { t: 'hoy', c: 'text-coral-ink' } : d <= 3 ? { t: `en ${d} d`, c: 'text-amber-ink' } : { t: `en ${d} d`, c: 'text-muted' };
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-2" aria-hidden="true" />
      <span className="truncate text-ink-2">{formatDate(b.send_start)}{b.send_end && b.send_end !== b.send_start ? ` → ${formatDate(b.send_end)}` : ''}</span>
      {rel && <span className={cx('shrink-0 font-semibold', rel.c)}>· {rel.t}</span>}
    </span>
  );
}

function BriefRow({ b, team }) {
  const meta = BRIEF_STATUS[b.status] ?? BRIEF_STATUS.borrador;
  const owner = team.find((u) => u.id === b.owner_id);
  return (
    <li>
      <Link to={`/briefs/${b.id}`} className="group row items-stretch gap-3 px-4 py-3.5 sm:px-5">
        <span className={cx('w-1 shrink-0 rounded-full', `dot-${meta.tone}`)} aria-hidden="true" />
        <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_13rem_10rem] lg:items-center lg:gap-6">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs font-semibold text-muted">{b.code}</span>
              {b.urgent && <Badge tone="red"><Flame className="h-3 w-3" aria-hidden="true" />Urgente</Badge>}
              {b.created_by?.type === 'cliente' && <Badge tone="amber"><Store className="h-3 w-3" aria-hidden="true" />Del cliente</Badge>}
              <span className="ml-auto lg:hidden"><BriefStatusBadge status={b.status} /></span>
            </p>
            <p className="mt-1 truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-brand-ink">{b.title}</p>
            <p className="truncate text-xs text-muted">{b.client_name}{b.project_name ? ` · ${b.project_name}` : ''}</p>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs lg:mt-0 lg:block lg:space-y-2">
            <SendWindow b={b} />
            {b.editable ? (
              <span className="flex items-center gap-2" title="Avance hacia el envío">
                <ProgressBar value={b.completeness.pct / 100} tone={b.completeness.pct >= 100 ? 'teal' : 'brand'} className="w-20 lg:w-24" label={`Completo al ${b.completeness.pct} %`} />
                <span className="num font-semibold text-muted">{b.completeness.pct} %</span>
              </span>
            ) : (
              <span className="block text-muted">v{b.version}{b.submitted_at ? ` · enviado ${timeAgo(b.submitted_at)}` : ''}</span>
            )}
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 lg:mt-0 lg:flex-col lg:items-end lg:justify-center">
            <span className="hidden lg:inline-flex"><BriefStatusBadge status={b.status} /></span>
            {b.owner_name ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
                <Avatar name={b.owner_name} color={owner?.color} size={20} />
                <span className="truncate">{b.owner_name.split(' ')[0]}</span>
              </span>
            ) : <span className="text-xs text-muted-2">Sin responsable</span>}
            <span className="text-[11px] text-muted-2 lg:hidden">Actualizado {timeAgo(b.updated_at)}</span>
          </div>
        </div>
        <RowArrow className="self-center" />
      </Link>
    </li>
  );
}

function DeliverableRow({ d }) {
  const to = d.project_id ? `/proyectos/${d.project_id}` : `/clientes/${d.client_id}`;
  const decided = d.decided_at && d.status !== 'en_revision';
  return (
    <li className="group relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5">
      <span className={cx('icon-tile icon-tile-sm mt-0.5', `tile-${DELIVERABLE_STATUS[d.status]?.tone ?? 'slate'}`)} aria-hidden="true"><PackageCheck className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0">
            <Link to={to} className="font-semibold text-ink after:absolute after:inset-0 group-hover:text-brand-ink">{d.title}</Link>
            <span className="ml-1.5 align-middle text-xs font-semibold text-muted">v{d.version}</span>
          </p>
          <StatusBadge map={DELIVERABLE_STATUS} value={d.status} />
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          <span className="truncate">{d.client_name}{d.project_name ? ` · ${d.project_name}` : ''}</span>
          {d.brief_id && (
            <><span aria-hidden="true">·</span><Link to={`/briefs/${d.brief_id}`} className="relative z-10 inline-flex items-center gap-1 font-mono font-semibold text-brand-ink hover:underline"><FileText className="h-3 w-3" aria-hidden="true" />{d.brief_code}</Link></>
          )}
        </p>
        <p className="mt-1 text-xs text-muted">
          Compartido{d.shared_by_name ? ` por ${d.shared_by_name}` : ''} {timeAgo(d.shared_at)}
          {decided && <> · <span className={cx('font-semibold', d.status === 'aprobado' ? 'text-teal-ink' : 'text-coral-ink')}>{d.status === 'aprobado' ? 'aprobado' : 'pidió cambios'}</span>{d.decided_by_name ? ` (${d.decided_by_name})` : ''} {timeAgo(d.decided_at)}</>}
        </p>
        {d.decision_note && (
          <p className="mt-1.5 flex gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2 group-hover:bg-surface">
            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2" aria-hidden="true" /><span className="min-w-0 break-words">{d.decision_note}</span>
          </p>
        )}
      </div>
      {d.url && (
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm relative z-10 min-h-9 shrink-0 self-center" aria-label={`Abrir ${d.title}`}>
          <ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Abrir</span>
        </a>
      )}
    </li>
  );
}

function BriefsTab({ estado, clientId, setFilters, clients }) {
  const { team } = useSession();
  const res = useResource(`/api/briefs${clientId ? `?client_id=${clientId}` : ''}`);
  const data = useLastData(res.data);
  const [q, setQ] = useState('');

  const all = useMemo(() => data?.briefs ?? [], [data]);
  // Sin filtro de cliente, el conteo del servidor (completo); con filtro, el de la lista de ese cliente.
  const counts = useMemo(() => {
    if (!data) return {};
    if (!clientId) return data.counts ?? {};
    const out = {};
    for (const b of all) out[b.status] = (out[b.status] ?? 0) + 1;
    return out;
  }, [data, all, clientId]);
  const total = Object.values(counts).reduce((a, n) => a + n, 0);
  const open = total - BRIEF_FINAL_STATUSES.reduce((a, s) => a + (counts[s] ?? 0), 0);

  const list = useMemo(() => {
    const text = q.trim().toLowerCase();
    return all
      .filter((b) => !estado || b.status === estado)
      .filter((b) => !text || [b.code, b.title, b.client_name, b.project_name, b.owner_name].filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [all, estado, q]);

  const chips = [
    { value: '', label: 'Todos', count: data ? total : null },
    ...Object.entries(BRIEF_STATUS)
      .filter(([k]) => (counts[k] ?? 0) > 0 || k === estado)
      .map(([k, m]) => ({ value: k, label: m.label, tone: m.tone, count: counts[k] ?? 0 })),
  ];
  const filtered = Boolean(estado || clientId || q.trim());
  const clear = () => { setQ(''); setFilters({ estado: null, cliente: null }); };

  return (
    <>
      <div className="animate-rise mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterChips label="Estado" items={chips} value={estado} onChange={(v) => setFilters({ estado: v || null })} />
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <ClientFilter value={clientId} clients={clients} onChange={(v) => setFilters({ cliente: v })} />
          <label className="relative min-w-0 sm:w-64">
            <span className="sr-only">Buscar brief</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
            <input className="input pl-9" type="search" placeholder="Código, título o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
      </div>

      {!data ? <PageLoader error={res.error} onRetry={res.reload} /> : all.length === 0 && !clientId ? (
        <EmptyState icon={ClipboardList} tone="violet" title="Todavía no hay briefs"
          action={<Link to="/briefs/nuevo" className="btn btn-primary"><Plus className="h-4 w-4" />Nuevo brief</Link>}>
          Cada requerimiento creativo (correos, redes, pauta, landing…) vive aquí con su formato CREATIVIDAD, versiones y aprobación. Los clientes con acceso al portal también los envían desde «Solicitudes».
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={Search} tone="violet" title="No hay briefs con estos filtros"
          action={filtered && <button type="button" className="btn btn-outline" onClick={clear}>Limpiar filtros</button>}>
          {estado ? `Ninguno en «${BRIEF_STATUS[estado]?.label ?? estado}»${clientId ? ' para este cliente' : ''}.` : 'Probá con otro cliente o con otra palabra.'}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2.5 text-xs text-muted">
            {list.length} {list.length === 1 ? 'brief' : 'briefs'}{!estado && open > 0 ? ` · ${open} abiertos` : ''}
            {all.length >= 300 && ' · se muestran los 300 más recientes; filtrá por cliente para ver el resto'}
          </p>
          {res.error && <StaleError onRetry={res.reload} />}
          <ul className={cx('card stagger divide-y divide-line overflow-hidden transition-opacity', res.loading && 'opacity-60')} aria-busy={res.loading}>
            {list.map((b) => <BriefRow key={b.id} b={b} team={team} />)}
          </ul>
        </>
      )}
    </>
  );
}

function DeliverablesTab({ estado, clientId, setFilters, clients, res }) {
  const data = useLastData(res.data);
  const all = useMemo(() => data?.deliverables ?? [], [data]);
  const counts = useMemo(() => {
    const out = {};
    for (const d of all) out[d.status] = (out[d.status] ?? 0) + 1;
    return out;
  }, [all]);
  const list = estado ? all.filter((d) => d.status === estado) : all;
  const chips = [
    { value: '', label: 'Todos', count: data ? all.length : null },
    ...Object.entries(DELIVERABLE_STATUS).map(([k, m]) => ({ value: k, label: m.label, tone: m.tone, count: data ? counts[k] ?? 0 : null })),
  ];
  return (
    <>
      <div className="animate-rise mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterChips label="Estado del entregable" items={chips} value={estado} onChange={(v) => setFilters({ estado: v || null })} />
        <ClientFilter value={clientId} clients={clients} onChange={(v) => setFilters({ cliente: v })} />
      </div>
      {!data ? <PageLoader error={res.error} onRetry={res.reload} /> : list.length === 0 ? (
        <EmptyState icon={PackageCheck} tone="teal" title={all.length ? 'No hay entregables con este estado' : 'Todavía no se compartieron entregables'}
          action={(estado || clientId) && <button type="button" className="btn btn-outline" onClick={() => setFilters({ estado: null, cliente: null })}>Limpiar filtros</button>}>
          {all.length ? 'Probá con otro estado o cliente.' : 'Se comparten desde la ficha de cada proyecto: el cliente los aprueba o pide cambios desde su portal, versión por versión.'}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2.5 text-xs text-muted">{list.length} {list.length === 1 ? 'entregable' : 'entregables'}{!estado && counts.en_revision ? ` · ${counts.en_revision} esperando al cliente` : ''}</p>
          {res.error && <StaleError onRetry={res.reload} />}
          <ul className={cx('card stagger divide-y divide-line overflow-hidden transition-opacity', res.loading && 'opacity-60')} aria-busy={res.loading}>
            {list.map((d) => <DeliverableRow key={d.id} d={d} />)}
          </ul>
        </>
      )}
    </>
  );
}

export default function Briefs() {
  const [query, setFilters] = useQueryFilters();
  const tab = query.get('tab') === 'entregables' ? 'entregables' : 'briefs';
  const rawEstado = query.get('estado') ?? '';
  const estado = (tab === 'briefs' ? Object.hasOwn(BRIEF_STATUS, rawEstado) : Object.hasOwn(DELIVERABLE_STATUS, rawEstado)) ? rawEstado : '';
  const clientId = Number(query.get('cliente')) || null;

  const clientsRes = useResource('/api/clients');
  const clients = useMemo(() => [...(clientsRes.data?.clients ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'es')), [clientsRes.data]);
  // Los entregables se cargan siempre: la pestaña muestra cuántos esperan al cliente.
  const deliverables = useResource(`/api/deliverables${clientId ? `?client_id=${clientId}` : ''}`);
  const waiting = (deliverables.data?.deliverables ?? []).filter((d) => d.status === 'en_revision').length;

  return (
    <>
      <PageHeader eyebrow="Clientes" title="Briefs" icon={ClipboardList} tone="violet"
        subtitle="Requerimientos creativos de los clientes: revisá, aprobá o pedí ajustes, y seguí lo que está en producción y por aprobar."
        actions={<Link to={`/briefs/nuevo${clientId ? `?cliente=${clientId}` : ''}`} className="btn btn-primary"><Plus className="h-4 w-4" />Nuevo brief</Link>} />

      <div className="animate-rise mb-4">
        <Tabs value={tab} onChange={(v) => setFilters({ tab: v === 'entregables' ? 'entregables' : null, estado: null })}
          tabs={[{ value: 'briefs', label: 'Briefs' }, { value: 'entregables', label: 'Entregables', count: deliverables.data ? waiting || null : null }]} />
      </div>

      {tab === 'briefs'
        ? <BriefsTab estado={estado} clientId={clientId} setFilters={setFilters} clients={clients} />
        : <DeliverablesTab estado={estado} clientId={clientId} setFilters={setFilters} clients={clients} res={deliverables} />}
    </>
  );
}
