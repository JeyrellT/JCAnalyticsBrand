// Buzón: movimientos que esperan mi confirmación (con respuesta en el lugar) y avisos del equipo.
import { Inbox as InboxIcon, CheckCheck, Bell, Wallet, ListChecks, CalendarDays, FolderKanban, MessageSquare, TrendingUp, HandCoins, Hourglass, Sparkles, MessageCircle } from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { useLimited } from '../components/mobile.jsx';
import { api } from '../lib/api.js';
import { navigate } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Badge, IconTile, SectionHead, RowArrow, useAction, cx } from '../components/ui.jsx';
import { MovementCard } from '../components/movements.jsx';
import { timeAgo } from '../lib/format.js';

const ICONS = { movement: Wallet, task: ListChecks, appointment: CalendarDays, project: FolderKanban, comment: MessageSquare, message: MessageSquare, investment: TrendingUp, whatsapp: MessageCircle };

function PendingMovements({ onChanged }) {
  const { data, error, reload } = useResource('/api/movements/pending');
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const changed = () => { reload(); onChanged(); };
  const n = data.to_confirm.length;
  return (
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="confirm-title">
        <SectionHead id="confirm-title" icon={HandCoins} tone={n ? 'violet' : 'teal'} title="Por confirmar" hint={n ? 'Esperan tu mensaje de vuelta.' : 'Nada pendiente a tu nombre.'}
          action={n > 0 && <Badge tone="violet">{n}</Badge>} />
        {n === 0 ? (
          <EmptyState icon={Sparkles} tone="teal" title="No hay plata esperando tu confirmación.">Cuando un socio te envíe un aporte o un retorno, aparece aquí para confirmarlo.</EmptyState>
        ) : (
          <div className="stagger space-y-3">{data.to_confirm.map((m) => <MovementCard key={m.id} m={m} showInvestment onChanged={changed} />)}</div>
        )}
      </section>
      {data.my_open.length > 0 && (
        <section aria-labelledby="mine-title">
          <SectionHead id="mine-title" icon={Hourglass} tone="amber" title="Lo que registraste y sigue abierto" hint="Esperando la confirmación de otra persona, o devuelto con una objeción."
            action={<Badge tone="amber">{data.my_open.length}</Badge>} />
          <div className="stagger space-y-3">{data.my_open.map((m) => <MovementCard key={m.id} m={m} showInvestment onChanged={changed} />)}</div>
        </section>
      )}
    </div>
  );
}

export default function InboxPage() {
  const { canInvest, refresh } = useSession();
  const { data, error, reload } = useResource('/api/notifications');
  const [notes, moreNotes] = useLimited(data?.notifications, 15); // v8: en el celular, los 15 más recientes primero
  const [run, busy] = useAction();
  const unread = data?.unread ?? 0;

  const open = async (n) => {
    if (!n.read_at) { await api('/api/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(() => {}); refresh(); }
    if (n.link) navigate(n.link);
    else reload();
  };
  const readAll = async () => { if (await run(() => api('/api/notifications/read', { method: 'POST', body: { all: true } }), { success: 'Todo marcado como leído' })) { reload(); refresh(); } };

  return (
    <>
      <PageHeader eyebrow="Centro de operaciones" title="Buzón" icon={InboxIcon} tone="teal" subtitle="Confirmaciones de dinero y avisos del equipo en un solo lugar."
        actions={unread > 0 && <button type="button" className="btn btn-outline" onClick={readAll} disabled={busy}><CheckCheck className="h-4 w-4" />Marcar todo leído</button>} />
      <div className={cx('grid items-start gap-6', canInvest && 'xl:grid-cols-[1.2fr_1fr]')}>
        {canInvest && <PendingMovements onChanged={refresh} />}
        <section className="card animate-rise min-w-0 overflow-hidden" aria-labelledby="notif-title">
          <SectionHead flush id="notif-title" icon={Bell} tone={unread ? 'red' : 'slate'} title="Avisos" hint={unread ? 'Tocá un aviso para abrirlo.' : 'Todo leído.'}
            action={unread > 0 && <Badge tone="red">{unread} sin leer</Badge>} />
          {!data ? <PageLoader error={error} onRetry={reload} /> : data.notifications.length === 0 ? (
            <div className="p-4 sm:p-5"><EmptyState icon={InboxIcon} tone="teal" title="Sin avisos">Cuando te asignen una tarea, te agenden una cita o te envíen plata, aparece aquí.</EmptyState></div>
          ) : (
            <>
            <ul className="divide-y divide-line">
              {notes.map((n) => {
                const Icon = ICONS[n.kind] ?? Bell;
                const fresh = !n.read_at;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className={cx('group row tap w-full items-start px-4 py-3 text-left sm:px-5', fresh && 'bg-brand-soft/40 hover:bg-brand-soft/60')}>
                      <IconTile icon={Icon} tone={fresh ? 'blue' : 'slate'} size="sm" className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-sm leading-snug', fresh ? 'font-semibold text-ink' : 'text-ink-2')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{n.body}</span>}
                        <span className="mt-1 block text-[11px] tabular text-muted-2 sm:hidden">{timeAgo(n.created_at)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                        <span className="hidden whitespace-nowrap text-[11px] tabular text-muted-2 sm:block">{timeAgo(n.created_at)}</span>
                        {fresh ? <span className="h-2 w-2 rounded-full bg-brand" aria-label="Sin leer" /> : <RowArrow className="hidden sm:block" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {moreNotes && <div className="px-4 pb-4 sm:px-5">{moreNotes}</div>}
            </>
          )}
        </section>
      </div>
    </>
  );
}
