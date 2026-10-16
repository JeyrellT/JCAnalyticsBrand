// Equipo: personas con su carga y servicios, mi perfil y contraseña, y ajustes operativos (tipo de cambio, SLA, WIP, respaldo).
// v6: el admin agrega personas con uno de los 4 roles (incluido "Inversionista"), recibe la contraseña temporal
// con un mensaje de WhatsApp que lleva el enlace de entrada correcto (/ o /inversionista), y los inversionistas
// se listan aparte (no forman parte de la operación ni de la carga de trabajo).
// /equipo?agregar=<rol> abre "Agregar persona" con ese rol (lo usa la bienvenida de la configuración inicial).
import { useId, useMemo, useState } from 'react';
import {
  UserPlus, KeyRound, Copy, ShieldCheck, Save, DatabaseBackup, Power, MessageCircle, Pencil, Users, UserX, AlertTriangle, UserRound, SlidersHorizontal, Palette,
  Crown, Handshake, Wrench, Landmark, Check, Building2, Link2, Mail, ArrowRight, Share2, Hourglass,
} from 'lucide-react';
import { useSession, useResource } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import {
  PageHeader, PageLoader, EmptyState, Modal, Field, Avatar, Tabs, IconTile, SectionHead, RowArrow, ThemePicker, useAction, useToast, useConfirm, cx,
} from '../components/ui.jsx';
import { PersonCard, RoleBadge, LOAD_META } from '../components/people.jsx';
import { PasswordForm } from './Login.jsx';
import { ROLES, MEMBER_COLORS } from '../../shared/catalog.js';
import { timeAgo, whatsappLink } from '../lib/format.js';
import { InvitesPanel, InviteShare, inviteAudience, cap } from '../components/invites.jsx';
import { INVITE_LIMITS } from '../../shared/invites.js';

/** Ícono y tono de cada rol en el selector (mismos tonos que RoleBadge). */
const ROLE_LOOK = {
  admin: { icon: Crown, tone: 'ink' },
  socio: { icon: Handshake, tone: 'blue' },
  colaborador: { icon: Wrench, tone: 'slate' },
  inversionista: { icon: Landmark, tone: 'violet' },
};

const isInvestorRoleKey = (role) => role === 'inversionista';
/** Enlace de entrada según el rol: el equipo entra por la raíz; un inversionista, por su portal. */
const entryUrl = (role) => `${window.location.origin}${isInvestorRoleKey(role) ? '/inversionista' : '/'}`;
const firstName = (name = '') => name.split(' ')[0];

/** Mensaje listo para enviar con el acceso (lleva el enlace correcto según el rol). */
function accessMessage({ name, email, password, role }) {
  const investor = isInvestorRoleKey(role);
  return [
    `Hola ${firstName(name)}, este es tu acceso al ${investor ? 'portal de inversionistas' : 'portal'} de JC Analytics:`,
    entryUrl(role),
    `Correo: ${email}`,
    `Contraseña temporal: ${password}`,
    investor
      ? 'Te pedirá cambiarla al entrar. Ahí ves tu capital, tus retornos y confirmás cada movimiento a tu nombre.'
      : 'Te pedirá cambiarla al entrar.',
  ].join('\n');
}

/** Paleta de colores de avatar: botones redondos con anillo de marca en el elegido. */
function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
      {MEMBER_COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-label={`Color ${c}`} aria-checked={value === c} onClick={() => onChange(c)}
          className={cx('h-9 w-9 rounded-full ring-offset-2 ring-offset-surface transition hover:scale-105', value === c && 'ring-2 ring-brand')} style={{ background: c }} />
      ))}
    </div>
  );
}

/**
 * Selector de rol en tarjetas: radios nativos (las flechas cambian la opción, Tab entra y sale del grupo).
 * Cada tarjeta dice qué ve ese rol y por dónde entra.
 */
