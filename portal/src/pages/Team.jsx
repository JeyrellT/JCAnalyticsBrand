// Equipo: personas con su carga y servicios, mi perfil y contraseña, y ajustes operativos (tipo de cambio, SLA, WIP, respaldo).
import { useMemo, useState } from 'react';
import {
  UserPlus, KeyRound, Copy, ShieldCheck, Save, DatabaseBackup, Power, MessageCircle, Pencil, Users, UserX, AlertTriangle, UserRound, SlidersHorizontal, Palette,
} from 'lucide-react';
import { useSession, useResource } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { Link, navigate, useLocation } from '../lib/router.jsx';
import {
  PageHeader, PageLoader, EmptyState, Modal, Field, Select, Avatar, Tabs, IconTile, SectionHead, RowArrow, ThemePicker, useAction, useToast, useConfirm, cx,
} from '../components/ui.jsx';
import { PersonCard, RoleBadge, LOAD_META } from '../components/people.jsx';
import { PasswordForm } from './Login.jsx';
import { ROLES, MEMBER_COLORS } from '../../shared/catalog.js';
import { timeAgo, whatsappLink } from '../lib/format.js';

const roleOptions = Object.entries(ROLES).map(([value, v]) => ({ value, label: v.label }));

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

function TempPassword({ result, onClose }) {
  const toast = useToast();
  const text = `Hola ${result.name.split(' ')[0]}, este es tu acceso al portal de JC Analytics:\n${window.location.origin}\nCorreo: ${result.email}\nContraseña temporal: ${result.password}\nTe pedirá cambiarla al entrar.`;
  const wa = whatsappLink(result.phone, text);
  return (
    <Modal open onClose={onClose} title="Contraseña temporal" size="sm" footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>}>
      <p className="text-sm text-muted">Compartila por un canal privado. Solo se muestra esta vez; la persona deberá cambiarla al ingresar.</p>
      <div className="card-panel mt-4 flex items-center gap-2 p-4 font-mono text-lg font-semibold tracking-wider">
        <span className="relative flex-1 select-all break-all">{result.password}</span>
        <button type="button" className="tap relative flex items-center justify-center rounded-lg text-panel-muted transition hover:bg-white/10 hover:text-white" aria-label="Copiar" onClick={() => navigator.clipboard?.writeText(result.password).then(() => toast('Copiada'))}><Copy className="h-4 w-4" /></button>
      </div>
      {wa && <a className="btn btn-outline mt-3 w-full" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-teal-ink" />Enviar acceso por WhatsApp</a>}
    </Modal>
  );
}

function MemberModal({ member, onClose, onSaved }) {
  const [run, busy] = useAction();
  const [form, setForm] = useState(() => member ?? { role: 'socio', color: MEMBER_COLORS[0] });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  async function save(e) {
    e.preventDefault();
    const body = { name: form.name, role: form.role, color: form.color, phone: form.phone || null };
    if (!member) body.email = form.email;
    const res = await run(() => api(member ? `/api/users/${member.id}` : '/api/users', { method: member ? 'PATCH' : 'POST', body }), { success: member ? 'Persona actualizada' : 'Persona agregada' });
    if (res) { onSaved(res, form); onClose(); }
  }
  return (
    <Modal open onClose={onClose} title={member ? `Editar a ${member.name.split(' ')[0]}` : 'Agregar persona'}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button type="submit" form="member-form" className="btn btn-primary" disabled={busy || !form.name || (!member && !form.email)}>{busy ? 'Guardando…' : 'Guardar'}</button></>}>
      <form id="member-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" className="sm:col-span-2">{(id) => <input id={id} className="input" value={form.name ?? ''} onChange={(e) => set('name')(e.target.value)} />}</Field>
        {!member && <Field label="Correo" className="sm:col-span-2">{(id) => <input id={id} type="email" className="input" value={form.email ?? ''} onChange={(e) => set('email')(e.target.value)} />}</Field>}
        <Field label="Rol" hint={ROLES[form.role]?.hint}>{(id) => <Select id={id} options={roleOptions} value={form.role} onChange={set('role')} />}</Field>
        <Field label="WhatsApp">{(id) => <input id={id} className="input" inputMode="tel" value={form.phone ?? ''} onChange={(e) => set('phone')(e.target.value)} placeholder="8888-0000" />}</Field>
        <Field label="Color" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <Avatar name={form.name || '?'} color={form.color} size={36} />
            <ColorPicker value={form.color} onChange={set('color')} />
          </div>
        </Field>
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
    const body = Object.fromEntries(['fx_usd_crc', 'update_sla_hours', 'wip_en_progreso', 'wip_revision'].map((k) => [k, Number(String(form[k]).replace(',', '.'))]));
    if (await run(() => api('/api/settings', { method: 'PATCH', body }), { success: 'Ajustes guardados' })) refresh();
  }
  return (
    <section className="card animate-rise overflow-hidden" aria-labelledby="settings-title">
      <SectionHead flush id="settings-title" icon={SlidersHorizontal} tone="teal" title="Ajustes operativos" hint="Tipo de cambio, avance y límites WIP." />
      <form onSubmit={save} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <Field label="Tipo de cambio (₡ por US$)" hint="Referencia BCCR para movimientos nuevos en dólares.">{(id) => <input id={id} className="input tabular" inputMode="decimal" value={form.fx_usd_crc ?? ''} onChange={set('fx_usd_crc')} />}</Field>
        <Field label="Avance al cliente cada (horas)" hint="Compromiso público: 72 h.">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.update_sla_hours ?? ''} onChange={set('update_sla_hours')} />}</Field>
        <Field label="Límite WIP · En progreso">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.wip_en_progreso ?? ''} onChange={set('wip_en_progreso')} />}</Field>
        <Field label="Límite WIP · Revisión">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.wip_revision ?? ''} onChange={set('wip_revision')} />}</Field>
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

