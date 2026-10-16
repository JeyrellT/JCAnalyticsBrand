// v7 · Enlaces de registro: crear, compartir (copiar, WhatsApp, compartir del celular y QR) y seguir.
//  · InviteComposer: personal ("solo el nombre", un uso) o abierto (grupo con cupo máximo), con vigencia.
//  · InviteShare:    el enlace listo para enviar, con QR para mostrar en persona.
//  · InvitesPanel:   lista con estado, cupos usados, quién se registró y acciones (renovar, desactivar, borrar).
import { useId, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import {
  Link2, Copy, MessageCircle, Share2, QrCode, Download, UserRound, UsersRound, Crown, Handshake, Wrench, Landmark, Building2,
  Power, Trash2, CalendarPlus, Plus, Check, Sparkles, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { api, isDemo } from '../lib/api.js';
import { useResource } from '../lib/session.jsx';
import { timeAgo } from '../lib/format.js';
import { ROLES } from '../../shared/catalog.js';
import { INVITE_DURATIONS, INVITE_USE_PRESETS, INVITE_LIMITS, INVITE_STATUS, invitePath } from '../../shared/invites.js';
import { Modal, Field, Badge, EmptyState, IconTile, ProgressBar, Avatar, useAction, useToast, useConfirm, cx } from './ui.jsx';

const ROLE_ICON = { admin: Crown, socio: Handshake, colaborador: Wrench, inversionista: Landmark };
const ROLE_TONE = { admin: 'amber', socio: 'blue', colaborador: 'teal', inversionista: 'violet' };
const first = (name = '') => name.trim().split(/\s+/)[0] ?? '';
/** Mayúscula solo en la primera letra (la clase capitalize pondría una en cada palabra). */
export const cap = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** URL pública del enlace. En la demo (iframe sin origen) se muestra la del portal publicado. */
export function inviteUrl(token) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = isDemo() || !/^https?:\/\//.test(origin) ? 'https://portal.jcanalytic.com' : origin;
  return `${base}${invitePath(token)}`;
}

/** Para quién es el enlace, en palabras. */
export function inviteAudience(invite) {
  if (invite.kind === 'client') return `cliente · ${invite.client_name ?? 'cliente'}`;
  return (ROLES[invite.role]?.label ?? invite.role).toLowerCase();
}

function untilLabel(iso) {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return 'venció';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `vence en ${plural(days, 'día', 'días')}`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `vence en ${plural(hours, 'hora', 'horas')}`;
}

/** Mensaje listo para WhatsApp o correo. */
export function inviteMessage(invite, senderName) {
  const who = invite.kind === 'client'
    ? `para que tengas acceso al portal de ${invite.client_name} con JC Analytics`
    : invite.role === 'inversionista'
      ? 'para que entres al portal de inversionistas de JC Analytics'
      : `para que te sumes al portal de JC Analytics como ${(ROLES[invite.role]?.label ?? '').toLowerCase()}`;
  return [
    `Hola${invite.name ? ` ${first(invite.name)}` : ''}, te comparto este enlace ${who}:`,
    inviteUrl(invite.token),
    '',
    'Completás tus datos, elegís tu contraseña y entrás de una vez.',
    invite.message ? `\n${invite.message}` : null,
    senderName ? `\n${first(senderName)} · JC Analytics` : '\nJC Analytics',
  ].filter((line) => line !== null).join('\n');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      Object.assign(area.style, { position: 'fixed', top: '-1000px', opacity: '0' });
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// ── QR ──────────────────────────────────────────────────────────────────────
/** Matriz del QR (corrección media: se lee bien aun impreso o en pantallas con brillo). */
function qrMatrix(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return { n, dark: (r, c) => qr.isDark(r, c) };
}

/** QR como SVG nítido (un solo path), siempre negro sobre blanco para que cualquier cámara lo lea. */
export function QrCodeSvg({ text, size = 220, title = 'Código QR del enlace' }) {
  const { n, path } = useMemo(() => {
    const m = qrMatrix(text);
    let d = '';
    for (let r = 0; r < m.n; r += 1) for (let c = 0; c < m.n; c += 1) if (m.dark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { n: m.n, path: d };
  }, [text]);
  const box = n + 8;
  return (
    <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} role="img" aria-label={title} shapeRendering="crispEdges" className="rounded-2xl">
      <rect width={box} height={box} fill="#ffffff" />
      <path d={path} fill="#0b1220" />
    </svg>
  );
}

/** Descarga el QR como PNG (para imprimir o pegar en una presentación). */
function downloadQr(text, filename) {
  const m = qrMatrix(text);
  const scale = 12;
  const box = (m.n + 8) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = box;
  canvas.height = box;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, box, box);
  g.fillStyle = '#0b1220';
  for (let r = 0; r < m.n; r += 1) for (let c = 0; c < m.n; c += 1) if (m.dark(r, c)) g.fillRect((c + 4) * scale, (r + 4) * scale, scale, scale);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

// ── Compartir ───────────────────────────────────────────────────────────────
export function InviteShare({ invite, senderName, onClose, fresh = false }) {
  const toast = useToast();
  const [showQr, setShowQr] = useState(false);
  const url = inviteUrl(invite.token);
  const message = inviteMessage(invite, senderName);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const copy = async (text, done) => {
    if (await copyText(text)) toast(done);
    else toast('No se pudo copiar: seleccioná el texto y copialo a mano.', 'error');
  };
  const share = () => navigator.share({ title: 'Registro · JC Analytics', text: message }).catch(() => {});
  const Icon = invite.kind === 'client' ? Building2 : ROLE_ICON[invite.role] ?? UserRound;

  return (
    <Modal open onClose={onClose} title={fresh ? 'Enlace listo para compartir' : 'Compartir enlace'}
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>}>
      <div className="space-y-4">
        <div className="card-panel relative overflow-hidden p-4">
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{invite.name ?? invite.label ?? 'Enlace abierto'}</p>
              <p className="text-xs text-panel-muted">
                {cap(inviteAudience(invite))} · {invite.personal ? 'personal, un solo uso' : `${plural(invite.remaining, 'cupo libre', 'cupos libres')} de ${invite.max_uses}`} · {untilLabel(invite.expires_at)}
              </p>
            </div>
          </div>
          <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-white/[0.07] p-2 pl-3">
            <span className="min-w-0 flex-1 select-all truncate font-mono text-[12.5px] text-white">{url}</span>
            <button type="button" className="btn btn-sm shrink-0 bg-white text-panel hover:bg-white/90" onClick={() => copy(url, 'Enlace copiado')}><Copy className="h-3.5 w-3.5" />Copiar</button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <a className="btn btn-teal" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          {canShare
            ? <button type="button" className="btn btn-outline" onClick={share}><Share2 className="h-4 w-4" />Compartir</button>
            : <button type="button" className="btn btn-outline" onClick={() => copy(message, 'Mensaje copiado')}><Copy className="h-4 w-4" />Copiar mensaje</button>}
          <button type="button" className="btn btn-outline" aria-expanded={showQr} onClick={() => setShowQr((v) => !v)}><QrCode className="h-4 w-4" />{showQr ? 'Ocultar QR' : 'Código QR'}</button>
        </div>

        {showQr && (
          <div className="animate-pop flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-2 p-4">
            <QrCodeSvg text={url} />
            <p className="text-center text-xs text-muted">Mostralo en una reunión: la persona lo escanea con la cámara y se registra desde su celular.</p>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => downloadQr(url, `registro-jc-${invite.id}.png`)}><Download className="h-3.5 w-3.5" />Descargar PNG</button>
          </div>
        )}

        <details className="group rounded-2xl border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold">Mensaje que se envía<ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" /></summary>
          <p className="whitespace-pre-line border-t border-line px-3.5 py-3 text-sm leading-relaxed text-ink-2">{message}</p>
        </details>

        <p className="flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Cada persona elige su propia contraseña. Podés desactivar el enlace cuando quieras desde “Enlaces de registro”.</p>
      </div>
    </Modal>
  );
}

