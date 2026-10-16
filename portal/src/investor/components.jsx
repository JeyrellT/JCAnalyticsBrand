// Piezas del portal de inversionistas (v6): movimientos con su hilo y sus acciones,
// tarjetas de inversión, contacto y notas de confianza. Lenguaje del inversionista
// ("tu aporte", "tu participación"); nunca nombres ni montos de otros participantes.
// Todo color pasa por tokens (claro y oscuro) y todo monto por shared/finance.js.
import { useId, useState } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, Check, X, Ban, Send, ChevronDown, ChevronRight, Hourglass, ShieldCheck, MessageCircle, Mail,
  ArrowLeft, CornerDownRight, UserRound, Target, CircleCheck, CircleAlert, CircleSlash, Info, ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { useSession } from '../lib/session.jsx';
import { Avatar, Badge, IconTile, ProgressBar, useAction, useConfirm, cx } from '../components/ui.jsx';
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

/** Cómo leer el neto (retornos − aportes) desde la mirada del inversionista. */
export function netReading(net, contributed) {
  if (!contributed) return { hint: 'Sin capital confirmado todavía', short: 'Sin capital aún', good: false };
  if (net > 0) return { hint: 'Recibiste más dinero del que aportaste', short: 'Balance de cobros positivo', good: true };
  if (net === 0) return { hint: 'Recibiste el mismo importe que aportaste', short: 'Cobros iguales a aportes', good: true };
  return { hint: 'Recibiste menos dinero del que aportaste', short: 'Cobros menores a aportes', good: false };
}

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

