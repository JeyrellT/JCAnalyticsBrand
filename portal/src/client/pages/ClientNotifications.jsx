// Avisos del portal de clientes: lo nuevo de solicitudes, entregables, avances y documentos.
// Tocar un aviso lo marca como leído y lleva a su sección.
import { useState } from 'react';
import { Bell, ClipboardList, PackageCheck, History, FolderOpen, UserCog, CheckCheck, BellOff } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, PageLoader, EmptyState, IconTile, Tabs, RowArrow, useAction, cx } from '../../components/ui.jsx';
import { dayKey, daysUntil, formatDayLong, timeAgo } from '../../lib/format.js';
import { CLIENT_NOTIFICATION_KINDS } from '../../../shared/client-portal.js';

const KIND = {
  brief: { icon: ClipboardList, tone: 'violet' },
  deliverable: { icon: PackageCheck, tone: 'amber' },
  avance: { icon: History, tone: 'teal' },
  documento: { icon: FolderOpen, tone: 'blue' },
  cuenta: { icon: UserCog, tone: 'slate' },
};

const internalLink = (link) => (typeof link === 'string' && /^\/cliente(\/|$)/.test(link) ? link : null);

function dayLabel(key) {
  const d = daysUntil(key);
  if (d === 0) return 'Hoy';
  if (d === -1) return 'Ayer';
  const text = formatDayLong(key);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function NotificationRow({ n, onOpen }) {
  const meta = KIND[n.kind] ?? KIND.cuenta;
  const unread = !n.read_at;
  const to = internalLink(n.link);
  const body = (
    <>
      <span className="relative shrink-0">
        <IconTile icon={meta.icon} tone={meta.tone} />
        {unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-surface" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx('block text-sm leading-snug', unread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>{n.title}</span>
        {n.body && <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>}
        <span className="mt-0.5 block text-[11.5px] text-muted-2">{CLIENT_NOTIFICATION_KINDS[n.kind] ?? 'Aviso'} · {timeAgo(n.created_at)}{unread && <span className="sr-only"> · sin leer</span>}</span>
      </span>
    </>
  );
  const className = cx('group row w-full min-h-[68px] px-4 py-3 text-left sm:px-5', unread && 'bg-brand-soft/40');
  if (to) return <Link to={to} onClick={() => onOpen(n)} className={className}>{body}<RowArrow /></Link>;
  return <button type="button" onClick={() => onOpen(n)} className={className}>{body}</button>;
}

export default function ClientNotifications() {
  const { refresh } = useSession();
  const { data, error, reload, setData } = useResource('/api/client/notifications');
  const [run, busy] = useAction();
  const [tab, setTab] = useState('todos');
  if (!data) return <PageLoader error={error} onRetry={reload} />;

  const { notifications, unread } = data;
  const list = tab === 'sin_leer' ? notifications.filter((n) => !n.read_at) : notifications;
  const groups = [];
  for (const n of list) {
    const key = dayKey(n.created_at);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1).items.push(n);
  }

  const markLocal = (ids) => {
    const at = new Date().toISOString();
    setData((s) => {
      const changed = s.notifications.filter((n) => !n.read_at && (ids === 'all' || ids.includes(n.id))).length;
      return {
        ...s,
        unread: Math.max(0, s.unread - changed),
        notifications: s.notifications.map((n) => (!n.read_at && (ids === 'all' || ids.includes(n.id)) ? { ...n, read_at: at } : n)),
      };
    });
  };

  // Abrir un aviso: se marca leído al instante (sin esperar) y el globo de la campana se refresca.
  const open = (n) => {
    if (n.read_at) return;
    markLocal([n.id]);
    api('/api/client/notifications/read', { method: 'POST', body: { ids: [n.id] } }).then(() => refresh(), () => {});
  };

  const markAll = () => run(async () => {
    await api('/api/client/notifications/read', { method: 'POST', body: { all: true } });
    markLocal('all');
    await refresh();
  }, { success: 'Listo: todos los avisos quedaron leídos.' });

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow="Novedades de tu servicio" title="Avisos" icon={Bell} tone="amber"
        subtitle="Lo nuevo de tus solicitudes, entregables, avances y documentos."
        actions={unread > 0 && (
          <button type="button" className="btn btn-outline" onClick={markAll} disabled={busy}>
            <CheckCheck className="h-4 w-4" />Marcar todo como leído
          </button>
        )} />

      {notifications.length > 0 && (
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'todos', label: 'Todos', count: notifications.length },
          { value: 'sin_leer', label: 'Sin leer', count: unread },
        ]} />
      )}

      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} tone="amber" title="Sin avisos por ahora">
          Te avisamos aquí cuando haya un entregable para revisar, una respuesta a tus solicitudes o un documento nuevo.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={CheckCheck} tone="teal" title="Estás al día">No tenés avisos sin leer.</EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`day-${g.key}`} className="animate-rise">
              <h2 id={`day-${g.key}`} className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{dayLabel(g.key)}</h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {g.items.map((n) => <li key={n.id}><NotificationRow n={n} onOpen={open} /></li>)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
