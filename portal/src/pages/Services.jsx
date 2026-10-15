// Servicios: el catálogo de lo que vendemos, agrupado por área, con precio base, quién lo lidera y la carga actual.
import { useMemo, useState } from 'react';
import { Search, Layers, Users, FolderKanban, ChevronDown, PauseCircle } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { Link } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, AvatarStack, IconTile, Badge, cx } from '../components/ui.jsx';
import { priceParts, groupIcon } from '../components/services.jsx';
import { formatMoney } from '../lib/format.js';
import { SERVICE_GROUPS } from '../../shared/catalog.js';

function Metric({ label, value, alert }) {
  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="truncate text-[11px] leading-tight text-muted">{label}</dt>
      <dd className={cx('num truncate text-[17px] font-bold leading-6', alert && 'text-coral-ink')}>{value}</dd>
    </div>
  );
}

function ServiceCard({ s, fx, tone }) {
  const price = priceParts(s, fx);
  const team = (s.members ?? []).filter((m) => m.id !== s.lead_id);
  return (
    <Link to={`/servicios/${s.key}`} className={cx('card card-hover group flex h-full flex-col gap-4 p-4 sm:p-5', !s.active && 'opacity-70 saturate-50 hover:opacity-100 hover:saturate-100')}>
      <div className="flex items-start gap-3">
        <IconTile icon={groupIcon(s.group)} tone={tone} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-bold leading-snug group-hover:text-brand-ink">{s.name}</h3>
          <p className="num mt-1 text-[15px] font-bold leading-tight">{price.text}</p>
          {price.approx && <p className="mt-0.5 text-xs text-muted tabular">{price.approx}</p>}
        </div>
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
    <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2.5 pr-3.5 text-sm shadow-card">
      <Icon className="h-4 w-4 shrink-0 text-violet-ink" aria-hidden="true" />
      <span className="num font-bold">{value}</span>
      <span className="truncate text-muted">{label}</span>
    </div>
  );
}

const Grid = ({ children }) => <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;

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
  const toneOf = (s) => SERVICE_GROUPS[s.group]?.tone ?? 'slate';

  return (
    <>
      <PageHeader eyebrow="Lo que ofrecemos" title="Servicios" icon={Layers} tone="violet"
        subtitle="Cada servicio con su precio base, quién lo lidera y cuánto trabajo tiene ahora. Tocá uno para ver el detalle." />

      {!data ? <PageLoader error={error} onRetry={reload} /> : (
        <div className="space-y-8">
          <div className="animate-rise flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" aria-label="Resumen">
              <SummaryChip icon={Layers} value={summary.active} label={summary.active === 1 ? 'servicio activo' : 'servicios activos'} />
              <SummaryChip icon={Users} value={summary.people} label={summary.people === 1 ? 'persona involucrada' : 'personas involucradas'} />
              <SummaryChip icon={FolderKanban} value={summary.projects} label={summary.projects === 1 ? 'proyecto activo' : 'proyectos activos'} />
            </div>
            <label className="relative w-full lg:w-80">
              <span className="sr-only">Buscar servicio</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
              <input className="input pl-9" type="search" placeholder="Buscar servicio o persona" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>

          {all.length === 0 ? (
            <EmptyState icon={Layers} tone="violet" title="Todavía no hay servicios">Cuando el servidor cargue el catálogo, los servicios aparecen acá.</EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} tone="violet" title="Ningún servicio coincide" action={<button type="button" className="btn btn-outline" onClick={() => setQ('')}>Limpiar búsqueda</button>}>
              Probá con otra palabra, por ejemplo el nombre de una persona.
            </EmptyState>
          ) : null}

          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`grupo-${g.key}`}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', `dot-${g.tone}`)} aria-hidden="true" />
                <h2 id={`grupo-${g.key}`} className="section-title truncate">{g.label}</h2>
                <Badge tone={g.tone}>{g.items.length}</Badge>
              </div>
              <Grid>{g.items.map((s) => <ServiceCard key={s.key} s={s} fx={fx} tone={g.tone} />)}</Grid>
            </section>
          ))}

          {paused.length > 0 && (
            <section aria-labelledby="grupo-pausados" className="rounded-2xl border border-dashed border-line-strong p-2 sm:p-3">
              <button type="button" id="grupo-pausados" aria-expanded={showPaused || !!text} onClick={() => setShowPaused((v) => !v)}
                className="tap flex w-full items-center justify-between gap-2 rounded-xl px-2 text-left font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
                <span className="flex items-center gap-2"><PauseCircle className="h-4 w-4" />Pausados <Badge tone="slate">{paused.length}</Badge></span>
                <ChevronDown className={cx('h-4 w-4 transition', (showPaused || text) && 'rotate-180')} />
              </button>
              {(showPaused || !!text) && <div className="mt-3 px-1 pb-1"><Grid>{paused.map((s) => <ServiceCard key={s.key} s={s} fx={fx} tone={toneOf(s)} />)}</Grid></div>}
            </section>
          )}
        </div>
      )}
    </>
  );
}
