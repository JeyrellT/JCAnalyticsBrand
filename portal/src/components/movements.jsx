// Movimientos de dinero entre socios e inversiones: tarjeta con hilo de mensajes,
// confirmación con "mensaje de vuelta", objeción y anulación.
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, X, Ban, MessageSquare, Send, Hash, CornerDownRight, ChevronDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { Avatar, Badge, IconTile, useAction, cx } from './ui.jsx';
import { StatusBadge } from './common.jsx';
import { MOVEMENT_STATUS_META } from '../../shared/catalog.js';
import { formatMoney, formatDate, timeAgo } from '../lib/format.js';

// Cada tipo de mensaje del hilo tiene su burbuja: registro neutro, confirmación turquesa,
// objeción coral, anulación hundida y mensaje libre en azul suave.
const KIND_STYLE = {
  registro: { label: 'Registro', className: 'bg-surface-2' },
  confirmacion: { label: 'Mensaje de vuelta', className: 'bg-teal-soft' },
  objecion: { label: 'Objeción', className: 'bg-coral-soft' },
  anulacion: { label: 'Anulación', className: 'bg-surface-3' },
  mensaje: { label: 'Mensaje', className: 'bg-brand-soft/60' },
};

export function MovementCard({ m, showInvestment = false, highlight = false, defaultOpen = false, onChanged }) {
  const [open, setOpen] = useState(defaultOpen || highlight || m.can_resolve);
  const [reply, setReply] = useState('');
  const [mode, setMode] = useState(null); // 'object' | 'annul'
  const [run, busy] = useAction();
  const isIn = m.type === 'aporte';
  const annulled = m.status === 'anulado';

  const act = async (path, body, success) => {
    const ok = await run(() => api(path, { method: 'POST', body }), { success });
    if (ok) { setReply(''); setMode(null); onChanged?.(); }
  };

  return (
    <article id={`mov-${m.id}`} className={cx('card overflow-hidden transition', highlight && 'ring-2 ring-brand/50', annulled && 'opacity-70', m.can_resolve && 'border-teal/40')}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface-2/70 sm:items-center sm:gap-4" aria-expanded={open}>
        <IconTile icon={isIn ? ArrowDownLeft : ArrowUpRight} tone={isIn ? 'blue' : 'teal'} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={cx('num text-lg font-bold leading-tight text-ink', annulled && 'line-through')}>{formatMoney(m.amount, m.currency)}</span>
            <span className="text-sm text-muted">{isIn ? 'aporte de' : 'retorno a'} <span className="font-semibold text-ink">{m.partner_name}</span></span>
          </span>
          <span className="mt-0.5 block text-xs text-muted sm:truncate">
            {showInvestment && <><span className="font-semibold text-ink-2">{m.investment_name}</span> · </>}
            {formatDate(m.date)}{m.currency === 'USD' && m.amount_crc ? ` · ≈ ${formatMoney(m.amount_crc, 'CRC')}` : ''}{m.reference ? ` · ${m.reference}` : ''}
          </span>
          {/* En celular el estado va debajo, para que el texto use todo el ancho. */}
          <span className="mt-2 flex items-center gap-2 sm:hidden">
            <StatusBadge map={MOVEMENT_STATUS_META} value={m.status} />
            {m.messages?.length > 1 && <span className="flex items-center gap-1 text-[11px] tabular text-muted"><MessageSquare className="h-3 w-3" />{m.messages.length}</span>}
          </span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <StatusBadge map={MOVEMENT_STATUS_META} value={m.status} />
          {m.messages?.length > 1 && <span className="flex items-center gap-1 text-[11px] tabular text-muted"><MessageSquare className="h-3 w-3" />{m.messages.length}</span>}
        </span>
        <ChevronDown className={cx('hidden h-4 w-4 shrink-0 text-muted-2 transition sm:block', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="animate-fade space-y-3 border-t border-line px-4 pb-4 pt-3">
          <ol className="space-y-2.5">
            {(m.messages ?? []).map((msg) => (
              <li key={msg.id} className="flex gap-2.5">
                <Avatar name={msg.user_name} color={msg.user_color} size={28} className="mt-0.5" />
                <div className={cx('min-w-0 flex-1 rounded-2xl rounded-tl-md px-3.5 py-2.5', KIND_STYLE[msg.kind]?.className ?? 'bg-surface-2')}>
                  <p className="text-[11px] text-muted"><span className="font-semibold text-ink">{msg.user_name}</span> · {KIND_STYLE[msg.kind]?.label} · {timeAgo(msg.created_at)}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink">{msg.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {m.status === 'pendiente' && !m.can_resolve && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-soft px-3 py-2 text-xs font-medium text-amber-ink"><CornerDownRight className="h-3.5 w-3.5 shrink-0" />Esperando confirmación de {m.awaiting ?? (m.created_by === m.partner_id ? 'otro socio' : m.partner_name)}.</p>
          )}

          {m.can_resolve && mode !== 'object' && (
            <div className="rounded-2xl border border-teal/30 bg-teal-soft p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <IconTile icon={Check} tone="teal" size="sm" className="bg-teal text-white" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-bold text-ink">{isIn ? '¿Recibiste este aporte?' : '¿Te llegó este retorno?'}</p>
                  <p className="text-xs text-muted">Confirmá con tu mensaje de vuelta. Queda registrado en la bitácora.</p>
                </div>
              </div>
              <textarea className="input mt-3" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Recibido ✓ (podés agregar un detalle)" aria-label="Mensaje de vuelta" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-teal tap flex-1 sm:flex-none" disabled={busy} onClick={() => act(`/api/movements/${m.id}/confirm`, { message: reply || undefined }, 'Confirmado. Se envió tu mensaje de vuelta.')}><Check className="h-4 w-4" />Confirmar recibido</button>
                <button type="button" className="btn btn-outline tap" disabled={busy} onClick={() => setMode('object')}><X className="h-4 w-4" />Objetar</button>
              </div>
            </div>
          )}

          {mode === 'object' && (
            <div className="rounded-2xl border border-coral/30 bg-coral-soft p-3.5 sm:p-4">
              <p className="font-display text-[15px] font-bold text-ink">¿Qué no coincide?</p>
              <p className="text-xs text-muted">Quien lo registró recibe tu objeción y puede corregirlo.</p>
              <textarea className="input mt-3" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ej.: me llegaron ₡19.500, no ₡20.000." aria-label="Motivo de la objeción" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-danger tap" disabled={busy || reply.trim().length < 3} onClick={() => act(`/api/movements/${m.id}/object`, { message: reply }, 'Objeción enviada')}>Enviar objeción</button>
                <button type="button" className="btn btn-ghost tap" onClick={() => setMode(null)}>Cancelar</button>
              </div>
            </div>
          )}

          {mode === 'annul' ? (
            <div className="rounded-2xl border border-line bg-surface-2 p-3.5 sm:p-4">
              <p className="font-display text-[15px] font-bold text-ink">Motivo de la anulación</p>
              <p className="text-xs text-muted">El movimiento deja de contar y queda tachado en el libro.</p>
              <textarea className="input mt-3" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ej.: monto mal digitado, se registra de nuevo." aria-label="Motivo de la anulación" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn btn-dark tap" disabled={busy || reply.trim().length < 3} onClick={() => act(`/api/movements/${m.id}/annul`, { message: reply }, 'Movimiento anulado')}>Anular movimiento</button>
                <button type="button" className="btn btn-ghost tap" onClick={() => setMode(null)}>Cancelar</button>
              </div>
            </div>
          ) : mode !== 'object' && (
            <ThreadReply movementId={m.id} onSent={onChanged} extra={m.can_annul && <button type="button" className="btn btn-ghost tap text-muted hover:text-coral-ink" onClick={() => setMode('annul')}><Ban className="h-3.5 w-3.5" />Anular</button>} />
          )}
          {showInvestment && <Link to={`/inversiones/${m.investment_id}?mov=${m.id}`} className="link inline-flex min-h-8 items-center gap-1 text-xs"><Hash className="h-3 w-3" />Ver en la inversión</Link>}
        </div>
      )}
    </article>
  );
}

function ThreadReply({ movementId, onSent, extra }) {
  const [body, setBody] = useState('');
  const [run, busy] = useAction();
  async function send(e) {
    e.preventDefault();
    if (!body.trim()) return;
    if (await run(() => api(`/api/movements/${movementId}/messages`, { method: 'POST', body: { body } }))) { setBody(''); onSent?.(); }
  }
  return (
    <form onSubmit={send} className="flex items-center gap-2">
      <input className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribir en el hilo…" aria-label="Mensaje" />
      <button type="submit" className="btn btn-dark tap" disabled={busy || !body.trim()} aria-label="Enviar mensaje"><Send className="h-4 w-4" /></button>
      {extra}
    </form>
  );
}

export function MovementTypeBadge({ type }) {
  return type === 'aporte' ? <Badge tone="blue">Aporte</Badge> : <Badge tone="teal">Retorno</Badge>;
}
