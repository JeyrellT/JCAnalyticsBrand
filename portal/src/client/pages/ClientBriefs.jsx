// Portal de clientes (v5) · Solicitudes: los briefs creativos del cliente, con el flujo
// explicado en simple y acceso directo a una nueva solicitud.
import { useMemo, useState } from 'react';
import { ClipboardList, Plus, CalendarDays, ChevronRight, AlertTriangle, PencilLine, FolderKanban } from 'lucide-react';
import { useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, ProgressBar, Tabs, RowArrow, cx } from '../../components/ui.jsx';
import { BRIEF_FINAL_STATUSES, BRIEF_STATUS } from '../../../shared/brief.js';
import { BriefStatusBadge } from '../../components/brief/BriefSteps.jsx';
import { formatDate, timeAgo } from '../../lib/format.js';

/** El recorrido de una solicitud, contado al cliente. */
const FLOW = [
  ['borrador', 'Borrador'],
  ['enviado', 'Enviada'],
  ['observado', 'En revisión o ajustes'],
  ['aprobado', 'Aprobada'],
  ['en_produccion', 'En producción'],
  ['entregado', 'Entregada'],
];

export function ClientBriefFlow({ className }) {
  return (
    <section className={cx('card-sunken p-4 sm:p-5', className)} aria-labelledby="flujo-solicitudes">
      <h2 id="flujo-solicitudes" className="eyebrow">Cómo funciona</h2>
      <ol className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-2">
        {FLOW.map(([key, label], i) => (
          <li key={key} className="flex items-center gap-1">
            <span className={cx('chip text-[12px]', `tone-${BRIEF_STATUS[key].tone}`)}>
              <span className="num opacity-70">{i + 1}</span>{label}
            </span>
            {i < FLOW.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-2" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <p className="mt-2.5 max-w-3xl text-xs leading-relaxed text-muted">
        Podés guardar un borrador y terminarlo después: nadie lo revisa hasta que lo enviés. Al enviarla, guardamos una copia congelada,
        la revisamos y te avisamos por aquí si hace falta ajustar algo. Una vez aprobada, arrancamos a producir.
      </p>
    </section>
  );
}

function SolicitudRow({ b }) {
  const tone = BRIEF_STATUS[b.status]?.tone ?? 'slate';
  return (
    <li>
      <Link to={`/cliente/solicitudes/${b.id}`} className="group row items-stretch gap-3 px-4 py-3.5 sm:px-5">
        <span className={cx('w-1 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs font-semibold text-muted">{b.code}</span>
            <span className="ml-auto sm:ml-0"><BriefStatusBadge status={b.status} audience="client" /></span>
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-brand-ink">{b.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {b.project_name && <span className="inline-flex min-w-0 items-center gap-1"><FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-2" aria-hidden="true" /><span className="truncate">{b.project_name}</span></span>}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-2" aria-hidden="true" />
              {b.send_start ? `Sale el ${formatDate(b.send_start)}${b.send_end && b.send_end !== b.send_start ? ` → ${formatDate(b.send_end)}` : ''}` : 'Sin fecha de envío'}
            </span>
            <span className="text-muted-2">Actualizada {timeAgo(b.updated_at)}</span>
          </p>
          {b.status === 'observado' && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber-ink">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Te pedimos ajustes: revisá la nota y volvé a enviarla
            </p>
          )}
          {b.status === 'borrador' && (
            <span className="mt-2 flex max-w-xs items-center gap-2 text-xs text-muted">
              <PencilLine className="h-3.5 w-3.5 shrink-0 text-muted-2" aria-hidden="true" />
              <ProgressBar value={b.completeness.pct / 100} tone={b.completeness.pct >= 100 ? 'teal' : 'brand'} label={`Completa al ${b.completeness.pct} %`} />
              <span className="num shrink-0 font-semibold">{b.completeness.pct} %</span>
            </span>
          )}
        </div>
        <RowArrow className="self-center" />
      </Link>
    </li>
  );
}

const TABS = [
  { value: 'abiertas', label: 'En curso' },
  { value: 'cerradas', label: 'Finalizadas' },
  { value: 'todas', label: 'Todas' },
];

export default function ClientBriefs() {
  const { data, error, reload } = useResource('/api/client/briefs');
  const [tab, setTab] = useState('abiertas');
  const all = useMemo(() => data?.briefs ?? [], [data]);
  const counts = useMemo(() => {
    const closed = all.filter((b) => BRIEF_FINAL_STATUSES.includes(b.status)).length;
    return { abiertas: all.length - closed, cerradas: closed, todas: all.length };
  }, [all]);
  const list = all.filter((b) => (tab === 'todas' ? true : tab === 'cerradas' ? BRIEF_FINAL_STATUSES.includes(b.status) : !BRIEF_FINAL_STATUSES.includes(b.status)));
  const newButton = <Link to="/cliente/solicitudes/nueva" className="btn btn-primary"><Plus className="h-4 w-4" />Nueva solicitud</Link>;

  return (
    <>
      <PageHeader eyebrow="Brief creativo" title="Solicitudes" icon={ClipboardList} tone="violet"
        subtitle="Pedile a JC Analytics correos, publicaciones, pauta o piezas nuevas con el brief creativo, y seguí cada solicitud hasta la entrega."
        actions={newButton} />

      <ClientBriefFlow className="animate-rise mb-5" />

      {!data ? <PageLoader error={error} onRetry={reload} /> : all.length === 0 ? (
        <EmptyState icon={ClipboardList} tone="violet" title="Todavía no hay solicitudes" action={newButton}>
          Contanos qué necesitás (qué material, para qué, con qué oferta y cuándo sale) y el equipo se encarga del resto.
        </EmptyState>
      ) : (
        <>
          <div className="animate-rise mb-4 no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
          </div>
          {list.length === 0 ? (
            <EmptyState icon={ClipboardList} tone="violet" title={tab === 'abiertas' ? 'No tenés solicitudes en curso' : 'Todavía no hay solicitudes finalizadas'}
              action={tab === 'abiertas' ? newButton : <button type="button" className="btn btn-outline" onClick={() => setTab('todas')}>Ver todas</button>}>
              {tab === 'abiertas' ? 'Cuando necesités una pieza nueva, creá una solicitud.' : 'Las solicitudes cerradas o canceladas aparecen aquí.'}
            </EmptyState>
          ) : (
            <ul className="card stagger divide-y divide-line overflow-hidden">
              {list.map((b) => <SolicitudRow key={b.id} b={b} />)}
            </ul>
          )}
        </>
      )}
    </>
  );
}
