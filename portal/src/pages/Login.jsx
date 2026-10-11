// Ingreso y cambio obligatorio de contraseña temporal.
// En la demo del navegador (isDemo()) el ingreso es un selector de personas.
import { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, KanbanSquare, CalendarDays, TrendingUp, FlaskConical, Loader2 } from 'lucide-react';
import { api, errorMessage, isDemo, demoInfo } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { navigate } from '../lib/router.jsx';
import { ROLES } from '../../shared/catalog.js';
import { Field, Avatar, cx } from '../components/ui.jsx';
import logoMark from '../assets/logo-mark.webp';

function Shell({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-teal/25 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={logoMark} alt="" className="h-11 w-11 rounded-xl bg-white p-1" />
          <span className="font-display text-xl font-bold">JC Analytics</span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">Portal privado del equipo</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight">Proyectos, operación e inversiones en un solo lugar.</h1>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li className="flex items-center gap-3"><KanbanSquare className="h-4 w-4 text-teal" /> Tablero kanban y avances a clientes cada 72 h.</li>
            <li className="flex items-center gap-3"><CalendarDays className="h-4 w-4 text-teal" /> Agenda de citas con detección de choques.</li>
            <li className="flex items-center gap-3"><TrendingUp className="h-4 w-4 text-teal" /> Aportes y retornos de socios con confirmación y mensaje de vuelta.</li>
          </ul>
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-10" style={{ paddingTop: 'max(2.5rem, calc(env(safe-area-inset-top) + 1rem))' }}>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logoMark} alt="" className="h-10 w-10 rounded-xl bg-white p-1 shadow-sm" />
            <span className="font-display text-lg font-bold">Portal JC Analytics</span>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

export function Login() {
  return isDemo() ? <DemoLogin /> : <PasswordLogin />;
}

function PasswordLogin() {
  const { signedIn } = useSession();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: form });
      signedIn(user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h2 className="font-display text-2xl font-bold">Ingresar</h2>
      <p className="mt-1 text-sm text-muted">Usá el correo y la contraseña que te dio el administrador.</p>
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Field label="Correo">{(id) => <input id={id} className="input" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
        <Field label="Contraseña">{(id) => <input id={id} className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy || !form.email || !form.password}>
          {busy ? 'Verificando…' : <>Entrar <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-8 flex items-start gap-2 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Acceso solo para el equipo. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.</p>
    </Shell>
  );
}

/** Qué ve cada rol en la demo (una línea por persona). */
const DEMO_SCOPE = {
  admin: 'Ve todo: operaciones, inversiones y ajustes del equipo.',
  socio: 'Operaciones del equipo e inversiones de socios.',
  colaborador: 'Operaciones del equipo, sin acceso a inversiones.',
};

function DemoLogin() {
  const { signedIn } = useSession();
  const { personas, password } = demoInfo();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  async function enter(persona) {
    setBusy(persona.email);
    setError('');
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: { email: persona.email, password } });
      navigate('/', { replace: true });
      signedIn(user);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  return (
    <Shell>
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Demo con datos ficticios · los cambios se pierden al recargar</span>
      </p>
      <h2 className="mt-6 font-display text-2xl font-bold">¿Con quién querés entrar?</h2>
      <p className="mt-1 text-sm text-muted">Elegí una persona del equipo para recorrer el portal con sus permisos. Podés cambiar de persona cuando quieras.</p>
      <ul className="mt-6 space-y-2.5" aria-label="Personas de la demo">
        {personas.map((p) => (
          <li key={p.email}>
            <button
              type="button"
              onClick={() => enter(p)}
              disabled={busy !== null}
              className="card flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40 hover:shadow-md active:scale-[0.99] disabled:opacity-60"
            >
              <Avatar name={p.name} color={p.color} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-brand">{ROLES[p.role]?.label ?? p.role}</span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{DEMO_SCOPE[p.role] ?? ROLES[p.role]?.hint}</span>
              </span>
              {busy === p.email ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" /> : <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-4 rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral">{error}</p>}
      <p className="mt-6 text-xs text-muted">Todo corre dentro de esta página: nada se envía ni se guarda en el portal real.</p>
    </Shell>
  );
}

export function PasswordForm({ forced = false, onDone }) {
  const { refresh, logout } = useSession();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = form.confirm && form.confirm !== form.new_password;
  const checks = [
    { ok: form.new_password.length >= 10, text: '10 caracteres o más' },
    { ok: /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(form.new_password) && /\d/.test(form.new_password), text: 'Letras y al menos un número' },
  ];

  async function submit(e) {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/me/password', { method: 'POST', body: { current_password: form.current_password, new_password: form.new_password } });
      await refresh();
      setForm({ current_password: '', new_password: '', confirm: '' });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={forced ? 'Contraseña temporal' : 'Contraseña actual'}>{(id) => <input id={id} className="input" type="password" autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />}</Field>
      <Field label="Nueva contraseña">{(id) => <input id={id} className="input" type="password" autoComplete="new-password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />}</Field>
      <ul className="space-y-1 text-xs">
        {checks.map((c) => <li key={c.text} className={cx('flex items-center gap-1.5', c.ok ? 'text-teal-dark' : 'text-muted')}><ShieldCheck className="h-3.5 w-3.5" />{c.text}</li>)}
      </ul>
      <Field label="Repetir nueva contraseña" error={mismatch ? 'Las contraseñas no coinciden.' : null}>{(id) => <input id={id} className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}</Field>
      {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy || !checks.every((c) => c.ok) || mismatch || !form.confirm || !form.current_password}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
        {forced && <button type="button" className="btn btn-ghost" onClick={logout}>Salir</button>}
      </div>
    </form>
  );
}

export function ForcePasswordChange() {
  const { user } = useSession();
  return (
    <Shell>
      <h2 className="font-display text-2xl font-bold">Hola, {user.name.split(' ')[0]}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Antes de entrar, cambiá la contraseña temporal por una que solo vos conozcas.</p>
      <PasswordForm forced />
    </Shell>
  );
}
