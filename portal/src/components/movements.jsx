// Movimientos de dinero entre socios e inversiones: tarjeta con hilo de mensajes,
// confirmación con "mensaje de vuelta", objeción y anulación.
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, X, Ban, MessageSquare, Send, Hash, CornerDownRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from '../lib/router.jsx';
import { Avatar, Badge, useAction, cx } from './ui.jsx';
import { StatusBadge } from './common.jsx';
import { MOVEMENT_STATUS_META } from '../../shared/catalog.js';
import { formatMoney, formatDate, timeAgo } from '../lib/format.js';

const KIND_STYLE = {
  registro: { label: 'Registro', className: 'bg-paper' },
  confirmacion: { label: 'Mensaje de vuelta', className: 'bg-teal-soft' },
  objecion: { label: 'Objeción', className: 'bg-coral-soft' },
  anulacion: { label: 'Anulación', className: 'bg-slate-100' },
  mensaje: { label: 'Mensaje', className: 'bg-brand-soft/60' },
};

export function MovementCard({ m, showInvestment = false, highlight = false, defaultOpen = false, onChanged }) {
  const [open, setOpen] = useState(defaultOpen || highlight || m.can_resolve);
  const [reply, setReply] = useState('');
  const [mode, setMode] = useState(null); // 'object' | 'annul'
  const [run, busy] = useAction();
  const isIn = m.type === 'aporte';

  const act = async (path, body, success) => {
    const ok = await run(() => api(path, { method: 'POST', body }), { success });
    if (ok) { setReply(''); setMode(null); onChanged?.(); }
  };

  return (
    <article id={`mov-${m.id}`} className={cx('card overflow-hidden transition', highlight && 'ring-2 ring-brand/50', m.status === 'anulado' && 'opacity-70')}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50/70" aria-expanded={open}>
        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', isIn ? 'bg-brand-soft text-brand' : 'bg-teal-soft text-teal-dark')} aria-hidden>
          {isIn ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cx('font-display text-base font-bold tabular', m.status === 'anulado' && 'line-through')}>{formatMoney(m.amount, m.currency)}</span>
            <span className="text-sm text-muted">{isIn ? 'aporte de' : 'retorno a'} <span className="font-semibold text-ink">{m.partner_name}</span></span>
          </span>
          <span className="block truncate text-xs text-muted">
            {showInvestment && <><span className="font-semibold text-ink">{m.investment_name}</span> · </>}
            {formatDate(m.date)}{m.currency === 'USD' && m.amount_crc ? ` · ≈ ${formatMoney(m.amount_crc, 'CRC')}` : ''}{m.reference ? ` · ${m.reference}` : ''}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge map={MOVEMENT_STATUS_META} value={m.status} />
          {m.messages?.length > 1 && <span className="flex items-center gap-1 text-[11px] text-muted"><MessageSquare className="h-3 w-3" />{m.messages.length}</span>}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <ol className="space-y-2.5">
            {(m.messages ?? []).map((msg) => (
              <li key={msg.id} className="flex gap-2.5">
                <Avatar name={msg.user_name} color={msg.user_color} size={26} />
                <div className={cx('min-w-0 flex-1 rounded-2xl rounded-tl-sm px-3 py-2', KIND_STYLE[msg.kind]?.className)}>
                  <p className="text-[11px] text-muted"><span className="font-semibold text-ink">{msg.user_name}</span> · {KIND_STYLE[msg.kind]?.label} · {timeAgo(msg.created_at)}</p>
                  <p className="whitespace-pre-line text-sm">{msg.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {m.status === 'pendiente' && !m.can_resolve && (
            <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"><CornerDownRight className="h-3.5 w-3.5" />Esperando confirmación de {m.awaiting ?? (m.created_by === m.partner_id ? 'otro socio' : m.partner_name)}.</p>
          )}

          {m.can_resolve && mode !== 'object' && (
            <div className="rounded-2xl border border-teal/30 bg-teal-soft/50 p-3">
              <p className="text-sm font-semibold text-ink">{isIn ? '¿Recibiste este aporte?' : '¿Te llegó este retorno?'}</p>
              <p className="mb-2 text-xs text-muted">Confirmá con tu mensaje de vuelta. Queda registrado en la bitácora.</p>
              <textarea className="input" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Recibido ✓ (podés agregar un detalle)" aria-label="Mensaje de vuelta" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn btn-teal" disabled={busy} onClick={() => act(`/api/movements/${m.id}/confirm`, { message: reply || undefined }, 'Confirmado. Se envió tu mensaje de vuelta.')}><Check className="h-4 w-4" />Confirmar recibido</button>
                <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setMode('object')}><X className="h-4 w-4" />Objetar</button>
              </div>
            </div>
          )}

          {mode === 'object' && (
            <div className="rounded-2xl border border-coral/30 bg-coral-soft/50 p-3">
              <p className="mb-2 text-sm font-semibold">¿Qué no coincide?</p>
              <textarea className="input" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ej.: me llegaron ₡19.500, no ₡20.000." aria-label="Motivo de la objeción" />
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn btn-danger" disabled={busy || reply.trim().length < 3} onClick={() => act(`/api/movements/${m.id}/object`, { message: reply }, 'Objeción enviada')}>Enviar objeción</button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>Cancelar</button>
              </div>
            </div>
          )}

          {mode === 'annul' ? (
            <div className="rounded-2xl border border-line bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold">Motivo de la anulación</p>
              <textarea className="input" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Ej.: monto mal digitado, se registra de nuevo." aria-label="Motivo de la anulación" />
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn btn-dark" disabled={busy || reply.trim().length < 3} onClick={() => act(`/api/movements/${m.id}/annul`, { message: reply }, 'Movimiento anulado')}>Anular movimiento</button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>Cancelar</button>
              </div>
            </div>
          ) : mode !== 'object' && (
            <ThreadReply movementId={m.id} onSent={onChanged} extra={m.can_annul && <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={() => setMode('annul')}><Ban className="h-3.5 w-3.5" />Anular</button>} />
          )}
          {showInvestment && <Link to={`/inversiones/${m.investment_id}?mov=${m.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><Hash className="h-3 w-3" />Ver en la inversión</Link>}
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
      <button type="submit" className="btn btn-dark" disabled={busy || !body.trim()} aria-label="Enviar mensaje"><Send className="h-4 w-4" /></button>
      {extra}
    </form>
  );
}

export function MovementTypeBadge({ type }) {
  return type === 'aporte' ? <Badge tone="blue">Aporte</Badge> : <Badge tone="teal">Retorno</Badge>;
}
