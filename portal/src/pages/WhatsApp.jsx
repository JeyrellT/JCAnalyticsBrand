// WhatsApp (docs/whatsapp.md): bandeja de conversaciones con el asistente, respuesta del equipo,
// cola de avisos a clientes y estado de la conexión con Meta.
import { useEffect, useRef, useState } from 'react';
import {
  MessageCircle, Search, Bot, UserRound, Users, Hand, Undo2, CheckCheck, Send, AlertTriangle, Clock3, Building2, RefreshCw,
  Inbox, ListChecks, PlugZap, CheckCircle2, XCircle, ArrowLeft, Copy, BellRing, FileText,
} from 'lucide-react';
import { useResource, useSession } from '../lib/session.jsx';
import { api, isDemo } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import { PageHeader, PageLoader, EmptyState, Badge, IconTile, SectionHead, Tabs, useAction, useToast, cx } from '../components/ui.jsx';
import { formatDateTime, timeAgo } from '../lib/format.js';
import { WA_TRAYS, WA_OUTBOX_STATUS, WA_ORIGINS } from '../../shared/whatsapp.js';

const REFRESH_MS = 15_000;
/** health_status.can_send_message y quality_rating de Meta en palabras. */
const CAN_SEND = { AVAILABLE: 'sí', LIMITED: 'con límites', BLOCKED: 'no (bloqueado)' };
const QUALITY = { GREEN: 'alta', YELLOW: 'media', RED: 'baja', UNKNOWN: 'sin calificar' };
const REASONS = { persona: 'Pide una persona', urgente: 'Urgente', queja: 'Queja', adjunto: 'Envió un archivo', pagos: 'Pagos', no_entendio: 'El asistente no entendió', espera: 'Escribió mientras esperaba' };

/** Recarga cada 15 s mientras la pestaña está visible. */
function usePolling(reload) {
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);
}