/** Enlace "ver todo" para el encabezado de una sección. */
export function SeeAll({ to, children }) {
  return (
    <Link to={to} className="link tap -my-2 flex items-center gap-0.5 text-sm lg:min-h-9">
      {children}<ChevronRight className="h-4 w-4" aria-hidden="true" />
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

// ── Movimiento: fila desplegable con su hilo y acciones ─────────────────────
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
    <ol className="space-y-2.5" aria-label="Mensajes del movimiento">
      {messages.map((msg) => {
        const mine = !!msg.mine;
        const kind = KIND[msg.kind] ?? KIND.mensaje;
        return (
          <li key={msg.id} className={cx('flex gap-2.5', mine && 'flex-row-reverse')}>
            {mine ? <span className="w-7 shrink-0" aria-hidden="true" /> : <Avatar name={msg.user_name} color={msg.user_color} size={28} className="mt-0.5" />}
            <div className={cx('min-w-0 max-w-[min(100%,34rem)] rounded-2xl px-3.5 py-2.5', mine ? 'rounded-tr-md' : 'rounded-tl-md',
              mine && msg.kind === 'mensaje' ? 'bg-brand-soft' : kind.className)}>
              <p className="text-[11px] text-muted">
                <span className="font-semibold text-ink">{mine ? 'Vos' : msg.user_name}</span>
                {!mine && <span> · JC Analytics</span>}
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

/**
 * Movimiento a nombre del inversionista. Se usa dentro de una lista (<ul class="card divide-y">):
 * cabecera con monto, tipo, fecha y estado; al abrir, el detalle, el hilo y lo que le toca hacer.
 */
export function MovementItem({ m, showInvestment = false, highlight = false, defaultOpen = false, onChanged, investmentLink = false }) {
  const [open, setOpen] = useState(defaultOpen || highlight);
  const [mode, setMode] = useState(null); // null | 'object' | 'annul'
  const [reply, setReply] = useState('');
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const { user } = useSession();
  const panelId = useId();
  const replyId = useId();
  const isAporte = m.type === 'aporte';
  const Icon = movementIcon(m.type);
  const amount = formatMoney(m.amount, m.currency);
  const typeLabel = movementLabel(m);
  const voided = m.status === 'anulado' || m.status === 'objetado';
  const waitingJc = m.status === 'pendiente' && !m.can_resolve;
  const note = STATUS_NOTE[m.status];
  const extraMessages = Math.max(0, (m.messages?.length ?? 0) - 1);

  const post = async (path, body, success) => {
    const ok = await run(() => api(path, { method: 'POST', body }), { success });
    if (ok) { setReply(''); setMode(null); onChanged?.(); }
  };

  async function confirmMovement() {
    const yes = await confirm({
      title: isAporte ? '¿Confirmás este aporte?' : '¿Confirmás que recibiste este retorno?',
      message: `${typeLabel} de ${amount} en ${m.investment_name}, del ${formatDate(m.date)}. Al confirmarlo pasa a contar en tus totales y queda registrado con tu mensaje.`,
      confirmLabel: 'Sí, confirmar',
    });
    if (yes) await post(`/api/investor/movements/${m.id}/confirm`, { message: reply.trim() || undefined }, 'Listo: confirmaste el movimiento. Ya cuenta en tus totales.');
  }

  async function objectMovement() {
    await post(`/api/investor/movements/${m.id}/object`, { message: reply.trim() }, 'Objeción enviada. JC Analytics la revisa y te escribe.');
  }

  async function annulNotice() {
    const yes = await confirm({
      title: '¿Retirar este aviso?',
      message: `El aviso de ${amount} deja de estar pendiente y queda como anulado en tu estado de cuenta. Si hace falta, podés avisar de nuevo con los datos correctos.`,
      confirmLabel: 'Retirar aviso',
      tone: 'danger',
    });
    if (yes) await post(`/api/investor/movements/${m.id}/annul`, { message: reply.trim() }, 'Retiraste el aviso. Quedó anulado.');
  }

  const detail = [
    showInvestment && m.investment_name,
    formatDate(m.date),
    m.reference,
  ].filter(Boolean);

  return (
    <article id={`mov-${m.id}`} className={cx('scroll-mt-32 transition-colors', highlight && 'bg-brand-soft/40 shadow-[inset_3px_0_0_var(--brand)]', m.can_resolve && !highlight && 'shadow-[inset_3px_0_0_var(--amber)]')}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/70 sm:items-center sm:gap-4 sm:px-5">
        <IconTile icon={Icon} tone={voided ? 'slate' : movementTone(m.type)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={cx('num text-[17px] font-bold leading-tight text-ink', voided && 'text-muted line-through decoration-1')}>{amount}</span>
            <span className="text-sm font-medium text-muted">{typeLabel}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted sm:truncate">
            {detail.map((d, i) => <span key={i} className={i === 0 && showInvestment ? 'font-semibold text-ink-2' : undefined}>{i > 0 && ' · '}{d}</span>)}
            {m.currency === 'USD' && m.amount_crc != null && <span> · ≈ {formatMoney(m.amount_crc, 'CRC')}</span>}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
            <MovementStatusBadge status={m.status} />
            {m.can_resolve && <Badge tone="amber">Te toca responder</Badge>}
          </span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <MovementStatusBadge status={m.status} />
          {m.can_resolve ? <span className="text-[11px] font-semibold text-amber-ink">Te toca responder</span>
            : extraMessages > 0 && <span className="text-[11px] text-muted">{plural(extraMessages + 1, 'mensaje', 'mensajes')}</span>}
        </span>
        <ChevronDown className={cx('mt-2.5 h-4 w-4 shrink-0 text-muted-2 transition sm:mt-0', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="animate-fade space-y-3.5 px-4 pb-4 sm:px-5 sm:pl-[76px] lg:*:max-w-3xl">
          <dl className="grid gap-x-6 gap-y-1.5 rounded-xl border border-line px-3.5 py-2.5 text-xs sm:grid-cols-2">
            <div className="flex min-w-0 justify-between gap-3 sm:block">
              <dt className="text-muted">Registrado por</dt>
              <dd className="truncate font-medium text-ink">{m.created_by === user?.id ? 'Vos' : `${m.created_by_name} · JC Analytics`}</dd>
            </div>
            <div className="flex min-w-0 justify-between gap-3 sm:block">
              <dt className="text-muted">Fecha del movimiento</dt>
              <dd className="font-medium text-ink">{formatDate(m.date)}</dd>
            </div>
            {m.reference && (
              <div className="flex min-w-0 justify-between gap-3 sm:block">
                <dt className="text-muted">Referencia</dt>
                <dd className="truncate font-medium text-ink">{m.reference}</dd>
              </div>
            )}
            {m.currency === 'USD' && m.fx_rate && (
              <div className="flex min-w-0 justify-between gap-3 sm:block">
                <dt className="text-muted">Tipo de cambio</dt>
                <dd className="num font-medium text-ink">₡{String(m.fx_rate).replace('.', ',')} por $</dd>
              </div>
            )}
            {m.resolved_by_name && m.status !== 'pendiente' && (
              <div className="flex min-w-0 justify-between gap-3 sm:block">
                <dt className="text-muted">{m.status === 'confirmado' ? 'Confirmado por' : m.status === 'objetado' ? 'Objetado por' : 'Anulado por'}</dt>
                <dd className="truncate font-medium text-ink">{m.resolved_by === user?.id ? 'Vos' : m.resolved_by_name}</dd>
              </div>
            )}
          </dl>

          {m.return_kind === 'mixed' && <p className="rounded-xl bg-surface-2 p-3 text-sm">Devolución de capital: <strong>{formatMoney(m.return_capital_amount, m.currency)}</strong> · Ganancia: <strong>{formatMoney(m.return_profit_amount, m.currency)}</strong></p>}
          <Thread messages={m.messages} />

          {note && <p className={cx('flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium', note.className)}><note.icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />{note.text}</p>}

          {waitingJc && mode !== 'annul' && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-3 py-2 text-xs font-medium text-amber-ink">
              <CornerDownRight className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Esperando que JC Analytics confirme que recibió la plata. Mientras tanto no suma en tus totales.
            </p>
          )}

          {m.can_resolve && mode === null && (
            <div className="rounded-2xl border border-teal/30 bg-teal-soft p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-teal)] text-[var(--accent-teal-fg)]" aria-hidden="true"><Check className="h-4 w-4" strokeWidth={2.5} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-bold text-ink">{isAporte ? '¿Coincide con lo que enviaste?' : '¿Te llegó este retorno?'}</p>
                  <p className="text-xs text-ink-2">Si todo está bien, confirmalo: desde ese momento cuenta en tus totales. Si algo no coincide, objetalo y contanos qué pasó.</p>
                </div>
              </div>
              <label htmlFor={replyId} className="sr-only">Mensaje de vuelta (opcional)</label>
              <textarea id={replyId} className="input mt-3" rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Recibido ✓ (podés agregar un detalle)" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-teal tap flex-1 sm:flex-none" disabled={busy} onClick={confirmMovement}><Check className="h-4 w-4" />Confirmar</button>
                <button type="button" className="btn btn-outline tap flex-1 sm:flex-none" disabled={busy} onClick={() => setMode('object')}><X className="h-4 w-4" />Objetar</button>
              </div>
            </div>
          )}

          {mode === 'object' && (
            <div className="rounded-2xl border border-coral/30 bg-coral-soft p-3.5 sm:p-4">
              <p className="font-display text-[15px] font-bold text-ink">¿Qué no coincide?</p>
              <p className="text-xs text-ink-2">Contanos el motivo: JC Analytics lo revisa y te escribe. El movimiento no cuenta en tus totales mientras tanto.</p>
              <label htmlFor={replyId} className="sr-only">Motivo de la objeción (obligatorio)</label>
              <textarea id={replyId} className="input mt-3" rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ej.: envié ₡200.000, no ₡250.000." required />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-danger tap flex-1 sm:flex-none" disabled={busy || reply.trim().length < 3} onClick={objectMovement}>Enviar objeción</button>
                <button type="button" className="btn btn-ghost tap" onClick={() => { setMode(null); setReply(''); }}>Cancelar</button>
              </div>
            </div>
          )}

          {mode === 'annul' && (
            <div className="rounded-2xl border border-line bg-surface-2 p-3.5 sm:p-4">
              <p className="font-display text-[15px] font-bold text-ink">Retirar tu aviso</p>
              <p className="text-xs text-ink-2">Contanos por qué (p. ej., el monto quedó mal escrito). Queda como anulado en tu historial.</p>
              <label htmlFor={replyId} className="sr-only">Motivo para retirar el aviso (obligatorio)</label>
              <textarea id={replyId} className="input mt-3" rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ej.: escribí mal el monto, lo aviso de nuevo." required />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-dark tap flex-1 sm:flex-none" disabled={busy || reply.trim().length < 3} onClick={annulNotice}><Ban className="h-4 w-4" />Retirar aviso</button>
                <button type="button" className="btn btn-ghost tap" onClick={() => { setMode(null); setReply(''); }}>Cancelar</button>
              </div>
            </div>
          )}

          {mode === null && (
            <Reply movementId={m.id} onSent={onChanged}
              extra={m.can_annul && (
                <button type="button" className="btn btn-ghost tap text-muted hover:text-coral-ink lg:min-h-10" onClick={() => setMode('annul')}>
                  <Ban className="h-4 w-4" />Retirar aviso
                </button>
              )} />
          )}

          {investmentLink && (
            <Link to={`/inversionista/inversiones/${m.investment_id}?mov=${m.id}`} className="link inline-flex min-h-9 items-center gap-1 text-xs">
              Ver en {m.investment_name}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
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
        <span className="block truncate text-sm font-semibold text-ink">{movementLabel(m)} · {m.investment_name}</span>
        <span className="block truncate text-xs text-muted">{formatDate(m.date)}{m.reference ? ` · ${m.reference}` : ''}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cx('num text-sm font-bold text-ink', voided && 'text-muted line-through decoration-1')}>{formatMoney(m.amount, m.currency)}</span>
        <MovementStatusBadge status={m.status} />
      </span>
    </Link>
  );
}

// ── Inversiones ─────────────────────────────────────────────────────────────
function Figure({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] font-medium text-muted">{label}</dt>
      <dd className={cx('num mt-0.5 truncate text-[15px] font-bold sm:text-base', tone ?? 'text-ink')}>{value}</dd>
    </div>
  );
}

/** Tarjeta de una inversión desde la posición del inversionista (lo suyo completo; del total, solo agregados). */
export function PositionCard({ p }) {
  const cur = p.currency;
  const { mine, totals } = p;
  const progress = totals.target_progress;
  const expected = [expectedPct(p.expected_return_pct) && `Retorno esperado ${expectedPct(p.expected_return_pct)}`, p.expected_date && `recuperación prevista ${formatDate(p.expected_date)}`]
    .filter(Boolean).join(' · ');
  return (
    <Link to={`/inversionista/inversiones/${p.id}`} className="card card-hover group flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow truncate">{p.category_label}{cur === 'USD' ? ' · Dólares' : ''}</p>
          <h3 className="mt-1 font-display text-[18px] font-bold leading-snug text-ink transition-colors group-hover:text-brand-ink">{p.name}</h3>
          {p.project_name && <p className="mt-0.5 truncate text-xs text-muted">{p.project_name}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <InvestmentStatusBadge status={p.status} label={p.status_label} />
          {mine.pending_count > 0 && <Badge tone="amber"><Hourglass className="h-3 w-3" aria-hidden="true" />{mine.pending_count} por confirmar</Badge>}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 px-3.5 py-3">
        <Figure label="Aportaste" value={formatMoney(mine.contributed, cur, { compact: true })} />
        <Figure label="Recibiste" value={formatMoney(mine.returned, cur, { compact: true })} tone="text-teal-ink" />
        <Figure label="Neto" value={formatMoney(mine.net, cur, { compact: true })} tone={netReading(mine.net, mine.contributed).good ? 'text-teal-ink' : 'text-ink'} />
      </dl>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted">Tu participación</span>
          <span className="num text-sm font-bold text-ink">{formatPercent(mine.share)}</span>
        </div>
        <ProgressBar value={mine.share} tone="teal" label="Tu participación en la inversión" />
        <p className="mt-1.5 truncate text-[11.5px] text-muted">
          {plural(totals.holders, 'participante', 'participantes')} en total · capital confirmado {formatMoney(totals.contributed, cur, { compact: true })}
        </p>
      </div>

      {progress != null && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted"><Target className="h-3.5 w-3.5" aria-hidden="true" />Meta de capital</span>
            <span className={cx('num font-semibold', progress >= 1 ? 'text-teal-ink' : 'text-ink-2')}>{formatPercent(progress, 0)}{progress >= 1 ? ' · lograda' : ''}</span>
          </div>
          <ProgressBar value={progress} tone={progress >= 1 ? 'teal' : 'brand'} label="Avance de la meta de capital" />
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-muted">
        <span className="min-w-0">{expected || 'Sin fecha de recuperación definida'}</span>
        <span className="flex shrink-0 items-center gap-0.5 font-semibold text-brand-ink">Ver detalle<ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}

// ── Contacto y confianza ────────────────────────────────────────────────────
/** A quién escribirle en JC Analytics (los administradores): WhatsApp y correo. */
export function ContactCard({ contacts = [], className }) {
  return (
    <section id="contacto" className={cx('card scroll-mt-32 overflow-hidden', className)} aria-labelledby="contact-title">
      <div className="border-b border-line px-4 py-3.5 sm:px-5">
        <h2 id="contact-title" className="section-title">Tu contacto en JC Analytics</h2>
        <p className="text-xs text-muted">Para dudas sobre tus aportes, retornos o confirmaciones.</p>
      </div>
      {contacts.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <IconTile icon={UserRound} tone="teal" />
          <p className="text-sm text-muted">Escribinos a nuestro canal habitual; pronto vas a ver aquí a tu contacto directo.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {contacts.map((c) => {
            const wa = c.phone ? whatsappLink(c.phone, `Hola ${firstName(c.name)}, te escribo desde el portal de inversionistas de JC Analytics.`) : null;
            return (
              <li key={`${c.name}-${c.email}`} className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} color="#0065df" size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-[16px] font-bold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-muted">Administración · JC Analytics</p>
                  </div>
                </div>
                {(wa || c.email) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-teal tap"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp<span className="sr-only"> (se abre en otra pestaña)</span></a>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className={cx('btn btn-outline tap min-w-0', !wa && 'sm:col-span-2 lg:col-span-1 xl:col-span-2')}>
                        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{wa ? 'Correo' : c.email}</span>
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Nota de confianza: cómo funciona el doble control. */
export function TrustNote({ className, compact = false }) {
  return (
    <section className={cx('card-sunken p-4 sm:p-5', className)} aria-labelledby="trust-title">
      <div className="flex items-center gap-3">
        <IconTile icon={ShieldCheck} tone="teal" size="sm" />
        <h2 id="trust-title" className="section-title">Doble confirmación</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Cada movimiento requiere la confirmación de las dos partes; solo lo confirmado cuenta en tus totales.
      </p>
      {!compact && (
        <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
          <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />Si JC Analytics registra un movimiento a tu nombre, lo confirmás vos.</li>
          <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />Si vos avisás un aporte, lo confirma JC Analytics al verificar la plata.</li>
          <li className="flex items-start gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />Todo queda con fecha, mensaje y quién lo hizo.</li>
        </ul>
      )}
    </section>
  );
}