function RolePicker({ value, onChange }) {
  const uid = useId();
  return (
    <fieldset>
      <legend className="label">Rol y acceso</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(ROLES).map(([key, meta]) => {
          const look = ROLE_LOOK[key] ?? { icon: UserRound, tone: 'slate' };
          const on = value === key;
          const hintId = `${uid}-${key}`;
          return (
            <label key={key} className={cx(
              'relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50',
              on ? 'border-brand bg-brand-soft/60 shadow-card' : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
            )}>
              <input type="radio" name={`${uid}-role`} value={key} checked={on} onChange={() => onChange(key)} className="sr-only" aria-label={meta.label} aria-describedby={hintId} />
              <IconTile icon={look.icon} tone={look.tone} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{meta.label}</span>
                  <span className={cx('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition', on ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface')} aria-hidden="true">
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </span>
                <span id={hintId} className="mt-0.5 block text-xs leading-snug text-muted">
                  {meta.hint}
                  <span className={cx('mt-1.5 flex items-center gap-1 font-semibold', isInvestorRoleKey(key) ? 'text-violet-ink' : 'text-muted-2')}>
                    <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />{isInvestorRoleKey(key) ? 'Entra por su portal: /inversionista' : 'Entra al portal del equipo'}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function TempPassword({ result, onClose }) {
  const toast = useToast();
  const text = accessMessage(result);
  // Sin WhatsApp registrado, el enlace abre WhatsApp para elegir el contacto.
  const wa = whatsappLink(result.phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
  const copy = (value, done) => {
    if (!navigator.clipboard) { toast('No se pudo copiar: copialo a mano.', 'error'); return; }
    navigator.clipboard.writeText(value).then(() => toast(done), () => toast('No se pudo copiar: copialo a mano.', 'error'));
  };
  const investor = isInvestorRoleKey(result.role);
  return (
    <Modal open onClose={onClose} title="Contraseña temporal" size="sm" footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>}>
      <p className="text-sm text-muted">Compartila por un canal privado. Solo se muestra esta vez; {firstName(result.name)} deberá cambiarla al ingresar.</p>
      <div className="card-panel mt-4 flex items-center gap-2 p-4 font-mono text-lg font-semibold tracking-wider">
        <span className="relative flex-1 select-all break-all">{result.password}</span>
        <button type="button" className="tap relative flex items-center justify-center rounded-lg text-panel-muted transition hover:bg-white/10 hover:text-white" aria-label="Copiar contraseña" onClick={() => copy(result.password, 'Contraseña copiada')}><Copy className="h-4 w-4" /></button>
      </div>
      <dl className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line text-sm">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <dt className="text-muted">Rol</dt>
          <dd><RoleBadge role={result.role} /></dd>
        </div>
        <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
          <dt className="shrink-0 text-muted">Entra por</dt>
          <dd className="min-w-0 break-all text-right font-semibold text-ink">{entryUrl(result.role)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
          <dt className="shrink-0 text-muted">Correo</dt>
          <dd className="min-w-0 break-all text-right text-ink">{result.email}</dd>
        </div>
      </dl>
      {investor && <p className="mt-3 flex items-start gap-2 rounded-xl bg-violet-soft px-3 py-2.5 text-xs text-violet-ink"><Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Entra solo a su portal de inversionistas: ve su capital y sus retornos, y confirma los movimientos a su nombre.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a className="btn btn-outline" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-teal-ink" />Enviar por WhatsApp</a>
        <button type="button" className="btn btn-outline" onClick={() => copy(text, 'Mensaje copiado')}><Copy className="h-4 w-4" />Copiar mensaje</button>
      </div>
      {!result.phone && <p className="mt-2 text-xs text-muted">Sin WhatsApp registrado: elegí el contacto al abrir WhatsApp.</p>}
    </Modal>
  );
}

function MemberModal({ member, presetRole, onClose, onSaved, onInvite }) {
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const [form, setForm] = useState(() => member ?? { role: ROLES[presetRole] ? presetRole : 'socio', color: MEMBER_COLORS[0] });
  // v7: una persona nueva se agrega por defecto "solo con el nombre": se genera su enlace personal
  // y ella completa correo, WhatsApp y contraseña. "Con correo" mantiene la clave temporal.
  const [mode, setMode] = useState('link');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const investor = isInvestorRoleKey(form.role);
  const viaLink = !member && mode === 'link';

  /** Pasar a inversionista (o dejar de serlo) cambia qué portal abre la persona: se confirma antes. */
  async function confirmAccessChange() {
    if (!member || member.role === form.role || !(isInvestorRoleKey(member.role) || investor)) return true;
    const first = firstName(member.name);
    const label = ROLES[form.role].label.toLowerCase();
    const message = investor
      ? `Su acceso cambia de inmediato: deja de ver la operación (proyectos, tablero, agenda y clientes) y entra solo a su portal de inversionistas (${entryUrl('inversionista')}), donde ve su capital y confirma los movimientos a su nombre. Si tiene tareas o proyectos asignados, reasignalos.`
      : `Su acceso cambia de inmediato: deja el portal de inversionistas y entra al portal del equipo (${entryUrl(form.role)}) como ${label}. ${form.role === 'colaborador' ? 'Como colaborador no ve inversiones; su capital y sus movimientos se conservan.' : 'Va a ver y administrar todas las inversiones del equipo.'}`;
    return confirm({ title: investor ? `${first} pasa a ser inversionista` : `${first} pasa al equipo como ${label}`, message, confirmLabel: 'Cambiar acceso' });
  }

  async function save(e) {
    e.preventDefault();
    if (viaLink) {
      const days = form.role === 'admin' ? INVITE_LIMITS.adminMaxDays : INVITE_LIMITS.defaultDays;
      const res = await run(() => api('/api/invites', { method: 'POST', body: { kind: 'team', role: form.role, name: form.name, days } }), { success: 'Enlace personal creado' });
      if (res) { onInvite(res.invite); onClose(); }
      return;
    }
    if (!(await confirmAccessChange())) return;
    const body = { name: form.name, role: form.role, color: form.color, phone: form.phone || null };
    if (!member) body.email = form.email;
    const res = await run(() => api(member ? `/api/users/${member.id}` : '/api/users', { method: member ? 'PATCH' : 'POST', body }), { success: member ? 'Persona actualizada' : investor ? 'Inversionista agregado' : 'Persona agregada' });
    if (res) { onSaved(res, form); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title={member ? `Editar a ${firstName(member.name)}` : 'Agregar persona'} size="lg"
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="member-form" className="btn btn-primary" disabled={busy || !form.name || form.name.trim().length < 2 || (!member && !viaLink && !form.email)}>{busy ? 'Guardando…' : viaLink ? <><Link2 className="h-4 w-4" />Crear enlace</> : 'Guardar'}</button></>}>
      <form id="member-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {!member && (
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2" role="radiogroup" aria-label="Cómo agregarla">
            {[
              { value: 'link', icon: Link2, title: 'Solo el nombre', text: 'Te damos un enlace personal. Ella pone su correo, WhatsApp y contraseña.' },
              { value: 'email', icon: Mail, title: 'Con su correo', text: 'La creás vos y le enviás una contraseña temporal.' },
            ].map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={mode === o.value} onClick={() => setMode(o.value)}
                className={cx('flex items-start gap-3 rounded-2xl border p-3 text-left transition', mode === o.value ? 'border-brand bg-brand-soft/60 shadow-card' : 'border-line bg-surface hover:border-line-strong')}>
                <IconTile icon={o.icon} tone={mode === o.value ? 'blue' : 'slate'} size="sm" />
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{o.title}{o.value === 'link' && <span className="chip tone-teal ml-1.5 align-middle">Recomendado</span>}</span><span className="mt-0.5 block text-xs leading-snug text-muted">{o.text}</span></span>
              </button>
            ))}
          </div>
        )}
        <Field label="Nombre completo" className="sm:col-span-2">{(id) => <input id={id} className="input" autoComplete="off" value={form.name ?? ''} onChange={(e) => set('name')(e.target.value)} />}</Field>
        {!member && !viaLink && <Field label="Correo" hint="Con este correo ingresa. Recibe una contraseña temporal.">{(id) => <input id={id} type="email" inputMode="email" autoComplete="off" className="input" value={form.email ?? ''} onChange={(e) => set('email')(e.target.value)} />}</Field>}
        {!viaLink && <Field label="WhatsApp" className={member ? 'sm:col-span-2' : undefined} hint="Para enviarle el acceso y los avisos.">{(id) => <input id={id} className="input" type="tel" inputMode="tel" value={form.phone ?? ''} onChange={(e) => set('phone')(e.target.value)} placeholder="8888-0000" />}</Field>}
        <div className="sm:col-span-2"><RolePicker value={form.role} onChange={set('role')} /></div>
        {viaLink && (
          <p className="flex items-start gap-2 rounded-xl bg-teal-soft px-3 py-2.5 text-xs text-teal-ink sm:col-span-2">
            <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>El enlace sirve una sola vez y vence en {form.role === 'admin' ? INVITE_LIMITS.adminMaxDays : INVITE_LIMITS.defaultDays} días. Para un grupo (varios socios a la vez, con cupo máximo) usá <b>Enlaces de registro</b>.</span>
          </p>
        )}
        {!viaLink && <Field label="Color" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <Avatar name={form.name || '?'} color={form.color} size={36} />
            <ColorPicker value={form.color} onChange={set('color')} />
          </div>
        </Field>}
        {!member && (
          <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted sm:col-span-2">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>¿Es un cliente? Los clientes no se agregan aquí: dales acceso desde su ficha en <Link to="/clientes" className="link" onClick={onClose}>Clientes</Link> → Portal del cliente.</span>
          </p>
        )}
      </form>
    </Modal>
  );
}

function SettingsCard() {
  const { settings, refresh } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState(settings);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    const body = Object.fromEntries(['fx_usd_crc', 'update_sla_hours', 'wip_en_progreso', 'wip_revision', 'brief_lead_days'].map((k) => [k, Number(String(form[k]).replace(',', '.'))]));
    if (await run(() => api('/api/settings', { method: 'PATCH', body }), { success: 'Ajustes guardados' })) refresh();
  }
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="settings-title">
      <SectionHead flush id="settings-title" icon={SlidersHorizontal} tone="teal" title="Ajustes operativos" hint="Tipo de cambio, avance, límites WIP y plazo de los briefs." />
      <form onSubmit={save} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Tipo de cambio (₡ por US$)" hint="Referencia BCCR para movimientos nuevos en dólares.">{(id) => <input id={id} className="input tabular" inputMode="decimal" value={form.fx_usd_crc ?? ''} onChange={set('fx_usd_crc')} />}</Field>
        <Field label="Avance al cliente cada (horas)" hint="Compromiso público: 72 h.">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.update_sla_hours ?? ''} onChange={set('update_sla_hours')} />}</Field>
        <Field label="Límite WIP · En progreso">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.wip_en_progreso ?? ''} onChange={set('wip_en_progreso')} />}</Field>
        <Field label="Límite WIP · Revisión">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.wip_revision ?? ''} onChange={set('wip_revision')} />}</Field>
        <Field label="Días mínimos de producción de un brief" className="sm:col-span-2" hint="Entre 1 y 30. La fecha de envío más cercana que puede pedir un cliente es hoy + estos días; el equipo puede marcar un brief urgente para saltarlo.">
          {(id) => <input id={id} className="input tabular sm:max-w-[calc(50%-0.5rem)]" type="number" inputMode="numeric" min={1} max={30} step={1} value={form.brief_lead_days ?? ''} onChange={set('brief_lead_days')} />}
        </Field>
        <div className="sm:col-span-2"><button type="submit" className="btn btn-primary" disabled={busy}><Save className="h-4 w-4" />Guardar ajustes</button></div>
      </form>
      <div className="border-t border-line bg-surface-2/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile icon={DatabaseBackup} tone="slate" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Respaldo de la base</p>
              <p className="text-xs text-muted">Descargá una copia completa (SQLite). Recomendado: semanal y antes de cada cambio grande.</p>
            </div>
          </div>
          <a className="btn btn-dark shrink-0" href="/api/admin/backup" download>Descargar respaldo</a>
        </div>
      </div>
    </section>
  );
}

