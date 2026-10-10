// Equipo (personas y roles), mi perfil, contraseña y ajustes operativos (tipo de cambio, SLA, WIP, respaldo).
import { useState } from 'react';
import { UserPlus, KeyRound, Copy, ShieldCheck, Save, DatabaseBackup, Power, MessageCircle } from 'lucide-react';
import { useSession } from '../lib/session.jsx';
import { api } from '../lib/api.js';
import { PageHeader, Modal, Field, Select, Avatar, Badge, useAction, useToast, cx } from '../components/ui.jsx';
import { PasswordForm } from './Login.jsx';
import { ROLES, MEMBER_COLORS } from '../../shared/catalog.js';
import { timeAgo, whatsappLink } from '../lib/format.js';

const roleOptions = Object.entries(ROLES).map(([value, v]) => ({ value, label: v.label }));

function TempPassword({ result, onClose }) {
  const toast = useToast();
  const text = `Hola ${result.name.split(' ')[0]}, este es tu acceso al portal de JC Analytics:\n${window.location.origin}\nCorreo: ${result.email}\nContraseña temporal: ${result.password}\nTe pedirá cambiarla al entrar.`;
  const wa = whatsappLink(result.phone, text);
  return (
    <Modal open onClose={onClose} title="Contraseña temporal" size="sm" footer={<button type="button" className="btn btn-primary" onClick={onClose}>Listo</button>}>
      <p className="text-sm text-muted">Compartila por un canal privado. Solo se muestra esta vez; la persona deberá cambiarla al ingresar.</p>
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-ink p-4 font-mono text-lg font-semibold tracking-wider text-white">
        <span className="flex-1 select-all">{result.password}</span>
        <button type="button" className="rounded-lg p-2 hover:bg-white/10" aria-label="Copiar" onClick={() => navigator.clipboard?.writeText(result.password).then(() => toast('Copiada'))}><Copy className="h-4 w-4" /></button>
      </div>
      {wa && <a className="btn btn-outline mt-3 w-full" href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Enviar acceso por WhatsApp</a>}
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
          <div className="flex flex-wrap gap-2">{MEMBER_COLORS.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => set('color')(c)} className={cx('h-8 w-8 rounded-full ring-offset-2 transition', form.color === c && 'ring-2 ring-ink')} style={{ background: c }} />)}</div>
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
    <section className="card card-pad" aria-labelledby="settings-title">
      <h2 id="settings-title" className="section-title">Ajustes operativos</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de cambio (₡ por US$)" hint="Referencia BCCR para movimientos nuevos en dólares.">{(id) => <input id={id} className="input tabular" inputMode="decimal" value={form.fx_usd_crc ?? ''} onChange={set('fx_usd_crc')} />}</Field>
        <Field label="Avance al cliente cada (horas)" hint="Compromiso público: 72 h.">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.update_sla_hours ?? ''} onChange={set('update_sla_hours')} />}</Field>
        <Field label="Límite WIP · En progreso">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.wip_en_progreso ?? ''} onChange={set('wip_en_progreso')} />}</Field>
        <Field label="Límite WIP · Revisión">{(id) => <input id={id} className="input tabular" inputMode="numeric" value={form.wip_revision ?? ''} onChange={set('wip_revision')} />}</Field>
        <div className="sm:col-span-2"><button type="submit" className="btn btn-primary" disabled={busy}><Save className="h-4 w-4" />Guardar ajustes</button></div>
      </form>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="flex items-center gap-2 text-sm font-semibold"><DatabaseBackup className="h-4 w-4" />Respaldo de la base</p><p className="text-xs text-muted">Descargá una copia completa (SQLite). Recomendado: semanal y antes de cada cambio grande.</p></div>
        <a className="btn btn-dark" href="/api/admin/backup" download>Descargar respaldo</a>
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
    <section className="card card-pad" aria-labelledby="profile-title">
      <h2 id="profile-title" className="section-title">Mi perfil</h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div className="flex items-center gap-3"><Avatar name={form.name} color={form.color} size={44} /><div><p className="font-semibold">{user.email}</p><p className="text-xs text-muted">{ROLES[user.role].label}</p></div></div>
        <Field label="Nombre">{(id) => <input id={id} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="WhatsApp">{(id) => <input id={id} className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
        <div className="flex flex-wrap gap-2">{MEMBER_COLORS.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={form.color === c} onClick={() => setForm({ ...form, color: c })} className={cx('h-7 w-7 rounded-full ring-offset-2', form.color === c && 'ring-2 ring-ink')} style={{ background: c }} />)}</div>
        <button type="submit" className="btn btn-outline" disabled={busy}><Save className="h-4 w-4" />Guardar perfil</button>
      </form>
      <div className="mt-6 border-t border-line pt-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-teal-dark" />Cambiar contraseña</h3>
        <PasswordForm />
      </div>
    </section>
  );
}

export default function Team() {
  const { user, team, isAdmin, loadTeam } = useSession();
  const [editing, setEditing] = useState(null);
  const [temp, setTemp] = useState(null);
  const [run, busy] = useAction();

  const reset = async (m) => {
    if (!window.confirm(`¿Generar una contraseña temporal para ${m.name}? Se cerrarán sus sesiones abiertas.`)) return;
    const res = await run(() => api(`/api/users/${m.id}/reset-password`, { method: 'POST' }));
    if (res) setTemp({ name: m.name, email: m.email, phone: m.phone, password: res.temporary_password });
  };
  const toggle = async (m) => {
    if (m.active && !window.confirm(`¿Desactivar a ${m.name}? Perderá el acceso de inmediato; su historial se conserva.`)) return;
    if (await run(() => api(`/api/users/${m.id}`, { method: 'PATCH', body: { active: !m.active } }), { success: m.active ? 'Acceso desactivado' : 'Acceso reactivado' })) loadTeam();
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Equipo y ajustes" title="Equipo" subtitle="Personas con acceso al portal y su rol. Los colaboradores no ven inversiones."
        actions={isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><UserPlus className="h-4 w-4" />Agregar persona</button>} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Personas">
        {team.map((m) => (
          <article key={m.id} className={cx('card flex flex-col gap-3 p-4', !m.active && 'opacity-60')}>
            <div className="flex items-center gap-3">
              <Avatar name={m.name} color={m.color} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.name}{m.id === user.id && <span className="ml-1.5 text-xs font-normal text-muted">(vos)</span>}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <Badge tone={m.role === 'admin' ? 'ink' : m.role === 'socio' ? 'blue' : 'slate'}>{ROLES[m.role].label}</Badge>
            </div>
            <p className="text-xs text-muted">{!m.active ? 'Acceso desactivado' : m.last_login_at ? `Último ingreso ${timeAgo(m.last_login_at)}` : 'Aún no ingresa'}{m.must_change_password && m.active ? ' · contraseña temporal pendiente' : ''}</p>
            {isAdmin && (
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(m)}>Editar</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => reset(m)} disabled={busy}><KeyRound className="h-3.5 w-3.5" />Contraseña</button>
                {m.id !== user.id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(m)} disabled={busy}><Power className="h-3.5 w-3.5" />{m.active ? 'Desactivar' : 'Reactivar'}</button>}
              </div>
            )}
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard />
        {isAdmin && <SettingsCard />}
      </div>

      {editing && <MemberModal member={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSaved={(res, form) => { loadTeam(); if (res.temporary_password) setTemp({ name: res.user.name, email: res.user.email, phone: form.phone, password: res.temporary_password }); }} />}
      {temp && <TempPassword result={temp} onClose={() => setTemp(null)} />}
    </div>
  );
}
