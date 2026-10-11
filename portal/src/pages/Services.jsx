// Servicios: el catálogo de lo que vendemos, agrupado por área, con precio base, quién lo lidera y la carga actual.
import { useMemo, useState } from 'react';
import { Search, Layers, Users, FolderKanban, ChevronDown, PauseCircle } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, AvatarStack, cx } from '../components/ui.jsx';
import { priceParts } from '../components/services.jsx';
import { formatMoney } from '../lib/format.js';
import { SERVICE_GROUPS } from '../../shared/catalog.js';

function Metric({ label, value, alert }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="truncate text-[11px] text-muted">{label}</dt>
      <dd className={cx('truncate font-display text-base font-bold tabular', alert && 'text-coral')}>{value}</dd>
    </div>
  );
}

function ServiceCard({ s, fx }) {
  const price = priceParts(s, fx);
  const team = (s.members ?? []).filter((m) => m.id !== s.lead_id);
  return (
    <Link to={`/servicios/${s.key}`} className={cx('card group flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md', !s.active && 'opacity-70')}>
      <div className="min-w-0">
        <h3 className="font-display text-base font-bold leading-snug group-hover:text-brand">{s.name}</h3>
        <p className="mt-0.5 text-sm font-semibold text-ink/80">{price.text}</p>
        {price.approx && <p className="text-xs text-muted tabular">{price.approx}</p>}
      </div>

      <div className="flex items-center justify-between gap-2">
        {s.lead_id ? (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <Avatar name={s.lead_name} color={s.lead_color} size={28} />
            <span className="min-w-0">
              <span className="block text-[11px] leading-tight text-muted">Líder</span>
              <span className="block truncate font-semibold leading-tight">{s.lead_name?.split(' ')[0]}</span>
            </span>
          </span>
        ) : <span className="text-sm text-muted">Sin responsable</span>}
        {team.length > 0 && <AvatarStack people={team} size={24} />}
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Metric label="Proyectos activos" value={s.projects_active ?? 0} />
        <Metric label="Valor activo" value={formatMoney(s.value_crc_active ?? 0, 'CRC', { compact: true })} />
        <Metric label="Tareas abiertas" value={s.open_tasks ?? 0} />
      </dl>
    </Link>
  );
}

function SummaryChip({ icon: Icon, value, label }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-line bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:py-1.5">
      <span className="flex items-center gap-1.5"><Icon className="h-4 w-4 shrink-0 text-teal-dark" /><span className="font-bold tabular">{value}</span></span>
      <span className="text-xs leading-tight text-muted sm:text-sm">{label}</span>
    </div>
  );
}

const Grid = ({ children }) => <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;

export default function Services() {
  const { settings } = useSession();
  const fx = Number(settings?.fx_usd_crc) || null;
  const { data, error, reload } = useResource('/api/services');
  const [q, setQ] = useState('');
  const [showPaused, setShowPaused] = useState(false);

  const all = useMemo(() => data?.services ?? [], [data]);
  const summary = useMemo(() => {
    const active = all.filter((s) => s.active);
    const people = new Set();
    for (const s of active) {
      if (s.lead_id) people.add(s.lead_id);
      for (const m of s.members ?? []) people.add(m.id);
    }
    return { active: active.length, people: people.size, projects: active.reduce((n, s) => n + (s.projects_active ?? 0), 0) };
  }, [all]);

  const text = q.trim().toLowerCase();
  const filtered = text
    ? all.filter((s) => [s.name, s.group_label, s.lead_name, s.description, ...(s.members ?? []).map((m) => m.name)].filter(Boolean).join(' ').toLowerCase().includes(text))
    : all;
  const active = filtered.filter((s) => s.active);
  const paused = filtered.filter((s) => !s.active);
  const groups = [
    ...Object.entries(SERVICE_GROUPS).map(([key, meta]) => ({ key, label: meta.label, tone: meta.tone, items: active.filter((s) => s.group === key) })),
    { key: 'otros', label: 'Otros', tone: 'slate', items: active.filter((s) => !SERVICE_GROUPS[s.group]) },
  ].filter((g) => g.items.length);

  return (
    <>
      <PageHeader eyebrow="Lo que ofrecemos" title="Servicios"
        subtitle="Cada servicio con su precio base, quién lo lidera y cuánto trabajo tiene ahora. Tocá uno para ver el detalle." />

      {!data ? <PageLoader error={error} onRetry={reload} /> : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" aria-label="Resumen">
              <SummaryChip icon={Layers} value={summary.active} label={summary.active === 1 ? 'servicio activo' : 'servicios activos'} />
              <SummaryChip icon={Users} value={summary.people} label={summary.people === 1 ? 'persona involucrada' : 'personas involucradas'} />
              <SummaryChip icon={FolderKanban} value={summary.projects} label={summary.projects === 1 ? 'proyecto activo' : 'proyectos activos'} />
            </div>
            <label className="relative w-full lg:w-72">
              <span className="sr-only">Buscar servicio</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-9" type="search" placeholder="Buscar servicio o persona" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>

          {all.length === 0 ? (
            <EmptyState icon={Layers} title="Todavía no hay servicios">Cuando el servidor cargue el catálogo, los servicios aparecen acá.</EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="Ningún servicio coincide" action={<button type="button" className="btn btn-outline" onClick={() => setQ('')}>Limpiar búsqueda</button>}>
              Probá con otra palabra, por ejemplo el nombre de una persona.
            </EmptyState>
          ) : null}

          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`grupo-${g.key}`}>
              <h2 id={`grupo-${g.key}`} className="section-title mb-3 flex items-center gap-2">
                <span className={cx('h-2.5 w-2.5 rounded-full', `dot-${g.tone}`)} />
                {g.label}
                <span className="text-sm font-normal text-muted">{g.items.length}</span>
              </h2>
              <Grid>{g.items.map((s) => <ServiceCard key={s.key} s={s} fx={fx} />)}</Grid>
            </section>
          ))}

          {paused.length > 0 && (
            <section aria-labelledby="grupo-pausados" className="rounded-2xl border border-dashed border-line p-3 sm:p-4">
              <button type="button" id="grupo-pausados" aria-expanded={showPaused || !!text} onClick={() => setShowPaused((v) => !v)}
                className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-1 text-left font-semibold text-muted hover:text-ink">
                <span className="flex items-center gap-2"><PauseCircle className="h-4 w-4" />Pausados <span className="font-normal">{paused.length}</span></span>
                <ChevronDown className={cx('h-4 w-4 transition', (showPaused || text) && 'rotate-180')} />
              </button>
              {(showPaused || !!text) && <div className="mt-3"><Grid>{paused.map((s) => <ServiceCard key={s.key} s={s} fx={fx} />)}</Grid></div>}
            </section>
          )}
        </div>
      )}
    </>
  );
}
