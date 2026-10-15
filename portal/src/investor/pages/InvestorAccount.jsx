// Mi cuenta (inversionista): datos de contacto, contraseña, sesión, apariencia y qué ve
// cada quien de su información.
import { useState } from 'react';
import { UserRound, KeyRound, ShieldCheck, LogOut, Palette, Mail, Clock3, Lock, EyeOff, Eye, Building2, BadgeCheck } from 'lucide-react';
import { useSession } from '../../lib/session.jsx';
import { api } from '../../lib/api.js';
import { PageHeader, SectionHead, Field, ThemePicker, IconTile, useAction, useToast } from '../../components/ui.jsx';
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
      <dl className="grid gap-3 rounded-xl bg-surface-2 p-3.5 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Correo de ingreso</dt>
          <dd className="mt-0.5 break-all font-medium text-ink">{user.email}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />Tipo de cuenta</dt>
          <dd className="mt-0.5 font-medium text-ink">Inversionista de JC Analytics</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">Para cambiar el correo de ingreso, pedíselo a la administración de JC Analytics.</p>
      <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
    </form>
  );
}

const JC_SEES = [
  'Tus datos de contacto: nombre, correo y teléfono.',
  'Tus aportes, retornos, mensajes y cuándo confirmaste u objetaste cada uno.',
  'Un registro de seguridad de tus ingresos y descargas del estado de cuenta.',
];
const OTHERS_DONT = [
  'Otros inversionistas no ven tu nombre, tus montos ni tu participación.',
  'Cada quien ve solo los totales del grupo: cuánto capital hay y cuántas personas participan.',
  'Tus mensajes sobre cada movimiento quedan entre vos y JC Analytics.',
];
const SECURITY = [
  [Clock3, 'Tu sesión se cierra sola tras 12 horas sin uso y, siempre, a los 7 días.'],
  [Lock, 'Al cambiar tu contraseña cerramos tus otras sesiones abiertas.'],
  [ShieldCheck, 'Nunca te vamos a pedir tu contraseña por WhatsApp ni por correo.'],
];

export default function InvestorAccount() {
  const { user, logout } = useSession();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Portal de inversionistas" title="Mi cuenta" icon={UserRound} tone="blue" subtitle="Tus datos, tu contraseña y quién ve qué de tu información." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="card animate-rise overflow-hidden" aria-labelledby="profile-title">
            <SectionHead flush id="profile-title" icon={UserRound} tone="blue" title="Tus datos" hint="Así te identifica JC Analytics" />
            <ProfileForm />
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="password-title">
            <SectionHead flush id="password-title" icon={KeyRound} tone="violet" title="Contraseña" hint="Usá una que no repitás en otros sitios" />
            <div className="p-4 sm:p-5">
              <PasswordForm endpoint="/api/me/password" onDone={() => toast('Contraseña actualizada. Cerramos tus otras sesiones.')} />
              <p className="mt-3 text-xs text-muted">Evitá palabras comunes o contraseñas conocidas (como «password2026» o «123456»): el portal las rechaza.</p>
            </div>
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="session-title">
            <SectionHead flush id="session-title" icon={Clock3} tone="slate" title="Sesión" />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0 text-sm">
                <p className="text-ink-2">Ingresaste como <span className="break-all font-semibold text-ink">{user.email}</span>.</p>
                {user.last_login_at && <p className="mt-0.5 text-muted">Inicio de esta sesión: <span className="first-letter:uppercase">{formatDateTime(user.last_login_at)}</span></p>}
              </div>
              <button type="button" onClick={logout} className="btn btn-outline tap shrink-0 text-coral-ink"><LogOut className="h-4 w-4" aria-hidden="true" />Cerrar sesión</button>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Privacidad y apariencia">
          <section className="card animate-rise overflow-hidden" aria-labelledby="privacy-title">
            <SectionHead flush id="privacy-title" icon={ShieldCheck} tone="teal" title="Tu privacidad" hint="Quién ve qué de tu inversión" />
            <div className="space-y-5 p-4 sm:p-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Building2 className="h-4 w-4 text-brand-ink" aria-hidden="true" />Lo que ve JC Analytics (socios y administración)</h3>
                <ul className="mt-2 space-y-2">
                  {JC_SEES.map((t) => <li key={t} className="flex items-start gap-2.5 text-sm text-ink-2"><Eye className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{t}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><EyeOff className="h-4 w-4 text-teal-ink" aria-hidden="true" />Lo que nadie más ve</h3>
                <ul className="mt-2 space-y-2">
                  {OTHERS_DONT.map((t) => <li key={t} className="flex items-start gap-2.5 text-sm text-ink-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" />{t}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section className="card animate-rise overflow-hidden" aria-labelledby="theme-title">
            <SectionHead flush id="theme-title" icon={Palette} tone="teal" title="Apariencia" hint="Claro, oscuro o como tu dispositivo" />
            <div className="p-4 sm:p-5"><ThemePicker /></div>
          </section>

          <section className="card-sunken animate-rise p-4 sm:p-5" aria-labelledby="security-title">
            <div className="flex items-center gap-3">
              <IconTile icon={Lock} tone="slate" size="sm" />
              <h2 id="security-title" className="section-title">Seguridad de tu cuenta</h2>
            </div>
            <ul className="mt-4 space-y-3">
              {SECURITY.map(([Icon, text]) => (
                <li key={text} className="flex items-start gap-3 text-sm text-ink-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" />{text}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