function ProfileCard() {
  const { user, refresh } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '', color: user.color });
  async function save(e) {
    e.preventDefault();
    if (await run(() => api('/api/me', { method: 'PATCH', body: { name: form.name, phone: form.phone || null, color: form.color } }), { success: 'Perfil actualizado' })) refresh();
  }
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="profile-title">
      <SectionHead flush id="profile-title" icon={UserRound} tone="teal" title="Mi perfil" hint="Cómo te ve el resto del equipo." />
      <form onSubmit={save} className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <Avatar name={form.name} color={form.color} size={48} />
          <div className="min-w-0">
            <p className="break-all text-sm font-semibold leading-snug sm:text-base">{user.email}</p>
            <div className="mt-1"><RoleBadge role={user.role} /></div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">{(id) => <input id={id} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="WhatsApp">{(id) => <input id={id} className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="8888-0000" />}</Field>
        </div>
        <div>
          <p className="label">Color</p>
          <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
        </div>
        <button type="submit" className="btn btn-outline" disabled={busy}><Save className="h-4 w-4" />Guardar perfil</button>
      </form>
      <div className="border-t border-line p-4 sm:p-5">
        <h3 className="mb-4 flex items-center gap-3 font-display text-[15px] font-bold"><IconTile icon={ShieldCheck} tone="teal" size="sm" />Cambiar contraseña</h3>
        <PasswordForm />
      </div>
    </section>
  );
}

