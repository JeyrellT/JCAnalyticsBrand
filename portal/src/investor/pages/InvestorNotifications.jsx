// Avisos del inversionista: lo que le pide una confirmación, las respuestas de JC Analytics
// y los mensajes sobre sus movimientos. Tocar un aviso lo marca como leído y lleva al movimiento.
import { useState } from 'react';
import { Bell, HandCoins, MessageSquare, CircleCheck, CircleAlert, TrendingUp, CheckCheck, BellOff } from 'lucide-react';
import { useSession, useResource } from '../../lib/session.jsx';
import { Link } from '../../lib/router.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, PageLoader, EmptyState, IconTile, Tabs, RowArrow, useAction, cx } from '../../components/ui.jsx';
import { dayKey, daysUntil, formatDayLong, formatDateTime, timeAgo } from '../../lib/format.js';
import { investorLink } from '../components.jsx';

/** Ícono, tono y etiqueta de cada aviso según su tipo y lo que pide. */
function metaOf(n) {
  const title = n.title ?? '';
  if (n.kind === 'message') return { icon: MessageSquare, tone: 'blue', label: 'Mensaje' };
  if (n.kind === 'movement') {
    // Al resolverse el movimiento, el servidor marca leído el pedido de confirmación.
    if (/^Confirmá/.test(title)) return n.read_at ? { icon: HandCoins, tone: 'slate', label: 'Pedido de confirmación' } : { icon: HandCoins, tone: 'amber', label: 'Por confirmar' };
    if (/objet/i.test(title)) return { icon: CircleAlert, tone: 'red', label: 'Objeción' };
    if (/confirm/i.test(title)) return { icon: CircleCheck, tone: 'teal', label: 'Confirmación' };
    return { icon: HandCoins, tone: 'blue', label: 'Movimiento' };
  }
  if (n.kind === 'investment') return { icon: TrendingUp, tone: 'teal', label: 'Inversión' };
  return { icon: Bell, tone: 'slate', label: 'Aviso' };
}

function dayLabel(key) {
  const d = daysUntil(key);
  if (d === 0) return 'Hoy';
  if (d === -1) return 'Ayer';
  const text = formatDayLong(key);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Los avisos nombran al socio del movimiento; para el inversionista, ese socio es "vos". */
function titleFor(n, user) {
  const title = n.title ?? '';
  if (!user?.name) return title;
  return title.replace(`Confirmá un aporte de ${user.name}:`, 'Confirmá tu aporte:')
    .replace(`Confirmá un retorno a ${user.name}:`, 'Confirmá tu retorno:')
    .replace(/^Confirmá un retorno:/, 'Confirmá tu retorno:');
}

function NotificationRow({ n, onOpen }) {
  const { user } = useSession();
  const meta = metaOf(n);
  const unread = !n.read_at;
  const to = investorLink(n.link);
  const body = (
    <>
      <span className="relative shrink-0">
        <IconTile icon={meta.icon} tone={meta.tone} />
        {unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-surface" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx('block text-sm leading-snug', unread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>{titleFor(n, user)}</span>
        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted sm:line-clamp-1">{n.body}</span>}
        <span className="mt-0.5 block text-[11.5px] text-muted-2">
          {meta.label} · <time dateTime={n.created_at} title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)}</time>
          {unread && <span className="sr-only"> · sin leer</span>}
        </span>
      </span>
    </>
  );
  const className = cx('group row w-full min-h-[68px] px-4 py-3 text-left sm:px-5', unread && 'bg-brand-soft/40');
  if (to) return <Link to={to} onClick={() => onOpen(n)} className={className}>{body}<RowArrow /></Link>;
  return <button type="button" onClick={() => onOpen(n)} className={className}>{body}</button>;
}

export default function InvestorNotifications() {
  const { refresh } = useSession();
  const { data, error, reload, setData } = useResource('/api/investor/notifications');
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
      const hit = (n) => !n.read_at && (ids === 'all' || ids.includes(n.id));
      return { ...s, unread: Math.max(0, s.unread - s.notifications.filter(hit).length), notifications: s.notifications.map((n) => (hit(n) ? { ...n, read_at: at } : n)) };
    });
  };

  // Abrir un aviso: se marca leído al instante (sin esperar) y el globo de la campana se refresca.
  const open = (n) => {
    if (n.read_at) return;
    markLocal([n.id]);
    api('/api/investor/notifications/read', { method: 'POST', body: { ids: [n.id] } }).then(() => refresh(), () => {});
  };

  const markAll = () => run(async () => {
    await api('/api/investor/notifications/read', { method: 'POST', body: { all: true } });
    markLocal('all');
    await refresh();
  }, { success: 'Listo: todos los avisos quedaron leídos.' });

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow="Novedades de tu inversión" title="Avisos" icon={Bell} tone="amber"
        subtitle="Confirmaciones pendientes, respuestas de JC Analytics y mensajes sobre tus movimientos."
        actions={unread > 0 && (
          <button type="button" className="btn btn-outline tap lg:min-h-10" onClick={markAll} disabled={busy}>
            <CheckCheck className="h-4 w-4" aria-hidden="true" />Marcar todo como leído
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
          Te avisamos aquí cuando JC Analytics registre un movimiento a tu nombre, confirme un aporte o te escriba.
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
