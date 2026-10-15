// Mi cuenta (cliente): perfil, contraseña, sesión, tema, contacto del ejecutivo y cómo cuidamos su información.
import { useState } from 'react';
import { UserRound, KeyRound, ShieldCheck, LogOut, Palette, Building2, Mail, BadgeCheck, Lock, Clock3, EyeOff, Users } from 'lucide-react';
import { useSession } from '../../lib/session.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, SectionHead, Field, ThemePicker, IconTile, useAction, useToast, cx } from '../../components/ui.jsx';
import { formatDateTime } from '../../lib/format.js';
import { PasswordForm } from '../../pages/Login.jsx';
import { ContactCard } from '../components.jsx';

function ProfileForm() {
  const { account, client, refresh } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState({ name: account.name ?? '', phone: account.phone ?? '' });
  const [nameError, setNameError] = useState('');
  const dirty = form.name.trim() !== (account.name ?? '') || form.phone.trim() !== (account.phone ?? '');

  async function submit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) { setNameError('Escribí tu nombre (al menos 2 caracteres).'); return; }
    setNameError('');
    const res = await run(() => api('/api/client/me', { method: 'PATCH', body: { name: form.name.trim(), phone: form.phone.trim() } }), {
      success: 'Guardamos tus datos.',
      onError: (err) => { if (err?.data?.field === 'name') setNameError(err.data.message ?? 'Revisá el nombre.'); },
    });
    if (res) await refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4 sm:p-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={nameError}>
          {(id) => <input id={id} className="input" autoComplete="name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={nameError ? true : undefined} />}
        </Field>
        <Field label="Teléfono" hint="Para que el equipo te ubique si hace falta.">
          {(id) => <input id={id} className="input" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} placeholder="8888 8888" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
        </Field>
      </div>
      <dl className="grid gap-3 rounded-xl bg-surface-2 p-3.5 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Correo de ingreso</dt>
          <dd className="mt-0.5 break-all font-medium text-ink">{account.email}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Building2 className="h-3.5 w-3.5" aria-hidden="true" />Empresa</dt>
          <dd className="mt-0.5 font-medium text-ink">{client?.name}</dd>
          {account.title && <dd className="text-xs text-muted">{account.title}</dd>}
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />Aprobación de entregables</dt>
          <dd className={cx('mt-0.5 font-medium', account.can_approve ? 'text-teal-ink' : 'text-ink')}>{account.can_approve ? 'Podés aprobar' : 'Solo consulta'}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">El correo y los permisos los administra tu ejecutivo de cuenta.</p>
      <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
    </form>
  );
}

const PRIVACY = [
  [Users, 'Solo las personas de tu empresa con acceso ven este portal. Nadie más.'],
  [EyeOff, 'Ves el avance de tu servicio, nunca datos de otros clientes.'],
  [Clock3, 'Tu sesión se cierra sola tras 8 horas sin uso y, siempre, a los 3 días.'],
  [Lock, 'Al cambiar tu contraseña cerramos tus otras sesiones abiertas.'],
  [ShieldCheck, 'Nunca te vamos a pedir tu contraseña por WhatsApp ni por correo.'],
];

export default function ClientAccount() {
  const { account, client, contact, logout } = useSession();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={client?.name} title="Mi cuenta" icon={UserRound} tone="blue" subtitle="Tus datos, tu contraseña y cómo cuidamos tu información." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card animate-rise overflow-hidden" aria-labelledby="profile-title">
            <SectionHead flush id="profile-title" icon={UserRound} tone="blue" title="Tus datos" hint="Así te ve el equipo de JC Analytics" />
            <ProfileForm />
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="password-title">
            <SectionHead flush id="password-title" icon={KeyRound} tone="violet" title="Contraseña" hint="Usá una que no repitás en otros sitios" />
            <div className="p-4 sm:p-5">
              <PasswordForm endpoint="/api/client/me/password" onDone={() => toast('Contraseña actualizada. Cerramos tus otras sesiones.')} />
            </div>
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="session-title">
            <SectionHead flush id="session-title" icon={Clock3} tone="slate" title="Sesión" />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0 text-sm">
                <p className="text-ink-2">Ingresaste como <span className="font-semibold text-ink">{account.email}</span>.</p>
                {account.last_login_at && <p className="mt-0.5 text-muted">Inicio de esta sesión: <span className="first-letter:uppercase">{formatDateTime(account.last_login_at)}</span></p>}
              </div>
              <button type="button" onClick={logout} className="btn btn-outline tap shrink-0 text-coral-ink"><LogOut className="h-4 w-4" />Cerrar sesión</button>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Contacto, apariencia y privacidad">
          <ContactCard contact={contact} clientName={client?.name} className="animate-rise" />

          <section className="card animate-rise overflow-hidden" aria-labelledby="theme-title">
            <SectionHead flush id="theme-title" icon={Palette} tone="teal" title="Apariencia" hint="Claro, oscuro o como tu dispositivo" />
            <div className="p-4 sm:p-5"><ThemePicker /></div>
          </section>

          <section className="card-sunken animate-rise p-4 sm:p-5" aria-labelledby="privacy-title">
            <div className="flex items-center gap-3">
              <IconTile icon={ShieldCheck} tone="teal" size="sm" />
              <h2 id="privacy-title" className="section-title">Tu información está protegida</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {PRIVACY.map(([Icon, text]) => (
                <li key={text} className="flex items-start gap-3 text-sm text-ink-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" />{text}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