const TABS = { personas: 'Personas', enlaces: 'Enlaces de registro', perfil: 'Mi perfil', ajustes: 'Ajustes' };
const ADMIN_TABS = new Set(['enlaces', 'ajustes']);

/** Acciones del admin sobre una persona (editar, contraseña temporal, desactivar o reactivar). */
function MemberActions({ member, me, busy, onEdit, onReset, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="btn btn-outline btn-sm min-h-11 flex-1 sm:min-h-9" onClick={() => onEdit(member)}><Pencil className="h-3.5 w-3.5" />Editar</button>
      {member.active && <button type="button" className="btn btn-ghost btn-sm min-h-11 flex-1 sm:min-h-9" onClick={() => onReset(member)} disabled={busy}><KeyRound className="h-3.5 w-3.5" />Contraseña</button>}
      {member.id !== me && (
        <button type="button" className={cx('btn btn-sm min-h-11 flex-1 sm:min-h-9', member.active ? 'btn-ghost' : 'btn-teal')} onClick={() => onToggle(member)} disabled={busy}>
          <Power className="h-3.5 w-3.5" />{member.active ? 'Desactivar' : 'Reactivar'}
        </button>
      )}
    </div>
  );
}

function accessNote(m) {
  if (!m.active) return 'Acceso desactivado';
  const base = m.last_login_at ? `Último ingreso ${timeAgo(m.last_login_at)}` : 'Aún no ingresa';
  return m.must_change_password ? `${base} · contraseña temporal pendiente` : base;
}

