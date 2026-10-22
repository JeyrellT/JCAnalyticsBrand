// Piezas del portal de inversionistas: cifras, estado del doble control, inversiones y
// movimientos con su hilo y sus acciones. Lenguaje del inversionista ("tu aporte", "tu
// participación"); nunca nombres ni montos de otros participantes.
// Todo color pasa por tokens (claro y oscuro) y todo monto por shared/finance.js.
import { useId, useState } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, Check, X, Ban, Send, ChevronDown, ChevronRight, Hourglass, ShieldCheck, MessageCircle, Mail,
  ArrowLeft, HandCoins, CircleCheck, CircleAlert, CircleSlash, ArrowRight, Download,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Avatar, Badge, IconTile, Modal, Field, useAction, cx } from '../components/ui.jsx';
import { INVESTMENT_STATUS, MOVEMENT_STATUS_META, MOVEMENT_TYPE_LABEL, RETURN_KIND_LABEL } from '../../shared/catalog.js';
import { formatMoney, formatPercent, formatDate, formatDateTime, timeAgo, whatsappLink, toMinor, todayKey, addDays, TZ } from '../lib/format.js';

// ── Utilidades ──────────────────────────────────────────────────────────────
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Nombre sin aclaraciones entre paréntesis ("Ángel Mora (inversionista)" → "Ángel Mora"). */
export const displayName = (name = '') => String(name).replace(/\s*\([^)]*\)\s*/g, ' ').trim() || String(name);
export const firstName = (name = '') => displayName(name).split(/\s+/)[0] ?? '';

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
}

const monthFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, month: 'long', year: 'numeric' });
const longDateFmt = new Intl.DateTimeFormat('es-CR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
/** "15 de octubre de 2026" para una fecha AAAA-MM-DD. */
export const longDate = (key) => longDateFmt.format(new Date(`${key.slice(0, 10)}T12:00:00-06:00`));
/** "Octubre de 2026" para una fecha AAAA-MM-DD. */
export function monthLabel(key) {
  const text = monthFmt.format(new Date(`${key.slice(0, 7)}-15T12:00:00-06:00`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Serie para el gráfico de capital: arranca en cero el día anterior al primer movimiento
 * confirmado y se extiende hasta hoy, así una sola confirmación se lee como un escalón y no
 * como una raya vertical.
 */
export function chartSeries(series) {
  if (!series?.length) return series ?? [];
  const first = series[0];
  const last = series.at(-1);
  const today = todayKey();
  return [
    { date: addDays(first.date, -1), contributed: 0, returned: 0, net: 0 },
    ...series,
    ...(last.date < today ? [{ ...last, date: today }] : []),
  ];
}

/** Tono del neto (retornos − aportes): turquesa solo si ya recuperaste lo aportado. */
export const netTone = (net, contributed) => (contributed > 0 && net >= 0 ? 'text-teal-ink' : 'text-ink');
/** Tono de lo recibido: turquesa solo cuando hay algo; un cero no se resalta. */
export const receivedTone = (amount) => (amount > 0 ? 'text-teal-ink' : 'text-ink');

export const movementLabel = (movement) => movement.type === 'retorno'
  ? (RETURN_KIND_LABEL[movement.return_kind] ?? RETURN_KIND_LABEL.unclassified)
  : (MOVEMENT_TYPE_LABEL[movement.type] ?? movement.type);

/** Porcentaje esperado guardado como número (35 → "35 %", 12.5 → "12,5 %"). */
export const expectedPct = (pct) => (pct == null ? null : formatPercent(pct / 100, Number.isInteger(pct) ? 0 : 1));

/**
 * Los avisos traen enlaces del equipo (/inversiones/:id?mov=:m). En este portal se
 * traducen a /inversionista/inversiones/:id y conservan ?mov= para resaltar el movimiento.
 */
export function investorLink(link) {
  if (typeof link !== 'string') return null;
  const m = /^\/inversiones\/(\d+)\/?(?:\?(?:.*&)?mov=(\d+))?/.exec(link);
  if (m) return `/inversionista/inversiones/${m[1]}${m[2] ? `?mov=${m[2]}` : ''}`;
  return /^\/inversionista(\/|\?|$)/.test(link) ? link : null;
}

/** Volver a la sección (va encima del título). */
export function BackLink({ to, children }) {
  return (
    <Link to={to} className="tap -ml-2 mb-1 inline-flex items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-ink lg:min-h-9">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />{children}
    </Link>
  );
}

export function InvestmentStatusBadge({ status, label }) {
  const meta = INVESTMENT_STATUS[status];
  return <Badge tone={meta?.tone ?? 'slate'} dot>{label ?? meta?.label ?? status}</Badge>;
}

export function MovementStatusBadge({ status }) {
  const meta = MOVEMENT_STATUS_META[status];
  if (!meta) return null;
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

/** Ícono del movimiento desde la mirada del inversionista: el aporte sale hacia la inversión, el retorno vuelve. */
export const movementIcon = (type) => (type === 'aporte' ? ArrowUpRight : ArrowDownLeft);
export const movementTone = (type) => (type === 'aporte' ? 'blue' : 'teal');

/** Descarga del estado de cuenta (Excel, separador ; y BOM UTF-8). */
export function StatementLink({ className }) {
  return (
    <a href="/api/investor/statement.csv" download className={cx('btn btn-outline tap lg:min-h-10', className)}>
      <Download className="h-4 w-4" aria-hidden="true" />Estado de cuenta (Excel)
    </a>
  );
}

// ── Cifras ──────────────────────────────────────────────────────────────────
/**
 * Cifra principal de un resumen; va dentro de <dl className="grid gap-px bg-line">.
 * Los montos nunca se recortan: si no caben, bajan de línea.
 */
export function Figure({ label, value, hint, tone = 'text-ink', valueProps, children }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={cx('num mt-1 text-[21px] font-bold leading-tight [overflow-wrap:anywhere] sm:text-2xl', tone)} {...valueProps}>{value}</dd>
      {hint && <dd className="mt-1 text-xs leading-snug text-muted">{hint}</dd>}
      {children && <dd className="mt-2">{children}</dd>}
    </div>
  );
}

/** Cifra secundaria: detalle bajo las principales o columnas de una fila. */
export function MiniFigure({ label, value, tone = 'text-ink', valueProps }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cx('num mt-0.5 text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]', tone)} {...valueProps}>{value}</dd>
    </div>
  );
}

/** Pie de una tarjeta de cifras: aclaraciones cortas (moneda, retornos por conciliar). */
export function FigureNote({ children, tone = 'muted' }) {
  return (
    <p className={cx('border-t border-line px-4 py-2.5 text-xs leading-relaxed sm:px-5', tone === 'amber' ? 'bg-amber-soft text-amber-ink' : 'bg-surface-2/60 text-muted')}>
      {children}
    </p>
  );
}

// ── Doble control ───────────────────────────────────────────────────────────
const CONTROL = {
  confirm: { tone: 'amber', icon: HandCoins },
  awaiting: { tone: 'blue', icon: Hourglass },
  clear: { tone: 'teal', icon: ShieldCheck },
  empty: { tone: 'slate', icon: ShieldCheck },
};

/**
 * Estado del doble control: lo que espera tu confirmación, lo que espera a JC Analytics o
 * si todo está confirmado por las dos partes. Es lo primero que se lee en cada pantalla.
 */
export function ControlStatus({ toConfirm = 0, awaiting = 0, empty = false, action, className }) {
  const headingId = useId();
  const key = toConfirm ? 'confirm' : awaiting ? 'awaiting' : empty ? 'empty' : 'clear';
  const { tone, icon } = CONTROL[key];
  const text = {
    confirm: `${plural(toConfirm, 'movimiento espera', 'movimientos esperan')} tu confirmación.`,
    awaiting: `${plural(awaiting, 'aviso tuyo espera', 'avisos tuyos esperan')} que JC Analytics confirme la plata.`,
    clear: 'Todo al día: ningún movimiento espera confirmación.',
    empty: 'Todavía no hay movimientos a tu nombre.',
  }[key];
  const also = toConfirm && awaiting ? ` Además, ${plural(awaiting, 'aviso tuyo espera', 'avisos tuyos esperan')} a JC Analytics.` : '';
  return (
    <section aria-labelledby={headingId} className={cx('card flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5', key === 'confirm' && 'border-amber/50', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="min-w-0">
          <h2 id={headingId} className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Doble control</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink">{text}</p>
          <p className="mt-0.5 text-xs text-muted">
            {key === 'empty' ? 'Cuando JC Analytics registre uno, te avisamos para que lo revisés y lo confirmés.' : `Solo lo confirmado por las dos partes suma en tus totales.${also}`}
          </p>
        </div>
      </div>
      {action}
    </section>
  );
}

// ── Entrada de monto ────────────────────────────────────────────────────────
/**
 * Monto en colones o dólares: acepta "250.000", "250000,50"… y muestra cómo se leyó.
 * Devuelve unidades menores (céntimos) o null.
 */
export function AmountInput({ id, currency = 'CRC', onChange, describedBy }) {
  const [raw, setRaw] = useState('');
  const parsed = toMinor(raw);
  const hintId = `${id}-lectura`;
  const bad = raw && (parsed == null || parsed <= 0);
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted" aria-hidden="true">{currency === 'USD' ? '$' : '₡'}</span>
        <input id={id} className="input num pl-7 text-base" inputMode="decimal" autoComplete="off" placeholder={currency === 'USD' ? '0,00' : '0'} value={raw}
          aria-invalid={bad ? true : undefined} aria-describedby={[raw ? hintId : null, describedBy].filter(Boolean).join(' ') || undefined}
          onChange={(e) => { setRaw(e.target.value); onChange(toMinor(e.target.value)); }} />
      </div>
      {raw && (
        <p id={hintId} className={cx('mt-1 text-xs', bad ? 'font-medium text-coral-ink' : 'text-muted')}>
          {bad ? 'Revisá el monto: escribilo como 250000 o 250.000,50.' : <>Vas a avisar <span className="num font-semibold text-ink">{formatMoney(parsed, currency)}</span></>}
        </p>
      )}
    </div>
  );
}

// ── Inversiones ─────────────────────────────────────────────────────────────
/** Una inversión en el resumen: estado, pendientes y tu parte (solo lo confirmado, en su moneda). */
export function PositionRow({ p }) {
  const cur = p.currency;
  const { mine } = p;
  return (
    <Link to={`/inversionista/inversiones/${p.id}`} data-investment-id={p.id}
      className="group grid gap-3 px-4 py-4 transition-colors hover:bg-surface-2 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_16px] lg:items-center lg:gap-6">
      <div className="min-w-0">
        <p className="font-semibold leading-snug text-ink group-hover:text-brand-ink">{p.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{p.category_label} · {cur}</span>
          <InvestmentStatusBadge status={p.status} label={p.status_label} />
          {mine.pending_count > 0 && <Badge tone="amber"><Hourglass className="h-3 w-3" aria-hidden="true" />{mine.pending_count} por confirmar</Badge>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
        <MiniFigure label="Aportado" value={formatMoney(mine.contributed, cur)} valueProps={{ 'data-position-contributed': '' }} />
        <MiniFigure label="Recibido" value={formatMoney(mine.returned, cur)} tone={receivedTone(mine.returned)} valueProps={{ 'data-position-returned': '' }} />
        <MiniFigure label="Neto" value={formatMoney(mine.net, cur)} tone={netTone(mine.net, mine.contributed)} valueProps={{ 'data-position-net': '' }} />
        <MiniFigure label="Participación" value={formatPercent(mine.share, 1)} valueProps={{ 'data-position-share': '' }} />
      </dl>
      <ChevronRight className="hidden h-4 w-4 text-muted-2 transition group-hover:translate-x-0.5 group-hover:text-ink lg:block" aria-hidden="true" />
    </Link>
  );
}

// ── Movimiento: fila con su estado, sus acciones y su hilo ──────────────────
const KIND = {
  registro: { label: 'Registro', className: 'bg-surface-2' },
  confirmacion: { label: 'Confirmación', className: 'bg-teal-soft' },
  objecion: { label: 'Objeción', className: 'bg-coral-soft' },
  anulacion: { label: 'Anulación', className: 'bg-surface-3' },
  mensaje: { label: 'Mensaje', className: 'bg-surface-2' },
};

function Thread({ messages }) {
  if (!messages?.length) return null;
  return (
    <ol className="space-y-2" aria-label="Mensajes del movimiento">
      {messages.map((msg) => {
        const mine = !!msg.mine;
        const kind = KIND[msg.kind] ?? KIND.mensaje;
        return (
          <li key={msg.id} className={cx('flex gap-2.5', mine && 'flex-row-reverse')}>
            {mine ? <span className="w-6 shrink-0" aria-hidden="true" /> : <Avatar name={msg.user_name} color={msg.user_color} size={24} className="mt-0.5" />}
            <div className={cx('min-w-0 max-w-[min(100%,34rem)] rounded-2xl px-3 py-2', mine ? 'rounded-tr-md' : 'rounded-tl-md',
              mine && msg.kind === 'mensaje' ? 'bg-brand-soft' : kind.className)}>
              <p className="text-[11px] text-muted">
                <span className="font-semibold text-ink">{mine ? 'Vos' : msg.user_name}</span>
                <span> · {kind.label} · </span>
                <time dateTime={msg.created_at} title={formatDateTime(msg.created_at)}>{timeAgo(msg.created_at)}</time>
              </p>
              <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink">{msg.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Reply({ movementId, onSent, extra }) {
  const [body, setBody] = useState('');
  const [run, busy] = useAction();
  const inputId = useId();
  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const ok = await run(() => api(`/api/investor/movements/${movementId}/messages`, { method: 'POST', body: { body: text } }), { success: 'Mensaje enviado a JC Analytics.' });
    if (ok) { setBody(''); onSent?.(); }
  }
  return (
    <form onSubmit={send} className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="sr-only">Mensaje para JC Analytics sobre este movimiento</label>
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-2">
        <input id={inputId} className="input tap min-w-0 flex-1 lg:min-h-10" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribir un mensaje sobre este movimiento…" />
        <button type="submit" className="btn btn-dark tap shrink-0 lg:min-h-10" disabled={busy || !body.trim()} aria-label="Enviar mensaje"><Send className="h-4 w-4" /></button>
      </div>
      {extra}
    </form>
  );
}

const STATUS_NOTE = {
  confirmado: { icon: CircleCheck, className: 'bg-teal-soft text-teal-ink', text: 'Confirmado por las dos partes. Cuenta en tus totales.' },
  objetado: { icon: CircleAlert, className: 'bg-coral-soft text-coral-ink', text: 'Objetado: JC Analytics revisa el caso con vos. No cuenta en tus totales.' },
  anulado: { icon: CircleSlash, className: 'bg-surface-3 text-ink-2', text: 'Anulado: queda en el historial, pero no cuenta en tus totales.' },
};

/** Quién registró el movimiento, dicho desde la mirada del inversionista. */
const registeredBy = (m, user) => (m.created_by === user?.id ? 'Vos' : `${m.created_by_name} · JC Analytics`);

function Detail({ label, children }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 sm:block">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * Confirmar, objetar o retirar un aviso: el diálogo repite los datos del movimiento para
 * que se decida con todo a la vista. Confirmar admite un mensaje de vuelta opcional;
 * objetar y retirar piden el motivo.
 */
function ResolveDialog({ mode, m, onClose, onDone }) {
  const { user } = useSession();
  const [message, setMessage] = useState('');
  const [run, busy] = useAction();
  const formId = useId();
  const isAporte = m.type === 'aporte';
  const config = {
    confirm: {
      title: isAporte ? '¿Confirmás este aporte?' : '¿Confirmás que recibiste este retorno?',
      intro: isAporte ? 'Confirmalo solo si coincide con lo que enviaste.' : 'Confirmalo solo si la plata ya te llegó.',
      label: 'Mensaje de vuelta (opcional)', placeholder: 'Recibido ✓', required: false,
      submit: 'Sí, confirmar', button: 'btn-teal', icon: Check, path: 'confirm',
      success: 'Listo: confirmaste el movimiento. Ya cuenta en tus totales.',
      note: 'Al confirmarlo pasa a contar en tus totales y queda registrado con tu mensaje.',
    },
    object: {
      title: 'Objetar movimiento', intro: 'Contanos qué no coincide: JC Analytics lo revisa y te escribe.',
      label: 'Motivo de la objeción', placeholder: 'Ej.: envié ₡200.000, no ₡250.000.', required: true,
      submit: 'Enviar objeción', button: 'btn-danger', icon: X, path: 'object',
      success: 'Objeción enviada. JC Analytics la revisa y te escribe.',
      note: 'Mientras se revisa, el movimiento no cuenta en tus totales.',
    },
    annul: {
      title: 'Retirar aviso', intro: 'El aviso deja de estar pendiente y queda como anulado en tu historial. Si hace falta, podés avisar de nuevo con los datos correctos.',
      label: 'Motivo para retirarlo', placeholder: 'Ej.: escribí mal el monto, lo aviso de nuevo.', required: true,
      submit: 'Retirar aviso', button: 'btn-danger', icon: Ban, path: 'annul',
      success: 'Retiraste el aviso. Quedó anulado.',
    },
  }[mode];
  const text = message.trim();
  const valid = !config.required || text.length >= 3;

  async function submit(e) {
    e.preventDefault();
    if (!valid) return;
    const ok = await run(() => api(`/api/investor/movements/${m.id}/${config.path}`, { method: 'POST', body: { message: text || undefined } }), { success: config.success });
    if (ok) { onClose(); onDone?.(); }
  }

  return (
    <Modal open onClose={onClose} title={config.title} size="sm"
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" form={formId} className={cx('btn', config.button)} disabled={busy || !valid}><config.icon className="h-4 w-4" aria-hidden="true" />{config.submit}</button>
      </>}>
      <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
        {/* Con el mensaje opcional, el foco va al resumen: en el celular no se abre el teclado sin pedirlo. */}
        <dl tabIndex={-1} data-autofocus={config.required ? undefined : true} className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl bg-surface-2 p-3.5 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted">{movementLabel(m)}</dt>
            <dd className="num text-xl font-bold text-ink">{formatMoney(m.amount, m.currency)}</dd>
            {m.currency === 'USD' && m.amount_crc != null && <dd className="text-xs text-muted">≈ {formatMoney(m.amount_crc, 'CRC')} con el tipo de cambio guardado</dd>}
          </div>
          <div className="col-span-2 min-w-0"><dt className="text-xs text-muted">Inversión</dt><dd className="font-medium text-ink">{m.investment_name}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted">Fecha</dt><dd className="font-medium text-ink">{formatDate(m.date)}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted">Registrado por</dt><dd className="truncate font-medium text-ink">{registeredBy(m, user)}</dd></div>
          {m.reference && <div className="col-span-2 min-w-0"><dt className="text-xs text-muted">Referencia</dt><dd className="truncate font-medium text-ink">{m.reference}</dd></div>}
        </dl>
        <p className="text-sm text-ink-2">{config.intro}</p>
        <Field label={config.label}>
          {(id) => <textarea id={id} data-autofocus={config.required ? true : undefined} className="input" rows={2} maxLength={1000} value={message}
            onChange={(e) => setMessage(e.target.value)} placeholder={config.placeholder} required={config.required} />}
        </Field>
        {config.note && <p className="text-xs text-muted">{config.note}</p>}
      </form>
    </Modal>
  );
}

/**
 * Movimiento a nombre del inversionista. Se usa dentro de una lista (<ul className="divide-y">):
 * cabecera con monto, tipo, fecha y estado; si te toca, Confirmar y Objetar a la vista; al
 * abrirlo, el detalle, el hilo de mensajes y la respuesta.
 */
export function MovementItem({ m, showInvestment = false, highlight = false, defaultOpen = false, onChanged, investmentLink = false }) {
  const [open, setOpen] = useState(defaultOpen || highlight);
  const [dialog, setDialog] = useState(null); // null | 'confirm' | 'object' | 'annul'
  const { user } = useSession();
  const panelId = useId();
  const Icon = movementIcon(m.type);
  const voided = m.status === 'anulado' || m.status === 'objetado';
  const pending = m.status === 'pendiente';
  const note = STATUS_NOTE[m.status];
  const origin = m.messages?.find((msg) => msg.kind === 'registro');
  const waitingFor = pending ? (m.can_resolve ? 'Te toca confirmar' : 'Espera a JC Analytics') : null;
  const meta = [showInvestment && m.investment_name, formatDate(m.date), m.reference].filter(Boolean);
  const status = (
    <>
      <MovementStatusBadge status={m.status} />
      {waitingFor && <span className={cx('text-[11px]', m.can_resolve ? 'font-semibold text-amber-ink' : 'text-muted')}>{waitingFor}</span>}
    </>
  );

  return (
    <article id={`mov-${m.id}`} className={cx('scroll-mt-32 transition-colors', highlight && 'bg-brand-soft/40 shadow-[inset_3px_0_0_var(--brand)]', m.can_resolve && !highlight && 'shadow-[inset_3px_0_0_var(--amber)]')}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/70 sm:items-center sm:px-5">
        <IconTile icon={Icon} tone={voided ? 'slate' : movementTone(m.type)} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={cx('num text-base font-bold leading-tight text-ink', voided && 'text-muted line-through decoration-1')}>{formatMoney(m.amount, m.currency)}</span>
            <span className="text-sm text-muted">{movementLabel(m)}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {meta.map((d, i) => <span key={i} className={i === 0 && showInvestment ? 'font-semibold text-ink-2' : undefined}>{i > 0 && ' · '}{d}</span>)}
            {m.currency === 'USD' && m.amount_crc != null && <span> · ≈ {formatMoney(m.amount_crc, 'CRC')}</span>}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">{status}</span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">{status}</span>
        <ChevronDown className={cx('mt-2 h-4 w-4 shrink-0 text-muted-2 transition sm:mt-0', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {m.can_resolve && (
        <div className="flex flex-wrap items-center gap-2 pb-3.5 pl-[60px] pr-4 sm:pl-16 sm:pr-5">
          {origin && (
            <p className="w-full text-xs text-ink-2">
              <span className="text-muted">{origin.user_name}: </span>«{origin.body}»
            </p>
          )}
          <button type="button" className="btn btn-teal btn-sm" onClick={() => setDialog('confirm')}><Check className="h-4 w-4" aria-hidden="true" />Confirmar</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDialog('object')}><X className="h-4 w-4" aria-hidden="true" />Objetar</button>
        </div>
      )}

      {open && (
        <div id={panelId} className="animate-fade space-y-3 pb-4 pl-4 pr-4 sm:pl-16 sm:pr-5 lg:*:max-w-3xl">
          <dl className="grid gap-x-6 gap-y-1 rounded-xl border border-line px-3.5 py-2.5 text-xs sm:grid-cols-2">
            <Detail label="Registrado por">{registeredBy(m, user)}</Detail>
            <Detail label="Fecha del movimiento">{formatDate(m.date)}</Detail>
            {m.reference && <Detail label="Referencia">{m.reference}</Detail>}
            {m.currency === 'USD' && m.fx_rate && <Detail label="Tipo de cambio"><span className="num">₡{String(m.fx_rate).replace('.', ',')} por $</span></Detail>}
            {m.resolved_by_name && !pending && (
              <Detail label={m.status === 'confirmado' ? 'Confirmado por' : m.status === 'objetado' ? 'Objetado por' : 'Anulado por'}>
                {m.resolved_by === user?.id ? 'Vos' : m.resolved_by_name}
              </Detail>
            )}
          </dl>
          {m.return_kind === 'mixed' && <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm">Devolución de capital: <strong>{formatMoney(m.return_capital_amount, m.currency)}</strong> · Ganancia: <strong>{formatMoney(m.return_profit_amount, m.currency)}</strong></p>}
          <Thread messages={m.messages} />
          {note && <p className={cx('flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium', note.className)}><note.icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{note.text}</p>}
          {pending && !m.can_resolve && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-3 py-2 text-xs font-medium text-amber-ink">
              <Hourglass className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Esperando que JC Analytics confirme que recibió la plata. Mientras tanto no suma en tus totales.
            </p>
          )}
          <Reply movementId={m.id} onSent={onChanged}
            extra={m.can_annul && (
              <button type="button" className="btn btn-ghost tap text-muted hover:text-coral-ink lg:min-h-10" onClick={() => setDialog('annul')}>
                <Ban className="h-4 w-4" aria-hidden="true" />Retirar aviso
              </button>
            )} />
          {investmentLink && (
            <Link to={`/inversionista/inversiones/${m.investment_id}?mov=${m.id}`} className="link inline-flex min-h-9 items-center gap-1 text-xs">
              Ver en {m.investment_name}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      {dialog && <ResolveDialog mode={dialog} m={m} onClose={() => setDialog(null)} onDone={onChanged} />}
    </article>
  );
}

/** Fila compacta de un movimiento (resúmenes): enlaza al detalle de la inversión con el movimiento resaltado. */
export function MovementRow({ m }) {
  const Icon = movementIcon(m.type);
  const voided = m.status === 'anulado' || m.status === 'objetado';
  return (
    <Link to={`/inversionista/inversiones/${m.investment_id}?mov=${m.id}`} className="group row min-h-16 px-4 py-3 sm:px-5">
      <IconTile icon={Icon} tone={voided ? 'slate' : movementTone(m.type)} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{movementLabel(m)}</span>
        <span className="block truncate text-xs text-muted">{formatDate(m.date)} · {m.investment_name}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cx('num text-sm font-bold text-ink', voided && 'text-muted line-through decoration-1')}>{formatMoney(m.amount, m.currency)}</span>
        <MovementStatusBadge status={m.status} />
      </span>
    </Link>
  );
}

// ── Contacto ────────────────────────────────────────────────────────────────
/** A quién escribirle en JC Analytics (los administradores): WhatsApp y correo, en una línea. */
export function ContactCard({ contacts = [], className }) {
  return (
    <section id="contacto" className={cx('card scroll-mt-32 px-4 py-3.5 sm:px-5', className)} aria-labelledby="contact-title">
      <h2 id="contact-title" className="text-sm font-semibold text-ink">¿Dudas sobre un aporte o un retorno?</h2>
      {contacts.length === 0 ? (
        <p className="mt-0.5 text-xs text-muted">Escribinos por el canal habitual de JC Analytics.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {contacts.map((c) => {
            const wa = c.phone ? whatsappLink(c.phone, `Hola ${firstName(c.name)}, te escribo desde el portal de inversionistas de JC Analytics.`) : null;
            return (
              <li key={`${c.name}-${c.email}`} className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 text-sm text-ink-2"><span className="font-semibold text-ink">{c.name}</span> · Administración</p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp<span className="sr-only"> (se abre en otra pestaña)</span></a>}
                  {c.email && <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm"><Mail className="h-4 w-4" aria-hidden="true" />Correo</a>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