// ── Crear ───────────────────────────────────────────────────────────────────
/** Botones de opción compactos (radios nativos accesibles). */
function Choice({ legend, options, value, onChange, className }) {
  const uid = useId();
  return (
    <fieldset className={className}>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.value} className={cx(
            'flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50',
            value === o.value ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
          )}>
            <input type="radio" className="sr-only" name={uid} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.icon && <o.icon className="h-4 w-4" aria-hidden="true" />}{o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * preset: { kind?: 'team'|'client', role?, client_id?, client_name?, mode?: 'personal'|'open' }
 * Con kind fijo no se muestra el selector de tipo; con client_id fijo no se elige cliente.
 */
export function InviteComposer({ preset = {}, isAdmin = true, onClose, onCreated }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => ({
    mode: preset.mode ?? 'personal',
    kind: preset.kind ?? (isAdmin ? 'team' : 'client'),
    role: ROLES[preset.role] ? preset.role : 'socio',
    client_id: preset.client_id ? String(preset.client_id) : '',
    name: '',
    max_uses: 5,
    days: INVITE_LIMITS.defaultDays,
    label: '',
    message: '',
    can_approve: true,
  }));
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const needClients = form.kind === 'client' && !preset.client_id;
  const clients = useResource(needClients ? '/api/clients' : null);
  const adminRole = form.kind === 'team' && form.role === 'admin';
  const personal = form.mode === 'personal' || adminRole;
  const maxDays = adminRole ? INVITE_LIMITS.adminMaxDays : INVITE_LIMITS.maxDays;
  const days = Math.min(form.days, maxDays);
  const ready = (!personal || form.name.trim().length >= 2) && (form.kind === 'team' || form.client_id) && form.max_uses >= 1;

  async function save(e) {
    e.preventDefault();
    const body = {
      kind: form.kind,
      days,
      message: form.message.trim() || null,
      ...(form.kind === 'team' ? { role: form.role } : { client_id: Number(form.client_id), can_approve: form.can_approve }),
      ...(personal ? { name: form.name.trim() } : { max_uses: Number(form.max_uses), label: form.label.trim() || null }),
    };
    const res = await run(() => api('/api/invites', { method: 'POST', body }), { success: 'Enlace creado' });
    if (res) onCreated(res.invite);
  }

  const roleOptions = Object.entries(ROLES).map(([value, meta]) => ({ value, label: meta.label, icon: ROLE_ICON[value] }));
  return (
    <Modal open onClose={onClose} title="Nuevo enlace de registro" size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="invite-form" className="btn btn-primary" disabled={!ready || busy}><Link2 className="h-4 w-4" />{busy ? 'Creando…' : 'Crear enlace'}</button></>}>
      <form id="invite-form" onSubmit={save} className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de enlace">
          {[
            { value: 'personal', icon: UserRound, title: 'Para una persona', text: 'Solo escribís su nombre. Ella completa el resto. Un solo uso.' },
            { value: 'open', icon: UsersRound, title: 'Para un grupo', text: 'Un enlace para varias personas, con cupo máximo.' },
          ].map((o) => {
            const on = form.mode === o.value && !(adminRole && o.value === 'open');
            const disabled = adminRole && o.value === 'open';
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => set('mode')(o.value)}
                className={cx('flex items-start gap-3 rounded-2xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                  on ? 'border-brand bg-brand-soft/60 shadow-card' : 'border-line bg-surface hover:border-line-strong')}>
                <IconTile icon={o.icon} tone={on ? 'blue' : 'slate'} size="sm" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{o.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{disabled ? 'Un administrador siempre se invita con nombre.' : o.text}</span>
                </span>
              </button>
            );
          })}
        </div>

        {!preset.kind && isAdmin && (
          <Choice legend="Quién se registra" value={form.kind} onChange={set('kind')}
            options={[{ value: 'team', label: 'Equipo', icon: UsersRound }, { value: 'client', label: 'Cliente', icon: Building2 }]} />
        )}

        {form.kind === 'team' && <Choice legend="Rol" value={form.role} onChange={set('role')} options={roleOptions} />}

        {needClients && (
          <Field label="Cliente">
            {(id) => (
              <select id={id} className="input" value={form.client_id} onChange={(e) => set('client_id')(e.target.value)}>
                <option value="">{clients.data ? 'Elegí el cliente' : 'Cargando clientes…'}</option>
                {(clients.data?.clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </Field>
        )}

        {personal ? (
          <Field label="Nombre de la persona" hint="Solo el nombre: correo, WhatsApp y contraseña los completa ella al abrir el enlace.">
            {(id) => <input id={id} className="input" autoComplete="off" value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Ej. Catalina Gómez" />}
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del enlace (interno)" hint="Para reconocerlo en la lista.">
              {(id) => <input id={id} className="input" value={form.label} onChange={(e) => set('label')(e.target.value)} placeholder="Ej. Socios fundadores 2026" />}
            </Field>
            <Field label="Máximo de registros" hint={`Entre 1 y ${INVITE_LIMITS.maxUses}. Al llenarse, se cierra solo.`}>
              {(id) => (
                <div className="space-y-2">
                  <input id={id} type="number" min={1} max={INVITE_LIMITS.maxUses} inputMode="numeric" className="input num"
                    value={form.max_uses} onChange={(e) => set('max_uses')(Math.max(0, Math.min(INVITE_LIMITS.maxUses, Math.trunc(Number(e.target.value) || 0))))} />
                  <div className="flex flex-wrap gap-1">
                    {INVITE_USE_PRESETS.map((n) => (
                      <button key={n} type="button" onClick={() => set('max_uses')(n)} className={cx('chip cursor-pointer', form.max_uses === n ? 'tone-blue' : 'tone-slate')}>{n}</button>
                    ))}
                  </div>
                </div>
              )}
            </Field>
          </div>
        )}

        <Choice legend={`Vigencia${adminRole ? ' (máximo 7 días para administradores)' : ''}`} value={days} onChange={set('days')}
          options={INVITE_DURATIONS.filter((d) => d <= maxDays).map((d) => ({ value: d, label: d === 1 ? '24 h' : `${d} días` }))} />

        {form.kind === 'client' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3.5">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-brand)]" checked={form.can_approve} onChange={(e) => set('can_approve')(e.target.checked)} />
            <span className="text-sm"><span className="font-semibold text-ink">Pueden aprobar entregables</span><span className="block text-xs text-muted">Si lo desmarcás, quienes se registren solo revisan y comentan.</span></span>
          </label>
        )}

        <Field label="Mensaje de bienvenida (opcional)" hint="Aparece en la pantalla de registro y en el mensaje de WhatsApp.">
          {(id) => <textarea id={id} rows={2} maxLength={400} className="input" value={form.message} onChange={(e) => set('message')(e.target.value)} placeholder="Ej. ¡Bienvenidos al equipo! Cualquier duda me escriben." />}
        </Field>
      </form>
    </Modal>
  );
}

// ── Lista ───────────────────────────────────────────────────────────────────
function InviteRow({ invite: i, busy, onShare, onPatch, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = INVITE_STATUS[i.status] ?? INVITE_STATUS.activo;
  const Icon = i.kind === 'client' ? Building2 : ROLE_ICON[i.role] ?? UserRound;
  const tone = i.kind === 'client' ? 'teal' : ROLE_TONE[i.role] ?? 'slate';
  const active = i.status === 'activo';
  const regs = i.registrations ?? [];
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <IconTile icon={Icon} tone={tone} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold text-ink">{i.name ?? i.label ?? `Enlace abierto #${i.id}`}</p>
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {cap(inviteAudience(i))} · {i.personal ? 'personal' : `${i.uses} de ${i.max_uses} registrados`} · {i.status === 'vencido' ? `venció ${timeAgo(i.expires_at)}` : untilLabel(i.expires_at)}
          </p>
          {!i.personal && <ProgressBar className="mt-2 max-w-xs" value={(i.uses / i.max_uses) * 100} tone={i.status === 'agotado' ? 'blue' : 'teal'} label={`${i.uses} de ${i.max_uses} cupos usados`} />}
          {regs.length > 0 && (
            <button type="button" className="mt-2 flex items-center gap-2 text-xs font-semibold text-brand-ink" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <span className="flex -space-x-1.5">{regs.slice(0, 4).map((r) => <Avatar key={r.email} name={r.name} size={20} ring />)}</span>
              {plural(regs.length, 'persona registrada', 'personas registradas')}
              <ChevronDown className={cx('h-3.5 w-3.5 transition', open && 'rotate-180')} />
            </button>
          )}
          {open && (
            <ul className="animate-fade mt-2 space-y-1.5 rounded-xl bg-surface-2 p-2.5">
              {regs.map((r) => (
                <li key={`${r.email}-${r.used_at}`} className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 shrink-0 text-teal-ink" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate"><b className="font-semibold text-ink">{r.name}</b> <span className="text-muted">{r.email}</span></span>
                  <span className="shrink-0 text-muted-2">{timeAgo(r.used_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
        {active && <button type="button" className="btn btn-sm btn-soft max-sm:min-h-10" onClick={() => onShare(i)}><Share2 className="h-3.5 w-3.5" />Compartir</button>}
        {(i.status === 'vencido' || active) && <button type="button" disabled={busy} className="btn btn-sm btn-outline max-sm:min-h-10" onClick={() => onPatch(i, { days: i.role === 'admin' ? INVITE_LIMITS.adminMaxDays : INVITE_LIMITS.defaultDays }, 'Vigencia renovada')}><CalendarPlus className="h-3.5 w-3.5" />Renovar</button>}
        {i.status === 'agotado' && !i.personal && <button type="button" disabled={busy} className="btn btn-sm btn-outline max-sm:min-h-10" onClick={() => onPatch(i, { max_uses: Math.min(INVITE_LIMITS.maxUses, i.max_uses + 5) }, 'Se agregaron 5 cupos')}><Plus className="h-3.5 w-3.5" />5 cupos más</button>}
        {i.status !== 'revocado'
          ? <button type="button" disabled={busy} className="btn btn-sm btn-ghost max-sm:min-h-10" onClick={() => onPatch(i, { active: false }, 'Enlace desactivado', true)}><Power className="h-3.5 w-3.5" />Desactivar</button>
          : <button type="button" disabled={busy} className="btn btn-sm btn-ghost max-sm:min-h-10" onClick={() => onPatch(i, { active: true }, 'Enlace reactivado')}><Power className="h-3.5 w-3.5" />Reactivar</button>}
        {i.uses === 0 && <button type="button" disabled={busy} className="btn btn-sm btn-ghost text-coral-ink max-sm:min-h-10" onClick={() => onDelete(i)}><Trash2 className="h-3.5 w-3.5" />Eliminar</button>}
      </div>
    </li>
  );
}

/**
 * Lista de enlaces con sus acciones.
 * @param {{ clientId?: number, preset?: object, isAdmin?: boolean, senderName?: string, title?: string, compact?: boolean }} props
 */
export function InvitesPanel({ clientId, preset, isAdmin = true, senderName, compact = false }) {
  const path = clientId ? `/api/invites?client_id=${clientId}` : '/api/invites';
  const res = useResource(path);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState(null);
  const [picked, setFilter] = useState('activos');
  const invites = res.data?.invites ?? [];
  const activeCount = invites.filter((i) => i.status === 'activo').length;
  // Si no queda ningún enlace activo, se muestra todo para no esconder el historial.
  const filter = activeCount === 0 ? 'todos' : picked;
  const shown = filter === 'activos' ? invites.filter((i) => i.status === 'activo') : invites;
  const registered = invites.reduce((n, i) => n + i.uses, 0);

  async function patch(i, body, success, ask = false) {
    if (ask && !(await confirm({ title: 'Desactivar enlace', message: 'Deja de aceptar registros de inmediato. Quienes ya se registraron conservan su acceso. Podés reactivarlo cuando quieras.', confirmLabel: 'Desactivar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/invites/${i.id}`, { method: 'PATCH', body }), { success })) res.reload();
  }
  async function remove(i) {
    if (!(await confirm({ title: 'Eliminar enlace', message: 'Nadie lo usó todavía. Se elimina y deja de funcionar.', confirmLabel: 'Eliminar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/invites/${i.id}`, { method: 'DELETE' }), { success: 'Enlace eliminado' })) res.reload();
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone="teal" dot>{plural(activeCount, 'activo', 'activos')}</Badge>
          <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />{plural(registered, 'registro', 'registros')} con enlace</span>
          {invites.length > activeCount && activeCount > 0 && (
            <button type="button" className="font-semibold text-brand-ink" onClick={() => setFilter(filter === 'activos' ? 'todos' : 'activos')}>{filter === 'activos' ? 'Ver todos' : 'Solo activos'}</button>
          )}
        </div>
        <button type="button" className="btn btn-primary shrink-0" onClick={() => setCreating(true)}><Link2 className="h-4 w-4" />Nuevo enlace</button>
      </div>

      {!res.data && !res.error && <p className="px-5 py-6 text-sm text-muted">Cargando enlaces…</p>}
      {res.error && <p className="px-5 py-6 text-sm text-coral-ink">No pudimos cargar los enlaces. <button type="button" className="link" onClick={res.reload}>Reintentar</button></p>}
      {res.data && invites.length === 0 && (
        <div className={cx(compact ? 'p-4' : 'p-5')}>
          <EmptyState icon={Link2} tone="teal" title="Sin enlaces todavía"
            action={<button type="button" className="btn btn-soft" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Crear el primero</button>}>
            Compartí un enlace y cada persona se registra sola: escribe sus datos y elige su contraseña. Vos solo decidís el rol, el cupo y hasta cuándo sirve.
          </EmptyState>
        </div>
      )}
      {shown.length > 0 && (
        <ul className="divide-y divide-line" aria-label="Enlaces de registro">
          {shown.map((i) => <InviteRow key={i.id} invite={i} busy={busy} onShare={setSharing} onPatch={patch} onDelete={remove} />)}
        </ul>
      )}

      {creating && (
        <InviteComposer preset={preset} isAdmin={isAdmin} onClose={() => setCreating(false)}
          onCreated={(invite) => { setCreating(false); res.reload(); setSharing({ ...invite, fresh: true }); }} />
      )}
      {sharing && <InviteShare invite={sharing} fresh={sharing.fresh} senderName={senderName} onClose={() => setSharing(null)} />}
    </div>
  );
}