/** Pastilla del resumen de carga: punto de tono, número y etiqueta. */
function LoadChip({ tone, icon: Icon, value, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2.5 pr-3.5 text-sm shadow-card">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" /> : <span className={cx('h-2 w-2 shrink-0 rounded-full', `dot-${tone}`)} aria-hidden="true" />}
      <span className="num font-bold">{value}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}

/**
 * Inversionistas (v6): ponen capital y ven solo lo suyo en /inversionista. No están en el directorio de la
 * operación ni en la carga de trabajo, así que se listan aparte. Los ven admin y socios; solo el admin los gestiona.
 */
function InvestorsSection({ investors, actions }) {
  const { user, isAdmin } = useSession();
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="inversionistas-title">
      <SectionHead flush id="inversionistas-title" icon={Landmark} tone="violet" title="Inversionistas"
        hint={<><span className="sm:hidden">Ven solo lo suyo, en su portal.</span><span className="hidden sm:inline">Ponen capital y ven solo lo suyo en su portal. No participan en la operación.</span></>}
        action={isAdmin && (
          <button type="button" className="btn btn-soft btn-sm min-h-11 sm:min-h-9" onClick={() => actions.onAdd('inversionista')}>
            <UserPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Agregar inversionista</span><span className="sm:hidden">Agregar</span>
          </button>
        )} />
      {investors.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted sm:px-5">Todavía no hay inversionistas. Agregá a cada persona que pone capital: confirma sus aportes y retornos desde su propio portal.</p>
      ) : (
        <ul className="divide-y divide-line">
          {investors.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={m.name} color={m.color} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-semibold text-ink">{m.name}</span>
                    <RoleBadge role={m.role} />
                  </p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{m.email}</span></p>
                  {isAdmin && <p className="mt-0.5 text-xs text-muted">{accessNote(m)}</p>}
                </div>
              </div>
              {isAdmin && <div className="lg:w-[340px] lg:shrink-0"><MemberActions member={m} me={user.id} {...actions} /></div>}
            </li>
          ))}
        </ul>
      )}
      <Link to="/inversiones" className="group row min-h-12 border-t border-line bg-surface-2/60 px-4 py-2.5 text-sm font-semibold text-brand-ink sm:px-5">
        <span className="min-w-0 flex-1">Ver su capital y sus movimientos en Inversiones</span>
        <RowArrow />
      </Link>
    </section>
  );
}