function Chips({ items, value, onChange, label }) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={label}>
      <div className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
        {items.map((it) => {
          const on = value === it.value;
          return (
            <button key={it.value} type="button" aria-pressed={on} onClick={() => onChange(it.value)}
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

function ConvBadges({ c }) {
  return (
    <>
      {c.urgent && <Badge tone="red" dot>Urgente</Badge>}
      {!c.urgent && c.pending && <Badge tone="amber" dot>{REASONS[c.reason] ?? 'Por atender'}</Badge>}
      {c.team_control ? <Badge tone="violet"><Hand className="h-3 w-3" aria-hidden="true" />Con el equipo</Badge>
        : c.paused_until && <Badge tone="slate"><Clock3 className="h-3 w-3" aria-hidden="true" />Asistente en pausa</Badge>}
    </>
  );
}

const convTitle = (c) => c.account?.name || c.name || c.phone;

// ── Bandeja ─────────────────────────────────────────────────────────────────

function ConversationList({ selectedId, reloadRef }) {
  const { query } = useLocation();
  const [tray, setTray] = useState(query.get('bandeja') && WA_TRAYS[query.get('bandeja')] ? query.get('bandeja') : 'atender');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => { const id = setTimeout(() => setSearch(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  const { data, error, reload } = useResource(`/api/whatsapp/conversations?tray=${tray}${search ? `&q=${encodeURIComponent(search)}` : ''}`);
  usePolling(reload);
  useEffect(() => { if (reloadRef) reloadRef.current = reload; }, [reload, reloadRef]);
  const counts = data?.counts ?? {};
  const chips = Object.entries(WA_TRAYS).map(([value, label]) => ({
    value, label, count: counts[value], tone: value === 'atender' && counts.atender ? 'red' : null,
  }));

  return (
    <section className="card animate-rise min-w-0 overflow-hidden" aria-labelledby="wa-list-title">
      <SectionHead flush id="wa-list-title" icon={Inbox} tone={counts.atender ? 'red' : 'teal'} title="Conversaciones"
        hint={counts.atender ? `${counts.atender} por atender` : 'Al día'} action={<button type="button" className="btn btn-ghost btn-sm" onClick={reload} aria-label="Recargar"><RefreshCw className="h-4 w-4" /></button>} />
      <div className="space-y-3 border-b border-line px-4 py-3 sm:px-5">
        <Chips label="Bandeja" items={chips} value={tray} onChange={setTray} />
        <label className="relative block">
          <span className="sr-only">Buscar por nombre, número o texto</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
          <input className="input pl-9" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, número o texto" maxLength={80} />
        </label>
      </div>
      {!data ? <PageLoader error={error} onRetry={reload} /> : data.conversations.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState icon={MessageCircle} tone="teal" title={tray === 'atender' ? 'Nada por atender' : 'Sin conversaciones aquí'}>
            {tray === 'atender' ? 'Cuando un cliente pida hablar con alguien o el asistente no entienda, aparece aquí y te llega un aviso.' : 'Probá con otra bandeja o búsqueda.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {data.conversations.map((c) => (
            <li key={c.id}>
              <Link to={`/whatsapp/${c.id}`} aria-current={c.id === selectedId ? 'page' : undefined}
                className={cx('row tap flex w-full items-start gap-3 px-4 py-3 text-left sm:px-5', c.id === selectedId ? 'bg-brand-soft/50' : c.pending && 'bg-amber-soft/30')}>
                <IconTile icon={c.account ? Building2 : UserRound} tone={c.urgent ? 'red' : c.account ? 'teal' : 'slate'} size="sm" className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{convTitle(c)}</span>
                    <span className="shrink-0 text-[11px] tabular text-muted-2">{timeAgo(c.last_message_at)}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">{c.account ? c.account.client_name : c.phone}</span>
                  {c.last_body && <span className="mt-0.5 line-clamp-1 block text-xs text-ink-2">{c.last_origin === 'cliente' ? '' : `${WA_ORIGINS[c.last_origin] ?? ''}: `}{c.last_body}</span>}
                  <span className="mt-1.5 flex flex-wrap gap-1"><ConvBadges c={c} /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Conversación ────────────────────────────────────────────────────────────

const BUBBLE = {
  cliente: 'mr-auto bg-surface-2 text-ink rounded-bl-md',
  asistente: 'ml-auto bg-teal-soft text-ink rounded-br-md',
  equipo: 'ml-auto bg-brand-soft text-ink rounded-br-md',
  plantilla: 'ml-auto bg-violet-soft text-ink rounded-br-md',
};

function Message({ m }) {
  if (m.origin === 'aviso' || m.origin === 'sistema') {
    return (
      <li className={cx('mx-auto flex max-w-[92%] items-start gap-2 rounded-xl border px-3 py-2 text-xs', m.origin === 'aviso' ? 'border-amber/40 bg-amber-soft/60 text-amber-ink' : 'border-line bg-surface text-muted')}>
        {m.origin === 'aviso' ? <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        <span className="min-w-0 whitespace-pre-wrap break-words"><span className="font-semibold">{WA_ORIGINS[m.origin]}: </span>{m.body}</span>
      </li>
    );
  }
  const mine = m.origin !== 'cliente';
  return (
    <li className={cx('flex max-w-[85%] flex-col', mine ? 'ml-auto items-end' : 'mr-auto items-start')}>
      <span className={cx('whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed', BUBBLE[m.origin])}>{m.body}</span>
      <span className="mt-0.5 px-1 text-[11px] text-muted-2">
        {mine && `${m.origin === 'equipo' && m.user_name ? m.user_name : WA_ORIGINS[m.origin]} · `}{formatDateTime(m.created_at)}{m.status === 'read' ? ' · leído' : m.status === 'failed' ? ' · no entregado' : ''}
      </span>
    </li>
  );
}

function Conversation({ id, onChanged }) {
  const { data, error, reload } = useResource(`/api/whatsapp/conversations/${id}`);
  usePolling(reload);
  const [run, busy] = useAction();
  const [textValue, setText] = useState('');
  const bottom = useRef(null);
  const count = data?.messages.length ?? 0;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [count]);
  if (!data) return <section className="card min-w-0"><PageLoader error={error} onRetry={reload} /></section>;
  const { conversation: c, messages, client, account } = data;

  const act = async (path, body, success) => { if (await run(() => api(`/api/whatsapp/conversations/${c.id}/${path}`, { method: 'POST', body }), { success })) { reload(); onChanged?.(); } };
  async function send(e) {
    e.preventDefault();
    const value = textValue.trim();
    if (!value) return;
    if (await run(() => api(`/api/whatsapp/conversations/${c.id}/reply`, { method: 'POST', body: { text: value } }), { success: 'Enviado. El asistente queda en pausa 30 minutos.' })) {
      setText('');
      reload();
      onChanged?.();
    }
  }

  return (
    <section className="card animate-rise flex min-w-0 flex-col overflow-hidden" aria-labelledby="wa-conv-title">
      <header className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <Link to="/whatsapp" className="btn btn-ghost btn-sm -ml-2 lg:hidden" aria-label="Volver a la bandeja"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <h2 id="wa-conv-title" className="truncate font-display text-lg font-bold">{convTitle(c)}</h2>
            <p className="text-xs text-muted">
              <span className="num">{c.phone}</span>
              {client && <> · <Link to={`/clientes/${client.id}`} className="font-semibold text-brand-ink hover:underline">{client.name}</Link>{client.owner_name && ` · lleva la cuenta ${client.owner_name}`}</>}
              {!client && ' · número sin vincular al portal'}
            </p>
            {account && <p className="mt-0.5 text-xs text-muted">{account.wa_opt_in ? 'Recibe avisos del portal por WhatsApp' : 'Pausó los avisos por WhatsApp'}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5"><ConvBadges c={c} />
          {c.session_open ? <Badge tone="teal"><Clock3 className="h-3 w-3" aria-hidden="true" />Ventana abierta hasta {formatDateTime(c.session_closes_at)}</Badge>
            : <Badge tone="slate"><Clock3 className="h-3 w-3" aria-hidden="true" />Fuera de la ventana de 24 h</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex">
          {c.team_control
            ? <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => act('control', { mode: 'asistente' }, 'El asistente vuelve a contestar.')}><Undo2 className="h-3.5 w-3.5" />Devolver al asistente</button>
            : <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => act('control', { mode: 'equipo' }, 'Tenés el control: el asistente no contesta.')}><Hand className="h-3.5 w-3.5" />Tomar el control</button>}
          {c.pending || c.urgent
            ? <button type="button" className="btn btn-teal btn-sm" disabled={busy} onClick={() => act('attended', { attended: true }, 'Marcada como atendida.')}><CheckCheck className="h-3.5 w-3.5" />Marcar atendida</button>
            : <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('attended', { attended: false }, 'Vuelve a "Por atender".')}><AlertTriangle className="h-3.5 w-3.5" />Marcar por atender</button>}
        </div>
      </header>

      <ol className="flex max-h-[60dvh] min-h-64 flex-col gap-2.5 overflow-y-auto bg-surface-2/30 px-3 py-4 sm:px-5" aria-label="Mensajes">
        {messages.map((m) => <Message key={m.id} m={m} />)}
        <li ref={bottom} aria-hidden="true" />
      </ol>

      <form onSubmit={send} className="space-y-2 border-t border-line px-4 py-3 sm:px-5">
        {c.session_open ? (
          <>
            <label htmlFor="wa-reply" className="sr-only">Respuesta</label>
            <textarea id="wa-reply" className="input" rows={3} maxLength={4000} value={textValue} onChange={(e) => setText(e.target.value)}
              placeholder="Escribí tu respuesta. Sale por WhatsApp con el número de JC Analytics."
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e); }} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">Al responder, el asistente se calla 30 minutos. Ctrl + Enter envía.</p>
              <button type="submit" className="btn btn-primary" disabled={busy || !textValue.trim()}><Send className="h-4 w-4" />Enviar</button>
            </div>
          </>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            WhatsApp solo permite texto libre dentro de las 24 h desde el último mensaje del cliente.
            {client ? <> Para escribirle ahora, usá <Link to={`/clientes/${client.id}?portal=accesos`} className="font-semibold text-brand-ink hover:underline">Enviar aviso</Link> en su ficha (sale como plantilla aprobada).</> : ' Esperá a que vuelva a escribir o llamalo.'}
          </p>
        )}
      </form>
    </section>
  );
}

// ── Cola de avisos ──────────────────────────────────────────────────────────

function Outbox() {
  const [status, setStatus] = useState('');
  const { data, error, reload } = useResource(`/api/whatsapp/outbox${status ? `?status=${status}` : ''}`);
  usePolling(reload);
  const [run, busy] = useAction();
  const counts = data?.counts ?? {};
  const chips = [{ value: '', label: 'Todos' }, ...Object.entries(WA_OUTBOX_STATUS).map(([value, s]) => ({ value, label: s.label, tone: s.tone, count: counts[value] ?? 0 }))];
  const retry = async (item) => { if (await run(() => api(`/api/whatsapp/outbox/${item.id}/retry`, { method: 'POST' }), { success: 'Vuelve a la cola.' })) reload(); };

  return (
    <section className="card animate-rise min-w-0 overflow-hidden" aria-labelledby="wa-outbox-title">
      <SectionHead flush id="wa-outbox-title" icon={ListChecks} tone="violet" title="Avisos a clientes"
        hint="Lo que el portal avisó por WhatsApp: avances, entregables, documentos, solicitudes, reuniones y avisos del equipo." />
      <div className="border-b border-line px-4 py-3 sm:px-5"><Chips label="Estado" items={chips} value={status} onChange={setStatus} /></div>
      {!data ? <PageLoader error={error} onRetry={reload} /> : data.items.length === 0 ? (
        <div className="p-4 sm:p-5"><EmptyState icon={ListChecks} tone="violet" title="Sin avisos">Cuando un cliente active los avisos por WhatsApp desde su portal, cada novedad suya pasa por aquí.</EmptyState></div>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((o) => {
            const st = WA_OUTBOX_STATUS[o.status];
            return (
              <li key={o.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm">
                    <Badge tone={st.tone} dot>{st.label}</Badge>
                    {o.urgent && <Badge tone="red">Urgente</Badge>}
                    <span className="font-semibold text-ink">{o.account_name}</span>
                    <Link to={`/clientes/${o.client_id}`} className="text-muted hover:underline">{o.client_name}</Link>
                    <span className="num text-xs text-muted-2">{o.phone}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-2">{o.text_body}</p>
                  <p className="mt-1 text-[11px] text-muted-2">
                    {o.status === 'enviado' ? `Enviado ${formatDateTime(o.sent_at)}` : o.status === 'pendiente' ? `Sale ${formatDateTime(o.scheduled_for)}` : `Creado ${formatDateTime(o.created_at)}`}
                    {` · plantilla ${o.template}`}{o.created_by_name ? ` · por ${o.created_by_name}` : ''}{o.attempts > 1 ? ` · ${o.attempts} intentos` : ''}
                  </p>
                  {o.reason && <p className="mt-1 text-xs text-coral-ink">{o.reason}</p>}
                </div>
                {['fallido', 'omitido'].includes(o.status) && (
                  <button type="button" className="btn btn-outline btn-sm shrink-0" disabled={busy} onClick={() => retry(o)}><RefreshCw className="h-3.5 w-3.5" />Reintentar</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Conexión ────────────────────────────────────────────────────────────────

function Row({ ok, label, children }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" aria-label="Listo" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral-ink" aria-label="Falta" />}
      <span className="min-w-0 text-sm"><span className="font-semibold text-ink">{label}</span>{children && <span className="block text-xs text-muted">{children}</span>}</span>
    </li>
  );
}

function Connection() {
  const { user } = useSession();
  const [fresh, setFresh] = useState(0);
  const { data, error, reload } = useResource(`/api/whatsapp/status${fresh ? `?fresh=1&v=${fresh}` : ''}`);
  const [run, busy] = useAction();
  const toast = useToast();
  if (!data) return <PageLoader error={error} onRetry={reload} />;
  const webhook = typeof window !== 'undefined' && /^https?:/.test(window.location.origin) && !isDemo() ? `${window.location.origin}${data.webhook_path}` : `https://portal.jcanalytic.com${data.webhook_path}`;
  const copy = async (value) => { try { await navigator.clipboard.writeText(value); toast('Copiado.'); } catch { toast('No se pudo copiar.', 'error'); } };
  const dispatchNow = async () => { const r = await run(() => api('/api/whatsapp/dispatch', { method: 'POST' })); if (r) toast(`Enviados: ${r.result.sent} · omitidos: ${r.result.skipped} · fallidos: ${r.result.failed}`); };
  const phone = data.phone;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="card animate-rise overflow-hidden" aria-labelledby="wa-conn-title">
        <SectionHead flush id="wa-conn-title" icon={PlugZap} tone={data.configured ? 'teal' : 'amber'} title="Conexión con Meta"
          action={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setFresh(Date.now())} aria-label="Consultar de nuevo"><RefreshCw className="h-4 w-4" /></button>} />
        <ul className="divide-y divide-line px-4 sm:px-5">
          <Row ok={data.configured} label={data.configured ? 'Variables del servidor configuradas' : 'Faltan variables del servidor'}>
            {data.configured ? `Plantillas en idioma "${data.template_lang}".` : (data.missing.length ? data.missing.join(', ') : 'META_APP_SECRET, WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID')}
          </Row>
          <Row ok={!!phone?.ok && phone.can_send !== 'BLOCKED'} label={phone?.ok ? `Número ${phone.display_phone_number ?? ''}${phone.verified_name ? ` · ${phone.verified_name}` : ''}` : 'Estado del número'}>
            {phone?.ok
              ? `Puede enviar: ${CAN_SEND[phone.can_send] ?? phone.can_send ?? 'sin dato'} · calidad ${QUALITY[phone.quality_rating] ?? phone.quality_rating ?? 'sin dato'}${phone.account_mode === 'SANDBOX' ? ' · modo de prueba' : ''}${phone.problems?.length ? ` · ${phone.problems.join(' · ')}` : ''}`
              : phone?.error ?? 'Se consulta cuando el servidor tiene las variables.'}
          </Row>
          <Row ok={!!data.display_number} label={data.display_number ? `Número para activar avisos: ${data.display_number}` : 'Falta WHATSAPP_DISPLAY_NUMBER'}>Lo usan los clientes para enviar su código de activación.</Row>
          <Row ok={data.outbound} label={data.outbound ? 'Avisos a clientes encendidos' : 'Avisos a clientes apagados'}>{data.outbound ? `Horario 07:00–20:00. Recordatorio de reuniones ${data.meeting_reminder_hours} h antes.` : 'Se encienden con WHATSAPP_AVISOS=activos, después de aprobar las plantillas.'}</Row>
        </ul>
        <div className="space-y-2 border-t border-line px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold text-muted">URL del webhook (campo "messages" en Meta)</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs">{webhook}</code>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(webhook)}><Copy className="h-3.5 w-3.5" />Copiar</button>
          </div>
          <p className="text-xs text-muted">El token de verificación se deriva de META_APP_SECRET; ver docs/whatsapp.md.</p>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
          <span><strong className="num">{data.counts.linked_accounts}</strong> cuentas con avisos</span>
          <span><strong className="num">{data.counts.queued}</strong> en cola</span>
          <span className={data.counts.failed ? 'text-coral-ink' : ''}><strong className="num">{data.counts.failed}</strong> fallidos</span>
          {user.role === 'admin' && data.configured && <button type="button" className="btn btn-soft btn-sm ml-auto" disabled={busy} onClick={dispatchNow}><Send className="h-3.5 w-3.5" />Enviar la cola ahora</button>}
        </div>
      </section>

      <section className="card animate-rise overflow-hidden" aria-labelledby="wa-tpl-title">
        <SectionHead flush id="wa-tpl-title" icon={FileText} tone="violet" title="Plantillas aprobadas" hint="Crealas en WhatsApp Manager con este nombre, categoría Utilidad y este texto." />
        <ul className="divide-y divide-line">
          {data.templates.map((t) => (
            <li key={t.name} className="px-4 py-3 sm:px-5">
              <p className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{t.label}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(t.body)} aria-label={`Copiar texto de ${t.name}`}><Copy className="h-3.5 w-3.5" /></button>
              </p>
              <code className="text-xs text-brand-ink">{t.name}</code>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.body}</p>
              <p className="mt-1 text-xs text-muted">{t.vars.map((v, i) => `{{${i + 1}}} ${v}`).join(' · ')}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

const TABS = [
  { value: 'conversaciones', label: 'Conversaciones', icon: MessageCircle },
  { value: 'avisos', label: 'Avisos', icon: ListChecks },
  { value: 'conexion', label: 'Conexión', icon: PlugZap },
];

export default function WhatsAppPage({ params }) {
  const { query } = useLocation();
  const selected = params?.id ? Number(params.id) : null;
  const requested = query.get('tab');
  const [tab, setTab] = useState(TABS.some((t) => t.value === requested) ? requested : 'conversaciones');
  const changeTab = (value) => { setTab(value); if (selected) navigate(`/whatsapp?tab=${value}`); };
  const showConv = tab === 'conversaciones' || selected;
  const listReload = useRef(null);

  return (
    <>
      <PageHeader eyebrow="Centro de operaciones" title="WhatsApp" icon={MessageCircle} tone="teal"
        subtitle="El asistente atiende a los clientes y te pasa lo que necesita una persona. Los avisos del portal también salen por aquí." />
      <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <Tabs value={showConv ? 'conversaciones' : tab} onChange={changeTab} tabs={TABS.map((t) => ({ value: t.value, label: t.label }))} className="whitespace-nowrap" />
      </div>
      {showConv ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className={cx(selected && 'max-lg:hidden')}><ConversationList selectedId={selected} reloadRef={listReload} /></div>
          {selected ? <Conversation key={selected} id={selected} onChanged={() => listReload.current?.()} /> : (
            <div className="max-lg:hidden"><EmptyState icon={Bot} tone="teal" title="Elegí una conversación">El asistente contesta solo. Aquí respondés, tomás el control o se la devolvés.</EmptyState></div>
          )}
        </div>
      ) : tab === 'avisos' ? <Outbox /> : <Connection />}
      <p className="mt-6 flex items-center gap-2 text-xs text-muted"><Users className="h-3.5 w-3.5" aria-hidden="true" />Las conversaciones las ve todo el equipo de operación. Los inversionistas no tienen acceso.</p>
    </>
  );
}
