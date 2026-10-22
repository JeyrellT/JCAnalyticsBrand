// Mi cuenta (inversionista): datos de contacto, contraseña, sesión, apariencia y quién ve
// qué de su información.
import { useState } from 'react';
import { LogOut, Lock, Eye, EyeOff, ShieldCheck, Clock3 } from 'lucide-react';
import { useSession } from '../../lib/session.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, SectionHead, Field, ThemePicker, useAction, useToast } from '../../components/ui.jsx';
import { formatDateTime } from '../../lib/format.js';
import { PasswordForm } from '../../pages/Login.jsx';

function ProfileForm() {
  const { user, refresh } = useSession();
  const [run, busy] = useAction();
  const [form, setForm] = useState({ name: user.name ?? '', phone: user.phone ?? '' });
  const [errors, setErrors] = useState({});
  const dirty = form.name.trim() !== (user.name ?? '') || form.phone.trim() !== (user.phone ?? '');

  async function submit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) { setErrors({ name: 'Escribí tu nombre (al menos 2 caracteres).' }); return; }
    setErrors({});
    const res = await run(() => api('/api/investor/me', { method: 'PATCH', body: { name: form.name.trim(), phone: form.phone.trim() } }), {
      success: 'Guardamos tus datos.',
      onError: (err) => { if (err?.data?.field) setErrors({ [err.data.field]: err.data.message ?? 'Revisá este dato.' }); },
    });
    if (res) await refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4 sm:p-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.name}>
          {(id) => <input id={id} className="input" autoComplete="name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={errors.name ? true : undefined} />}
        </Field>
        <Field label="Teléfono" hint="Para que JC Analytics te ubique por WhatsApp si hace falta." error={errors.phone}>
          {(id) => <input id={id} className="input" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} placeholder="8888 8888" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}
        </Field>
      </div>
      <p className="text-sm text-ink-2">Correo de ingreso: <span className="break-all font-semibold text-ink">{user.email}</span>. Para cambiarlo, pedíselo a la administración de JC Analytics.</p>
      <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
    </form>
  );
}

const PRIVACY = [
  [EyeOff, 'Otros inversionistas no ven tu nombre, tus montos ni tu participación: solo los totales del grupo.'],
  [Eye, 'JC Analytics (socios y administración) ve tus datos de contacto, tus movimientos, tus mensajes y cuándo confirmaste u objetaste cada uno.'],
  [ShieldCheck, 'Queda un registro de seguridad de tus ingresos y de las descargas de tu estado de cuenta.'],
  [Clock3, 'Tu sesión se cierra tras 12 horas sin uso y, siempre, a los 7 días. Al cambiar tu contraseña cerramos tus otras sesiones.'],
  [Lock, 'Nunca te vamos a pedir tu contraseña por WhatsApp ni por correo.'],
];

export default function InvestorAccount() {
  const { user, logout } = useSession();
  const toast = useToast();

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Mi cuenta" subtitle="Tus datos, tu contraseña y quién ve tu información." />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <section className="card overflow-hidden" aria-labelledby="profile-title">
            <SectionHead flush id="profile-title" title="Tus datos" hint="Así te identifica JC Analytics." />
            <ProfileForm />
          </section>

          <section className="card overflow-hidden" aria-labelledby="password-title">
            <SectionHead flush id="password-title" title="Contraseña" hint="Usá una que no repitás en otros sitios." />
            <div className="p-4 sm:p-5">
              <PasswordForm endpoint="/api/me/password" onDone={() => toast('Contraseña actualizada. Cerramos tus otras sesiones.')} />
            </div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="session-title">
            <SectionHead flush id="session-title" title="Sesión" />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0 text-sm">
                <p className="text-ink-2">Ingresaste como <span className="break-all font-semibold text-ink">{user.email}</span>.</p>
                {user.last_login_at && <p className="mt-0.5 text-muted">Inicio de esta sesión: <span className="first-letter:uppercase">{formatDateTime(user.last_login_at)}</span></p>}
              </div>
              <button type="button" onClick={logout} className="btn btn-outline tap shrink-0 text-coral-ink"><LogOut className="h-4 w-4" aria-hidden="true" />Cerrar sesión</button>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 sm:space-y-6" aria-label="Apariencia y privacidad">
          <section className="card overflow-hidden" aria-labelledby="theme-title">
            <SectionHead flush id="theme-title" title="Apariencia" hint="Claro, oscuro o como tu dispositivo." />
            <div className="p-4 sm:p-5"><ThemePicker /></div>
          </section>

          <section className="card overflow-hidden" aria-labelledby="privacy-title">
            <SectionHead flush id="privacy-title" title="Privacidad y seguridad" />
            <ul className="space-y-3 p-4 sm:p-5">
              {PRIVACY.map(([Icon, text]) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-ink-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{text}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