/** Los accesos de clientes se dan por cliente (ficha → Portal del cliente), no desde el equipo. */
function ClientAccessPointer() {
  return (
    <Link to="/clientes" className="card card-hover group row min-h-16 px-4 py-3 sm:px-5">
      <IconTile icon={Building2} tone="blue" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink group-hover:text-brand-ink">Dar acceso a clientes</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">Se da por cliente: abrí su ficha → Portal del cliente → Dar acceso.</span>
      </span>
      <span className="hidden items-center gap-1 text-sm font-semibold text-brand-ink sm:flex">Ir a Clientes<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
      <RowArrow className="sm:hidden" />
    </Link>
  );
}

/** v7: personas invitadas "solo con el nombre" que todavía no completaron su registro. */
function PendingInvites({ onShare }) {
  const { data } = useResource('/api/invites');
  const pending = (data?.invites ?? []).filter((i) => i.kind === 'team' && i.personal && i.status === 'activo');
  if (!pending.length) return null;
  return (
    <section aria-labelledby="esperando" className="rounded-2xl border border-dashed border-teal/40 bg-teal-soft/30 p-3 sm:p-4">
      <h2 id="esperando" className="mb-3 flex items-center gap-2 px-1 font-semibold text-ink"><Hourglass className="h-4 w-4 text-teal-ink" />Esperando registro <span className="num font-normal text-muted">{pending.length}</span></h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pending.map((i) => (
          <article key={i.id} className="card flex items-center gap-3 p-3.5">
            <Avatar name={i.name} color="#94a3b8" size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.name}</p>
              <p className="truncate text-xs text-muted">{cap(inviteAudience(i))} · invitada {timeAgo(i.created_at)}</p>
            </div>
            <button type="button" className="btn btn-sm btn-soft max-sm:min-h-10" onClick={() => onShare(i)}><Share2 className="h-3.5 w-3.5" />Enlace</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PeopleTab({ resource, actions }) {
  const { user, team, activeTeam, isAdmin, canInvest } = useSession();
  const { data, error, reload } = resource;
  const byId = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);
  const inactive = team.filter((m) => !m.active);
  const investors = team.filter((m) => m.active && isInvestorRoleKey(m.role));

  // Si la carga de trabajo no responde, igual mostramos al equipo (sin contadores) para no bloquear la administración.
  const people = data?.people ?? (error ? activeTeam : null);
  if (!people) return <PageLoader />;
  const counts = Object.fromEntries(Object.keys(LOAD_META).map((k) => [k, people.filter((p) => p.load === k).length]));

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber/30 bg-amber-soft p-4 text-sm text-amber-ink sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />No pudimos cargar la carga de trabajo de cada persona.</p>
          <button type="button" className="btn btn-outline" onClick={reload}>Reintentar</button>
        </div>
      )}

      {data && people.length > 0 && (
        <div className="animate-rise flex flex-wrap gap-2" aria-label="Resumen de carga">
          <LoadChip icon={Users} value={people.length} label={people.length === 1 ? 'persona' : 'personas'} />
          {Object.entries(LOAD_META).filter(([k]) => counts[k]).map(([k, meta]) => (
            <LoadChip key={k} tone={meta.tone} value={counts[k]} label={counts[k] === 1 ? meta.label.toLowerCase() : meta.plural} />
          ))}
        </div>
      )}

      {people.length === 0 ? (
        <EmptyState icon={Users} tone="teal" title="Todavía no hay personas activas"
          action={isAdmin && <button type="button" className="btn btn-primary" onClick={() => actions.onAdd('socio')}><UserPlus className="h-4 w-4" />Agregar persona</button>}>
          Agregá a cada socio o colaborador para repartir proyectos, tareas y citas.
        </EmptyState>
      ) : (
        <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Personas">
          {people.map((p) => {
            const member = byId.get(p.id) ?? p;
            return (
              <PersonCard key={p.id} person={p} isMe={p.id === user.id} note={isAdmin ? accessNote(member) : null}>
                {isAdmin && <MemberActions member={member} me={user.id} {...actions} />}
              </PersonCard>
            );
          })}
        </section>
      )}

      {isAdmin && <PendingInvites key={actions.version} onShare={actions.onShare} />}

      {canInvest && (isAdmin || investors.length > 0) && <InvestorsSection investors={investors} actions={actions} />}

      {isAdmin && inactive.length > 0 && (
        <section aria-labelledby="sin-acceso" className="rounded-2xl border border-dashed border-line-strong p-3 sm:p-4">
          <h2 id="sin-acceso" className="mb-3 flex items-center gap-2 px-1 font-semibold text-muted"><UserX className="h-4 w-4" />Sin acceso <span className="num font-normal">{inactive.length}</span></h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inactive.map((m) => (
              <article key={m.id} className="card flex flex-col gap-3 bg-surface/70 p-4">
                <div className="flex items-center gap-3 opacity-70">
                  <Avatar name={m.name} color={m.color} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                </div>
                <p className="text-xs text-muted">Acceso desactivado. Su historial se conserva.</p>
                <div className="border-t border-line pt-3"><MemberActions member={m} me={user.id} {...actions} /></div>
              </article>
            ))}
          </div>
        </section>
      )}

      {isAdmin && <ClientAccessPointer />}
    </div>
  );
}

