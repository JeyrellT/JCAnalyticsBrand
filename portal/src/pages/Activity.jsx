// Bitácora: quién hizo qué y cuándo. Control interno y trazabilidad (los movimientos de dinero solo los ven socios).
import { useState } from 'react';
import { History } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { PageHeader, PageLoader, EmptyState, Avatar, Tabs, cx } from '../components/ui.jsx';
import { formatDateTime, dayKey, formatDayLong, todayKey } from '../lib/format.js';

const ENTITIES = [
  { value: 'project', label: 'Proyectos' }, { value: 'task', label: 'Tareas' }, { value: 'appointment', label: 'Citas' },
  { value: 'investment', label: 'Inversiones' }, { value: 'movement', label: 'Movimientos de dinero' }, { value: 'user', label: 'Personas' },
  { value: 'settings', label: 'Ajustes y respaldos' }, { value: 'auth', label: 'Accesos' },
  // v5: clientes y su portal
  { value: 'client', label: 'Clientes' }, { value: 'brief', label: 'Briefs' }, { value: 'deliverable', label: 'Entregables' },
  { value: 'client_account', label: 'Accesos de clientes' }, { value: 'client_auth', label: 'Ingresos de clientes' },
];

/** Entidades donde una acción sin persona del equipo la hizo un cliente desde su portal. */
const CLIENT_ACTIONS = new Set(['brief', 'deliverable', 'client_account', 'client_auth']);

// Color del punto en la línea de tiempo según qué se tocó.
const DOT = {
  project: 'bg-brand', task: 'bg-brand', appointment: 'bg-violet', investment: 'bg-teal', movement: 'bg-teal',
  user: 'bg-amber', settings: 'bg-slate', auth: 'bg-slate',
  client: 'bg-amber', brief: 'bg-violet', deliverable: 'bg-teal', client_account: 'bg-coral', client_auth: 'bg-coral',
};

export default function Activity() {
  const { canInvest } = useSession();
  const [entity, setEntity] = useState('');
  const { data, error, reload } = useResource(`/api/activity?limit=300${entity ? `&entity=${entity}` : ''}`);
  const options = ENTITIES.filter((e) => canInvest || !['investment', 'movement'].includes(e.value));
  const today = todayKey();
  const groups = [];
  for (const a of data?.activity ?? []) {
    const key = dayKey(a.created_at);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1).items.push(a);
  }
  return (
    <>
      <PageHeader eyebrow="Control interno" title="Bitácora" icon={History} tone="slate" subtitle="Registro inalterable de las acciones del equipo. Útil para auditar decisiones y movimientos." />
      <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" role="group" aria-label="Filtrar">
        <Tabs value={entity} onChange={setEntity} tabs={[{ value: '', label: 'Todo' }, ...options]} className="whitespace-nowrap" />
      </div>
      {!data ? <PageLoader error={error} onRetry={reload} /> : groups.length === 0 ? <EmptyState icon={History} tone="slate" title="Sin registros">Nada registrado con este filtro todavía.</EmptyState> : (
        <div className="stagger space-y-6">
          {groups.map((g) => (
            <section key={g.key} className="card overflow-hidden" aria-label={formatDayLong(g.key)}>
              <h2 className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted sm:px-5">
                <span className="truncate">{g.key === today ? 'Hoy' : formatDayLong(g.key)}</span>
                <span className="shrink-0 tabular font-semibold text-muted-2">{g.items.length} {g.items.length === 1 ? 'acción' : 'acciones'}</span>
              </h2>
              <ol className="px-4 py-4 sm:px-5">
                {g.items.map((a, i) => {
                  const last = i === g.items.length - 1;
                  return (
                    <li key={a.id} className={cx('relative flex gap-3 pl-6', !last && 'pb-5')}>
                      {!last && <span className="absolute bottom-0 left-[6px] top-5 w-[2px] rounded-full bg-line-strong/70" aria-hidden="true" />}
                      <span className={cx('absolute left-[3px] top-[10px] h-2 w-2 rounded-full ring-[3px] ring-surface', DOT[a.entity] ?? 'bg-slate')} aria-hidden="true" />
                      <Avatar name={a.user_name ?? (CLIENT_ACTIONS.has(a.entity) ? 'Cliente' : 'Sistema')} color={a.user_color ?? (CLIENT_ACTIONS.has(a.entity) ? 'var(--coral)' : 'var(--slate)')} size={28} className="mt-px" />
                      <p className="min-w-0 flex-1 text-sm leading-snug text-ink">
                        {a.summary}
                        <span className="mt-0.5 block text-xs text-muted sm:hidden"><time dateTime={a.created_at}>{formatDateTime(a.created_at).split(',').pop().trim()}</time></span>
                      </p>
                      <time className="hidden shrink-0 pt-0.5 text-xs tabular text-muted sm:block" dateTime={a.created_at}>{formatDateTime(a.created_at).split(',').pop().trim()}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