const TABS = { personas: 'Personas', perfil: 'Mi perfil', ajustes: 'Ajustes' };

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

function PeopleTab({ resource, actions }) {
  const { user, team, activeTeam, isAdmin } = useSession();
  const { data, error, reload } = resource;
  const byId = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);
  const inactive = team.filter((m) => !m.active);

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
          action={isAdmin && <button type="button" className="btn btn-primary" onClick={() => actions.onEdit('new')}><UserPlus className="h-4 w-4" />Agregar persona</button>}>
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
    </div>
  );
}

export default function Team() {
  const { user, isAdmin, loadTeam, settings } = useSession();
  const { query } = useLocation();
  const [editing, setEditing] = useState(null);
  const [temp, setTemp] = useState(null);
  const people = useResource('/api/people');
  const [run, busy] = useAction();
  const confirm = useConfirm();

  const requested = query.get('tab');
  const tab = requested === 'perfil' || (requested === 'ajustes' && isAdmin) ? requested : 'personas';
  const setTab = (value) => navigate(value === 'personas' ? '/equipo' : `/equipo?tab=${value}`, { replace: true });
  const changed = () => { loadTeam(); people.reload(); };

  const reset = async (m) => {
    if (!(await confirm({ title: 'Nueva contraseña temporal', message: `Se genera una contraseña temporal para ${m.name} y se cierran sus sesiones abiertas.`, confirmLabel: 'Generar' }))) return;
    const res = await run(() => api(`/api/users/${m.id}/reset-password`, { method: 'POST' }));
    if (res) setTemp({ name: m.name, email: m.email, phone: m.phone, password: res.temporary_password });
  };
  const toggle = async (m) => {
    if (m.active && !(await confirm({ title: `Desactivar a ${m.name}`, message: 'Pierde el acceso de inmediato. Su historial se conserva.', confirmLabel: 'Desactivar', tone: 'danger' }))) return;
    if (await run(() => api(`/api/users/${m.id}`, { method: 'PATCH', body: { active: !m.active } }), { success: m.active ? 'Acceso desactivado' : 'Acceso reactivado' })) changed();
  };
  const actions = { busy, onEdit: setEditing, onReset: reset, onToggle: toggle };

  const tabs = Object.entries(TABS).filter(([value]) => value !== 'ajustes' || isAdmin).map(([value, label]) => ({ value, label }));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Quiénes somos" title="Equipo" icon={Users} tone="teal" subtitle="Quién hace qué, en qué servicios está y cuánta carga tiene. Tocá una persona para ver su ficha."
        actions={isAdmin && tab === 'personas' && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><UserPlus className="h-4 w-4" />Agregar persona</button>} />

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

      {tab === 'ajustes' && isAdmin && <div className="max-w-3xl"><SettingsCard key={JSON.stringify(settings)} /></div>}

      {editing && <MemberModal member={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSaved={(res, form) => { changed(); if (res.temporary_password) setTemp({ name: res.user.name, email: res.user.email, phone: form.phone, password: res.temporary_password }); }} />}
      {temp && <TempPassword result={temp} onClose={() => setTemp(null)} />}
    </div>
  );
}
