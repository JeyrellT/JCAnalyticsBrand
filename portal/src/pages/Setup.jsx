// v6 · Configuración inicial del dueño (primer ingreso).
// Con la base vacía, App muestra esta pantalla en lugar del ingreso: el dueño escribe el código de un
// solo uso (PORTAL_SETUP_CODE en Railway o el que muestra el registro del servidor), sus datos y su
// contraseña, y queda como administrador. Apenas existe una persona, POST /api/setup se cierra para
// siempre (409 setup_done) y solo se entra con correo y contraseña.
// Después del alta, SetupWelcome (modal sobre el centro de operaciones) sugiere los primeros pasos.
import { useRef, useState } from 'react';
import {
  KeyRound, Crown, Users, UserPlus, Building2, SlidersHorizontal, ArrowRight, Loader2, Eye, EyeOff, Mail, Phone, UserRound, Lock,
  ShieldCheck, CheckCircle2, Circle, CircleX, ServerCog, RefreshCw, Clock3, AlertTriangle, Sparkles, Landmark, Rocket,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { Field, Modal, IconTile, Avatar, RowArrow, cx } from '../components/ui.jsx';
import { Shell } from './Login.jsx';
import { WEAK } from '../lib/password.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Campos que el servidor puede señalar con error de validación. */
const FIELDS = ['code', 'name', 'email', 'phone', 'password'];

const SETUP_COPY = {
  tag: 'Configuración inicial',
  eyebrow: 'Primer ingreso',
  title: 'Primero vos. Después, tu equipo.',
  points: [
    [KeyRound, 'Código de un solo uso: nadie más puede adueñarse del portal.'],
    [Crown, 'Quedás como administrador, con acceso a todo.'],
    [Users, 'Después sumás socios, colaboradores, inversionistas y clientes.'],
  ],
  footer: 'Esta pantalla aparece una sola vez',
};

/** Número de paso dentro de las tarjetas del panel. */
function StepDot({ n, active = false }) {
  return (
    <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', active ? 'bg-teal text-panel' : 'bg-white/10 text-white/70')}>{n}</span>
  );
}

/** Collage del panel: la hoja de ruta del portal en tres tarjetas (vos, tu equipo, tus clientes). */
function SetupArt() {
  const people = [['Catalina G', '#c0764f'], ['Alex B', '#8b5cf6'], ['Hillary P', '#ff5a00'], ['Ángel M', '#e8b32c']];
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px]" aria-hidden="true">
      {/* 1 · La cuenta del dueño */}
      <div className="animate-float absolute left-0 top-14 w-[222px] rounded-2xl border border-teal/40 bg-white/[0.09] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '-3deg', animationDelay: '0s' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white"><StepDot n={1} active />Tu cuenta</span>
          <span className="chip bg-teal/20 text-teal"><Sparkles className="h-3 w-3" />Ahora</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber/20 text-amber"><Crown className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug text-white">Administrador</p>
            <p className="text-[11.5px] text-white/55">Dueño · acceso total</p>
          </div>
        </div>
      </div>
      {/* 2 · Equipo e inversionistas */}
      <div className="animate-float absolute right-0 top-0 w-[228px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '3deg', animationDelay: '1.2s' }}>
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white"><StepDot n={2} />Tu equipo e inversionistas</span>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex shrink-0 -space-x-1.5">
            {people.map(([name, color]) => <Avatar key={name} name={name} color={color} size={28} className="ring-2 ring-panel" />)}
          </span>
          <span className="text-[11.5px] leading-snug text-white/55">Socios, colaboradores e inversionistas</span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/70"><Landmark className="h-3.5 w-3.5 text-teal" />Cada inversionista, con su propio portal</p>
      </div>
      {/* 3 · Clientes */}
      <div className="animate-float absolute bottom-0 left-1/2 w-[288px] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '1.5deg', animationDelay: '0.6s' }}>
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white"><StepDot n={3} />Tus clientes</span>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/30 text-white"><Building2 className="h-5 w-5" /></span>
          <p className="min-w-0 text-[11.5px] leading-snug text-white/60">Cada empresa ve sus avances, aprueba entregables y envía solicitudes desde su portal.</p>
        </div>
      </div>
    </div>
  );
}

