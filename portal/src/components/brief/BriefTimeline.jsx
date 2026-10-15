// ============================================================================
//  components/brief/BriefTimeline.jsx
//  Bitácora del brief (creado, enviado, cambios de estado, comentarios y notas
//  internas) y caja para comentar. El cliente nunca recibe notas internas
//  (el servidor las filtra); acá, además, se ven distintas para el equipo.
// ============================================================================
import { useId, useState } from 'react';
import { ArrowRight, FilePlus2, Send, Lock, MessageSquare, RefreshCw } from 'lucide-react';
import { BRIEF_EVENT_KINDS } from '../../../shared/brief.js';
import { Avatar, IconTile, cx } from '../ui.jsx';
import { formatDateTime, timeAgo } from '../../lib/format.js';
import { BriefStatusBadge } from './BriefSteps.jsx';
import { briefStatusMeta } from './brief-ui.js';

const ACTOR_COLOR = { equipo: '#0065df', cliente: '#c98512', sistema: '#7a8aa6' };
const STATUS_TILE = { slate: 'slate', blue: 'blue', amber: 'amber', teal: 'teal', violet: 'violet', ink: 'ink', red: 'red' };

function actorName(e, audience) {
  const name = e.actor_name || (e.actor_type === 'cliente' ? 'Cliente' : 'JC Analytics');
  if (audience === 'client' && e.actor_type === 'equipo') return `${name} · JC Analytics`;
  if (audience === 'team' && e.actor_type === 'cliente') return `${name} · cliente`;
  return name;
}

function When({ iso }) {
  return <time dateTime={iso} title={formatDateTime(iso)}>{timeAgo(iso)}</time>;
}

function StatusEvent({ e, audience }) {
  const noun = audience === 'client' ? 'la solicitud' : 'el brief';
  let icon = RefreshCw;
  let tone = 'slate';
  let text;
  if (e.kind === 'creado') {
    icon = FilePlus2; tone = 'slate';
    text = <>creó {noun}</>;
  } else if (e.kind === 'enviado') {
    icon = Send; tone = 'blue';
    text = <>envió {e.version ? <>la <span className="font-semibold text-ink">versión {e.version}</span></> : noun}{e.from_status === 'observado' && ' con los ajustes'}</>;
  } else {
    tone = STATUS_TILE[briefStatusMeta(e.to_status, audience).tone] ?? 'slate';
    text = (
      <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
        cambió el estado
        {e.from_status && <><BriefStatusBadge status={e.from_status} audience={audience} /><ArrowRight className="h-3.5 w-3.5 text-muted-2" aria-label="a" /></>}
        <BriefStatusBadge status={e.to_status} audience={audience} />
      </span>
    );
  }
  return (
    <li className="relative flex gap-3">
      <IconTile icon={icon} tone={tone} size="sm" className="relative z-10 ring-4 ring-surface" />
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-ink">{actorName(e, audience)}</span> {text}
          <span className="text-xs text-muted"> · <When iso={e.created_at} /></span>
        </p>
        {e.body && <p className="mt-1.5 whitespace-pre-line rounded-xl border-l-[3px] border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink-2">{e.body}</p>}
      </div>
    </li>
  );
}

function CommentEvent({ e, audience }) {
  const internal = e.kind === 'nota_interna';
  return (
    <li className="relative flex gap-3">
      <Avatar name={e.actor_name || 'JC'} color={ACTOR_COLOR[e.actor_type] ?? ACTOR_COLOR.sistema} size={32} ring className="relative z-10" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          <span className="text-sm font-semibold text-ink">{actorName(e, audience)}</span>
          <span aria-hidden="true">·</span><When iso={e.created_at} />
          {e.version ? <><span aria-hidden="true">·</span><span>v{e.version}</span></> : null}
        </p>
        <div className={cx('mt-1 rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm', internal ? 'border border-amber/40 bg-amber-soft text-ink' : 'bg-surface-2 text-ink-2')}>
          {internal && <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-ink"><Lock className="h-3 w-3" aria-hidden="true" />{BRIEF_EVENT_KINDS.nota_interna} · solo equipo</p>}
          <p className="whitespace-pre-line break-words">{e.body}</p>
        </div>
      </div>
    </li>
  );
}

/**
 * @param {object} p
 * @param {object[]} p.events     eventos del brief en orden cronológico
 * @param {'team'|'client'} [p.audience]
 */
export function BriefTimeline({ events = [], audience = 'team', emptyText }) {
  if (!events.length) return <p className="text-sm text-muted">{emptyText ?? 'Todavía no hay movimientos.'}</p>;
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:-translate-x-1/2 before:bg-line">
      {events.map((e) => (e.kind === 'comentario' || e.kind === 'nota_interna'
        ? <CommentEvent key={e.id} e={e} audience={audience} />
        : <StatusEvent key={e.id} e={e} audience={audience} />))}
    </ol>
  );
}

/**
 * Caja para comentar. onSubmit(body, internal) debe devolver true si se guardó.
 * El equipo puede marcar "Nota interna (solo equipo)": el cliente no la ve.
 */
export function BriefCommentBox({ onSubmit, audience = 'team', busy = false, disabled = false, placeholder }) {
  const id = useId();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const ok = body.trim().length >= 2 && !busy && !disabled;
  async function send(e) {
    e?.preventDefault();
    if (!ok) return;
    if (await onSubmit(body.trim(), audience === 'team' && internal)) setBody('');
  }
  return (
    <form onSubmit={send} className={cx('rounded-2xl border p-3 transition', internal ? 'border-amber/50 bg-amber-soft/60' : 'border-line bg-surface-2/60')}>
      <label htmlFor={id} className="sr-only">{internal ? 'Nota interna' : 'Comentario'}</label>
      <textarea id={id} className="input min-h-[76px] resize-y" rows={2} maxLength={2000} value={body} disabled={disabled}
        placeholder={placeholder ?? (internal ? 'Nota para el equipo. El cliente no la ve.' : audience === 'client' ? 'Escribile al equipo de JC Analytics…' : 'Comentario para el cliente y el equipo…')}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e); }} />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        {audience === 'team' ? (
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg pr-2 text-sm font-medium text-ink-2">
            <input type="checkbox" role="switch" aria-checked={internal} className="peer sr-only" checked={internal} onChange={(e) => setInternal(e.target.checked)} disabled={disabled} />
            <span className={cx('relative h-5 w-9 shrink-0 rounded-full transition peer-focus-visible:shadow-[0_0_0_4px_var(--ring)]', internal ? 'bg-amber' : 'bg-line-strong')} aria-hidden="true">
              <span className={cx('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface shadow-card transition-transform', internal && 'translate-x-4')} />
            </span>
            <Lock className={cx('h-3.5 w-3.5', internal ? 'text-amber-ink' : 'text-muted-2')} aria-hidden="true" />
            Nota interna (solo equipo)
          </label>
        ) : <span className="text-xs text-muted">Le llega un aviso al equipo de JC Analytics.</span>}
        <button type="submit" className={cx('btn btn-sm min-h-10 px-3.5', internal ? 'btn-dark' : 'btn-primary')} disabled={!ok}>
          {internal ? <Lock className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
          {busy ? 'Guardando…' : internal ? 'Guardar nota' : 'Comentar'}
        </button>
      </div>
    </form>
  );
}
