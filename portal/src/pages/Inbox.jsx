// Buzón: movimientos que esperan mi confirmación (con respuesta en el lugar) y avisos del equipo.
import { Inbox as InboxIcon, CheckCheck, Bell, Wallet, ListChecks, CalendarDays, FolderKanban, MessageSquare, TrendingUp } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { navigate } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Badge, useAction, cx } from '../components/ui.jsx';
import { MovementCard } from '../components/movements.jsx';
import { timeAgo } from '../lib/format.js';

const ICONS = { movement: Wallet, task: ListChecks, appointment: CalendarDays, project: FolderKanban, comment: MessageSquare, message: MessageSquare, investment: TrendingUp };

function PendingMovements({ onChanged }) {
  const { data, error, reload } = useResource('/api/movements/pending');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const changed = () => { reload(); onChanged(); };
  return (
    <div className="space-y-6">
      <section aria-labelledby="confirm-title">
        <div className="mb-3 flex items-center gap-2">
          <h2 id="confirm-title" className="section-title">Por confirmar</h2>
          {data.to_confirm.length > 0 && <Badge tone="violet">{data.to_confirm.length}</Badge>}
        </div>
        {data.to_confirm.length === 0 ? (
          <p className="card card-pad text-sm text-teal-dark">No hay plata esperando tu confirmación.</p>
        ) : (
          <div className="space-y-2.5">{data.to_confirm.map((m) => <MovementCard key={m.id} m={m} showInvestment onChanged={changed} />)}</div>
        )}
      </section>
      {data.my_open.length > 0 && (
        <section aria-labelledby="mine-title">
          <h2 id="mine-title" className="section-title mb-1">Lo que registraste y sigue abierto</h2>
          <p className="mb-3 text-xs text-muted">Esperando la confirmación de otra persona, o devuelto con una objeción.</p>
          <div className="space-y-2.5">{data.my_open.map((m) => <MovementCard key={m.id} m={m} showInvestment onChanged={changed} />)}</div>
        </section>
      )}
    </div>
  );
}

export default function InboxPage() {
  const { canInvest, refresh } = useSession();
  const { data, error, reload } = useResource('/api/notifications');
  const [run, busy] = useAction();

  const open = async (n) => {
    if (!n.read_at) { await api('/api/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(() => {}); refresh(); }
    if (n.link) navigate(n.link);
    else reload();
  };
  const readAll = async () => { if (await run(() => api('/api/notifications/read', { method: 'POST', body: { all: true } }), { success: 'Todo marcado como leído' })) { reload(); refresh(); } };

  return (
    <>
      <PageHeader eyebrow="Centro de operaciones" title="Buzón" subtitle="Confirmaciones de dinero y avisos del equipo en un solo lugar."
        actions={data?.unread > 0 && <button type="button" className="btn btn-outline" onClick={readAll} disabled={busy}><CheckCheck className="h-4 w-4" />Marcar todo leído</button>} />
      <div className={cx('grid gap-6', canInvest && 'xl:grid-cols-[1.2fr_1fr]')}>
        {canInvest && <PendingMovements onChanged={refresh} />}
        <section aria-labelledby="notif-title">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted" /><h2 id="notif-title" className="section-title">Avisos</h2>
            {data?.unread > 0 && <Badge tone="red">{data.unread} sin leer</Badge>}
          </div>
          {!data ? <PageLoader error={error} onRetry={reload} /> : data.notifications.length === 0 ? (
            <EmptyState icon={InboxIcon} title="Sin avisos">Cuando te asignen una tarea, te agenden una cita o te envíen plata, aparece aquí.</EmptyState>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {data.notifications.map((n) => {
                const Icon = ICONS[n.kind] ?? Bell;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className={cx('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50', !n.read_at && 'bg-brand-soft/40')}>
                      <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', !n.read_at ? 'bg-brand text-white' : 'bg-slate-100 text-muted')}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-sm', !n.read_at ? 'font-semibold' : 'text-ink/80')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 block line-clamp-2 text-xs text-muted">{n.body}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
