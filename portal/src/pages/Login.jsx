// Ingreso y cambio obligatorio de contraseña temporal.
// Escritorio: panel "tinta" con un collage del producto a la izquierda y el formulario en tarjeta a la derecha.
// Celular: cabecera tinta con la marca y el formulario en una hoja clara.
// En la demo del navegador (isDemo()) el ingreso es un selector de personas.
import { useState } from 'react';
import {
  Lock, ShieldCheck, ArrowRight, KanbanSquare, CalendarDays, TrendingUp, FlaskConical, Loader2, Mail, Eye, EyeOff,
  CheckCircle2, Clock3, Sparkles,
} from 'lucide-react';
import { api, errorMessage, isDemo, demoInfo } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { navigate } from '../lib/router.jsx';
import { ROLES } from '../../shared/catalog.js';
import { Field, Avatar, ThemeToggle, cx } from '../components/ui.jsx';
import logoMark from '../assets/logo-mark.webp';

/** Collage decorativo: tres tarjetas del producto flotando sobre el panel tinta. */
function ProductCollage() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px]" aria-hidden="true">
      {/* Tarea en el tablero */}
      <div className="animate-float absolute left-0 top-14 w-[250px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '-4deg', animationDelay: '0s' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="chip bg-amber/20 text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber" />En progreso</span>
          <span className="text-[10px] font-semibold text-white/50">Tablero</span>
        </div>
        <p className="text-[13.5px] font-semibold leading-snug text-white">Panel de pedidos para cocina (fase 2)</p>
        <p className="mt-1 text-[11.5px] text-white/55">Pedidos en línea La Burrada</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="chip bg-white/10 text-white/80"><Clock3 className="h-3 w-3" />En 4 días</span>
          <Avatar name="Alex Benedict" color="#7a5af5" size={22} />
        </div>
      </div>
      {/* Cita */}
      <div className="animate-float absolute right-0 top-0 w-[236px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '3deg', animationDelay: '1.2s' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-violet/25 text-white">
            <span className="text-[9px] font-bold uppercase leading-none text-violet-200">jue</span>
            <span className="font-display text-lg font-bold leading-none">15</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">Demo del panel de cocina</p>
            <p className="text-[11.5px] text-white/55">10:00 a.m. · Demo · La Burrada</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-teal/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-teal-200">
          <CheckCircle2 className="h-3.5 w-3.5" />Confirmada por el cliente
        </div>
      </div>
      {/* Retorno con mensaje de vuelta */}
      <div className="animate-float absolute bottom-0 left-1/2 w-[282px] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/[0.09] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '1.5deg', animationDelay: '0.6s' }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/20 text-teal-200"><TrendingUp className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold leading-none text-white tabular-nums">₡38 000</p>
            <p className="mt-1 truncate text-[11.5px] text-white/55">retorno a Jeyrell · BarberXCR</p>
          </div>
          <span className="chip bg-teal/20 text-teal-200"><CheckCircle2 className="h-3 w-3" />Confirmado</span>
        </div>
        <p className="mt-3 rounded-xl rounded-tl-sm bg-white/[0.08] px-3 py-2 text-[12px] leading-snug text-white/80">“Recibido, gracias. Queda en la cuenta de pauta.”</p>
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.08fr_1fr]">
      {/* Panel de marca (escritorio) */}
      <section className="shell-panel relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="grid-dots-light absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-teal/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-raised"><img src={logoMark} alt="" className="h-8 w-8 object-contain" /></span>
          <span className="font-display text-xl font-bold">JC Analytics</span>
        </div>
        <div className="relative my-auto py-10"><ProductCollage /></div>
        <div className="relative max-w-lg">
          <p className="eyebrow !text-teal">Portal privado del equipo</p>
          <h1 className="mt-3 font-display text-[38px] font-bold leading-[1.08]">Proyectos, operación e inversiones en un solo lugar.</h1>
          <ul className="mt-7 space-y-2.5 text-sm text-white/70">
            <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-teal"><KanbanSquare className="h-4 w-4" /></span>Tablero kanban y avances a clientes cada 72 h.</li>
            <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-teal"><CalendarDays className="h-4 w-4" /></span>Agenda de citas con detección de choques.</li>
            <li className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-teal"><TrendingUp className="h-4 w-4" /></span>Aportes y retornos de socios con confirmación y mensaje de vuelta.</li>
          </ul>
        </div>
      </section>

      {/* Formulario */}
      <section className="relative flex flex-col lg:items-center lg:justify-center lg:px-8 lg:py-10">
        <div className="grid-dots absolute inset-0 hidden opacity-70 [mask-image:radial-gradient(70%_70%_at_50%_30%,black,transparent)] lg:block" aria-hidden="true" />
        {/* Cabecera tinta (celular) */}
        <div className="shell-panel relative overflow-hidden px-5 pb-16 text-white lg:hidden" style={{ paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top) + 1rem))' }}>
          <div className="grid-dots-light absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_80%_at_50%_0%,black,transparent)]" aria-hidden="true" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/40 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-raised"><img src={logoMark} alt="" className="h-7 w-7 object-contain" /></span>
              <span className="leading-tight">
                <span className="block font-display text-base font-bold">JC Analytics</span>
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-teal">Portal del equipo</span>
              </span>
            </div>
            <ThemeToggle light />
          </div>
          <p className="relative mt-7 max-w-[300px] font-display text-[24px] font-bold leading-tight">Proyectos, operación e inversiones en un solo lugar.</p>
        </div>
        <div className="relative -mt-8 w-full px-4 pb-10 lg:mt-0 lg:max-w-[440px] lg:px-0">
          <div className="card animate-pop rounded-3xl p-6 shadow-raised sm:p-8">{children}</div>
          <p className="mt-5 hidden items-center justify-center gap-2 text-xs text-muted lg:flex">
            <ShieldCheck className="h-3.5 w-3.5" />Sesión cifrada · solo el equipo de JC Analytics
          </p>
        </div>
        <div className="absolute right-5 top-5 hidden lg:block"><ThemeToggle /></div>
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
  const [show, setShow] = useState(false);

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
      <p className="eyebrow">Bienvenido</p>
      <h2 className="mt-1 font-display text-[26px] font-bold">Ingresar</h2>
      <p className="mt-1 text-sm text-muted">Usá el correo y la contraseña que te dio el administrador.</p>
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Field label="Correo">
          {(id) => (
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
              <input id={id} className="input pl-9" type="email" autoComplete="username" inputMode="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vos@jcanalytic.com" />
            </div>
          )}
        </Field>
        <Field label="Contraseña">
          {(id) => (
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
              <input id={id} className="input pl-9 pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink" aria-label={show ? 'Ocultar clave' : 'Ver clave'} aria-pressed={show}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </Field>
        {error && <p role="alert" className="animate-pop rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-ink">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy || !form.email || !form.password}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Verificando…</> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-6 flex items-start gap-2 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Acceso solo para el equipo. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.</p>
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
      <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-3 py-2.5 text-sm font-semibold text-amber-ink ring-1 ring-amber/30">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Demo con datos ficticios · los cambios se pierden al recargar</span>
      </p>
      <h2 className="mt-6 font-display text-[24px] font-bold">¿Con quién querés entrar?</h2>
      <p className="mt-1 text-sm text-muted">Elegí una persona del equipo para recorrer el portal con sus permisos. Podés cambiar de persona cuando quieras.</p>
      <ul className="stagger mt-5 space-y-2" aria-label="Personas de la demo">
        {personas.map((p) => (
          <li key={p.email}>
            <button
              type="button"
              onClick={() => enter(p)}
              disabled={busy !== null}
              className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-left transition hover:border-brand/40 hover:bg-surface hover:shadow-raised active:scale-[0.99] disabled:opacity-60"
            >
              <Avatar name={p.name} color={p.color} size={42} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className="text-[10.5px] font-bold uppercase tracking-wide text-brand-ink">{ROLES[p.role]?.label ?? p.role}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{DEMO_SCOPE[p.role] ?? ROLES[p.role]?.hint}</span>
              </span>
              {busy === p.email ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" /> : <ArrowRight className="h-5 w-5 shrink-0 text-muted-2 transition group-hover:translate-x-0.5 group-hover:text-brand" />}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-4 rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-ink">{error}</p>}
      <p className="mt-5 flex items-start gap-2 text-xs text-muted"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />Todo corre dentro de esta página: nada se envía ni se guarda en el portal real.</p>
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
        {checks.map((c) => <li key={c.text} className={cx('flex items-center gap-1.5 transition', c.ok ? 'text-teal-ink' : 'text-muted')}><ShieldCheck className="h-3.5 w-3.5" />{c.text}</li>)}
      </ul>
      <Field label="Repetir nueva contraseña" error={mismatch ? 'Las contraseñas no coinciden.' : null}>{(id) => <input id={id} className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}</Field>
      {error && <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-ink">{error}</p>}
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
      <p className="eyebrow">Primer ingreso</p>
      <h2 className="mt-1 font-display text-[26px] font-bold">Hola, {user.name.split(' ')[0]}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">Antes de entrar, cambiá la contraseña temporal por una que solo vos conozcas.</p>
      <PasswordForm forced />
    </Shell>
  );
}