export default function Team() {
  const { user, isAdmin, loadTeam, settings } = useSession();
  const { query } = useLocation();
  // { member } edita a alguien; { role } agrega a una persona nueva con ese rol preseleccionado.
  const [editing, setEditing] = useState(() => (isAdmin && query.has('agregar') ? { role: query.get('agregar') } : null));
  const [temp, setTemp] = useState(null);
  const [sharing, setSharing] = useState(null); // v7: enlace personal recién creado
  const people = useResource('/api/people');
  const [run, busy] = useAction();
  const confirm = useConfirm();

  const requested = query.get('tab');
  const tab = requested === 'perfil' || (ADMIN_TABS.has(requested) && isAdmin) ? requested : 'personas';
  const setTab = (value) => navigate(value === 'personas' ? '/equipo' : `/equipo?tab=${value}`, { replace: true });
  const changed = () => { loadTeam(); people.reload(); };
  const closeEditor = () => {
    setEditing(null);
    if (query.has('agregar')) navigate('/equipo', { replace: true });
  };

  const reset = async (m) => {
    if (!(await confirm({ title: 'Nueva contraseña temporal', message: `Se genera una contraseña temporal para ${m.name} y se cierran sus sesiones abiertas.`, confirmLabel: 'Generar' }))) return;
    const res = await run(() => api(`/api/users/${m.id}/reset-password`, { method: 'POST' }));
    if (res) setTemp({ name: m.name, email: m.email, phone: m.phone, role: m.role, password: res.temporary_password });
  };
  const toggle = async (m) => {
    if (m.active && !(await confirm({ title: `Desactivar a ${m.name}`, message: 'Pierde el acceso de inmediato. Su historial se conserva.', confirmLabel: 'Desactivar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/users/${m.id}`, { method: 'PATCH', body: { active: !m.active } }), { success: m.active ? 'Acceso desactivado' : 'Acceso reactivado' })) changed();
  };
  const [version, setVersion] = useState(0);
  const actions = { busy, version, onShare: setSharing, onEdit: (member) => setEditing({ member }), onAdd: (role) => setEditing({ role }), onReset: reset, onToggle: toggle };

  const tabs = Object.entries(TABS).filter(([value]) => !ADMIN_TABS.has(value) || isAdmin).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Quiénes somos" title="Equipo" icon={Users} tone="teal" subtitle="Quién hace qué, en qué servicios está y cuánta carga tiene. Tocá una persona para ver su ficha."
        actions={isAdmin && tab === 'personas' && <button type="button" className="btn btn-primary" onClick={() => setEditing({ role: 'socio' })}><UserPlus className="h-4 w-4" />Agregar persona</button>} />

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"><Tabs tabs={tabs} value={tab} onChange={setTab} /></div>

      {tab === 'personas' && <PeopleTab resource={people} actions={actions} />}

      {tab === 'perfil' && (
        <div className="max-w-2xl space-y-4">
          <Link to={`/equipo/${user.id}`} className="card card-hover group row min-h-14 px-4 py-3 text-sm font-semibold">
            <Avatar name={user.name} color={user.color} size={36} />
            <span className="min-w-0 flex-1">Ver mi ficha<span className="block text-xs font-normal text-muted">Mis servicios, proyectos, tareas y citas</span></span>
            <RowArrow />
          </Link>
          <ProfileCard />
          <section className="card animate-rise overflow-hidden" aria-labelledby="appearance-title">
            <SectionHead flush id="appearance-title" icon={Palette} tone="violet" title="Apariencia" hint="Claro, oscuro o como el celular." />
            <div className="p-4 sm:p-5"><ThemePicker /></div>
          </section>
        </div>
      )}

      {tab === 'enlaces' && isAdmin && (
        <section className="card animate-rise max-w-4xl overflow-hidden" aria-labelledby="enlaces-title">
          <SectionHead flush id="enlaces-title" icon={Link2} tone="teal" title="Enlaces de registro"
            hint="Compartí un enlace y cada persona se registra sola. Personales (un uso) o para grupos con cupo máximo, para el equipo o para clientes." />
          <InvitesPanel senderName={user.name} />
        </section>
      )}

      {tab === 'ajustes' && isAdmin && <div className="max-w-3xl"><SettingsCard key={JSON.stringify(settings)} /></div>}

      {editing && <MemberModal member={editing.member ?? null} presetRole={editing.role} onClose={closeEditor} onInvite={(invite) => { setSharing(invite); setVersion((v) => v + 1); }}
        onSaved={(res, form) => { changed(); if (res.temporary_password) setTemp({ name: res.user.name, email: res.user.email, phone: form.phone, role: res.user.role, password: res.temporary_password }); }} />}
      {temp && <TempPassword result={temp} onClose={() => setTemp(null)} />}
      {sharing && <InviteShare invite={sharing} fresh senderName={user.name} onClose={() => setSharing(null)} />}
    </div>
  );
}