/** Mensaje de error de un campo, enlazado con aria-describedby. */
export function FieldError({ id, text }) {
  if (!text) return null;
  return <p id={id} className="mt-1 text-xs font-medium text-coral-ink">{text}</p>;
}

/** Ícono a la izquierda de un input. */
export const InputIcon = ({ icon: Icon }) => <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />;

function SetupForm({ onDone, onPhase }) {
  const { signedIn } = useSession();
  const [form, setForm] = useState({ code: '', name: '', email: '', phone: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const refs = useRef({});

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((errs) => {
      if (!errs[key]) return errs;
      const next = { ...errs };
      delete next[key];
      return next;
    });
  };
  const bind = (key, id) => ({
    id,
    ref: (el) => { refs.current[key] = el; },
    value: form[key],
    onChange: set(key),
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  });

  const pw = form.password;
  const weak = pw.length > 0 && WEAK.test(pw);
  const checks = [
    { ok: pw.length >= 10, text: '10 caracteres o más' },
    { ok: /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(pw) && /\d/.test(pw), text: 'Letras y al menos un número' },
    { ok: pw.length > 0 && !weak, bad: weak, text: 'Nada fácil de adivinar: sin “password”, “123456” ni “jcanalytic”' },
  ];
  const mismatch = form.confirm.length > 0 && form.confirm !== pw;
  const emailOk = EMAIL.test(form.email.trim());
  const ready = form.code.trim().length > 0 && form.name.trim().length >= 2 && emailOk && checks.every((c) => c.ok) && form.confirm === pw;

  async function submit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setErrors({});
    setAlert(null);
    try {
      const { user } = await api('/api/setup', {
        method: 'POST',
        body: { code: form.code.trim(), name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, password: pw },
      });
      // La sesión ya quedó abierta (cookie): se entra directo al centro de operaciones.
      navigate('/', { replace: true });
      signedIn(user);
      onDone?.(user);
    } catch (err) {
      setBusy(false);
      const code = err?.data?.error;
      const field = err?.data?.field;
      if (code === 'validation' && FIELDS.includes(field)) {
        setErrors({ [field]: err.data.message ?? 'Revisá este dato.' });
        refs.current[field]?.focus();
      } else if (err?.status === 409 || code === 'setup_done') {
        onPhase('configured');
      } else if (err?.status === 503 || code === 'setup_unavailable') {
        onPhase('unavailable');
      } else if (err?.status === 429) {
        setAlert({ tone: 'amber', text: 'Demasiados intentos desde esta conexión. Esperá 15 minutos y volvé a probar con el código correcto.' });
      } else {
        setAlert({ tone: 'red', text: errorMessage(err) });
      }
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Primer ingreso · solo esta vez</p>
          <h2 className="mt-1 font-display text-[26px] font-bold leading-tight">Configurá tu portal</h2>
        </div>
        <IconTile icon={Rocket} tone="brand" size="lg" className="shadow-brand" />
      </div>
      <p className="mt-2 text-sm text-muted">Creá la cuenta del dueño. Después de este paso, al portal solo se entra con correo y contraseña.</p>

      <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
        <Field label="Código de configuración" hint={errors.code ? null : 'Está en la variable PORTAL_SETUP_CODE de Railway o en el registro del servidor.'}>
          {(id) => (
            <>
              <div className="relative">
                <InputIcon icon={KeyRound} />
                <input {...bind('code', id)} className="input pl-9 font-mono uppercase tracking-[0.12em] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal" autoComplete="one-time-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="Pegá o escribí el código de un solo uso" />
              </div>
              <FieldError id={`${id}-error`} text={errors.code} />
            </>
          )}
        </Field>

        <fieldset className="space-y-4">
          <legend className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink"><UserRound className="h-4 w-4 text-teal-ink" aria-hidden="true" />Tus datos</legend>
          <Field label="Nombre completo">
            {(id) => (
              <>
                <input {...bind('name', id)} className="input" autoComplete="name" placeholder="Tu nombre y apellido" />
                <FieldError id={`${id}-error`} text={errors.name} />
              </>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" hint={!errors.email && form.email && !emailOk ? 'Revisá el formato del correo.' : null}>
              {(id) => (
                <>
                  <div className="relative">
                    <InputIcon icon={Mail} />
                    <input {...bind('email', id)} className="input pl-9" type="email" inputMode="email" autoComplete="username" placeholder="vos@jcanalytic.com" />
                  </div>
                  <FieldError id={`${id}-error`} text={errors.email} />
                </>
              )}
            </Field>
            <Field label="Teléfono (opcional)" hint={errors.phone ? null : 'Para los avisos por WhatsApp.'}>
              {(id) => (
                <>
                  <div className="relative">
                    <InputIcon icon={Phone} />
                    <input {...bind('phone', id)} className="input pl-9" type="tel" inputMode="tel" autoComplete="tel" placeholder="8888-0000" />
                  </div>
                  <FieldError id={`${id}-error`} text={errors.phone} />
                </>
              )}
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink"><Lock className="h-4 w-4 text-teal-ink" aria-hidden="true" />Tu contraseña</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña">
              {(id) => (
                <>
                  <div className="relative">
                    <input {...bind('password', id)} className="input pr-11" type={show ? 'text' : 'password'} autoComplete="new-password" aria-describedby={errors.password ? `${id}-error` : 'setup-policy'} />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink" aria-label={show ? 'Ocultar contraseñas' : 'Ver contraseñas'} aria-pressed={show}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError id={`${id}-error`} text={errors.password} />
                </>
              )}
            </Field>
            <Field label="Confirmar contraseña">
              {(id) => (
                <>
                  <input id={id} className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={mismatch || undefined} aria-describedby={mismatch ? `${id}-error` : undefined} />
                  <FieldError id={`${id}-error`} text={mismatch ? 'Las contraseñas no coinciden.' : null} />
                </>
              )}
            </Field>
          </div>
          <ul id="setup-policy" className="grid gap-1.5 rounded-xl bg-surface-2 px-3.5 py-3 text-xs" aria-label="Requisitos de la contraseña">
            {checks.map((c) => {
              const Icon = c.ok ? CheckCircle2 : c.bad ? CircleX : Circle;
              return (
                <li key={c.text} className={cx('flex items-start gap-2 transition-colors', c.ok ? 'text-teal-ink' : c.bad ? 'font-medium text-coral-ink' : 'text-muted')}>
                  <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{c.text}<span className="sr-only">{c.ok ? ' (cumple)' : ' (pendiente)'}</span></span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand-soft p-4">
          <IconTile icon={Crown} tone="blue" size="sm" className="bg-surface" />
          <p className="min-w-0 text-sm leading-relaxed text-ink">
            <b className="font-semibold">Vas a quedar como administrador (dueño).</b>{' '}
            <span className="text-ink-2">Después agregás socios, colaboradores, inversionistas y clientes.</span>
          </p>
        </div>

        {alert && (
          <p role="alert" className={cx('animate-pop flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium', alert.tone === 'amber' ? 'bg-amber-soft text-amber-ink' : 'bg-coral-soft text-coral-ink')}>
            {alert.tone === 'amber' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{alert.text}</span>
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!ready || busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Configurando tu portal…</> : <>Crear mi cuenta y entrar <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-5 flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />El código sirve una sola vez. Tras 5 intentos fallidos, esta conexión espera 15 minutos.</p>
    </>
  );
}

/** El servidor no tiene un código válido: explica cómo darle uno. */
function Unavailable() {
  const steps = [
    <>En Railway, abrí el servicio del portal → <b className="font-semibold text-ink">Variables</b> y definí <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[12px] text-ink">PORTAL_SETUP_CODE</code> con un código de 8 caracteres o más.</>,
    <>O quitá esa variable: al arrancar, el servidor genera un código y lo muestra en el registro (<i>Deploy Logs</i>, “Configuración inicial pendiente”).</>,
    <>Volvé a desplegar el servicio y recargá esta página.</>,
  ];
  return (
    <>
      <IconTile icon={ServerCog} tone="amber" size="lg" />
      <p className="eyebrow mt-4">Configuración inicial</p>
      <h2 className="mt-1 font-display text-[26px] font-bold leading-tight">Falta el código de configuración</h2>
      <p className="mt-2 text-sm text-muted">Por seguridad, la cuenta del dueño se crea con un código de un solo uso que define el servidor. Este servidor todavía no tiene uno válido.</p>
      <ol className="mt-5 space-y-3">
        {steps.map((text, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-soft text-xs font-bold text-amber-ink">{i + 1}</span>
            <span className="min-w-0 pt-0.5 leading-relaxed">{text}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-primary btn-lg mt-6 w-full" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />Ya lo configuré, recargar</button>
    </>
  );
}

/** Alguien ya creó la cuenta del dueño (otra pestaña u otra persona). */
function AlreadyConfigured({ onConfigured }) {
  return (
    <>
      <IconTile icon={CheckCircle2} tone="teal" size="lg" />
      <p className="eyebrow mt-4">Configuración inicial</p>
      <h2 className="mt-1 font-display text-[26px] font-bold leading-tight">El portal ya está configurado</h2>
      <p className="mt-2 text-sm text-muted">La cuenta del dueño ya existe. Desde ahora se entra solo con correo y contraseña.</p>
      <button type="button" className="btn btn-primary btn-lg mt-6 w-full" onClick={onConfigured}>Ir al ingreso <ArrowRight className="h-4 w-4" /></button>
    </>
  );
}

/**
 * Pantalla "Configurá tu portal".
 * @param {{ available?: boolean, onDone?: (user) => void, onConfigured?: () => void }} props
 *   available: hay código en el servidor · onDone: cuenta creada (la sesión ya quedó abierta)
 *   onConfigured: el portal ya estaba configurado → volver al ingreso.
 */
export function Setup({ available = true, onDone, onConfigured }) {
  const [phase, setPhase] = useState(available ? 'form' : 'unavailable');
  return (
    <Shell copy={SETUP_COPY} art={<SetupArt />} wide={phase === 'form'}>
      <div key={phase} className="animate-fade">
        {phase === 'form' && <SetupForm onDone={onDone} onPhase={setPhase} />}
        {phase === 'unavailable' && <Unavailable />}
        {phase === 'configured' && <AlreadyConfigured onConfigured={onConfigured} />}
      </div>
    </Shell>
  );
}

/** Bienvenida de una sola vez, sobre el centro de operaciones, con los primeros pasos. */
export function SetupWelcome({ user, onClose }) {
  const first = user?.name?.split(' ')[0] ?? '';
  const steps = [
    { to: '/equipo?agregar=socio', icon: UserPlus, tone: 'teal', title: 'Agregá socios e inversionistas', text: 'En Equipo → Agregar persona: solo escribís el nombre y te damos un enlace para que se registre. Para grupos, Enlaces de registro con cupo máximo.' },
    { to: '/clientes', icon: Building2, tone: 'blue', title: 'Agregá tus clientes', text: 'Creá cada cliente y, desde su ficha → Portal del cliente, dale acceso.' },
    { to: '/equipo?tab=ajustes', icon: SlidersHorizontal, tone: 'violet', title: 'Revisá los ajustes', text: 'Tipo de cambio, compromiso de avance a clientes y límites del tablero.' },
  ];
  return (
    <Modal open onClose={onClose} title="Tu portal está listo"
      footer={<button type="button" data-autofocus className="btn btn-primary" onClick={onClose}>Ir al centro de operaciones</button>}>
      <div className="card-panel relative overflow-hidden p-5">
        <div className="relative flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber/20 text-amber"><Crown className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-white">¡Bienvenido{first ? `, ${first}` : ''}!</p>
            <p className="mt-1 text-sm leading-relaxed text-panel-muted">Quedaste como administrador. La configuración inicial ya no vuelve a aparecer: desde ahora se entra con tu correo y contraseña.</p>
          </div>
        </div>
      </div>
      <p className="label mt-5">Próximos pasos</p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.to}>
            <Link to={s.to} onClick={onClose} className="group row min-h-16 rounded-2xl border border-line px-3.5 py-3 hover:border-line-strong">
              <span className="relative">
                <IconTile icon={s.icon} tone={s.tone} />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-contrast text-[10px] font-bold text-contrast-fg ring-2 ring-surface">{i + 1}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink group-hover:text-brand-ink">{s.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{s.text}</span>
              </span>
              <RowArrow />
            </Link>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
