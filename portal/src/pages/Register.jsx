// v7 · Registro con enlace (/registro/:token).
// La persona abre el enlace que le compartió el admin, completa SUS datos y elige SU contraseña:
// entra directo, sin claves temporales. Sirve para el equipo (socio, colaborador, inversionista,
// admin) y para personas de un cliente. El token viaja en el cuerpo de la petición, nunca en la URL de la API.
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Loader2, Eye, EyeOff, Mail, Phone, UserRound, Lock, ShieldCheck, CheckCircle2, Circle, CircleX, Clock3, AlertTriangle,
  Crown, Handshake, Wrench, Landmark, Building2, Link2Off, CalendarX2, UsersRound, Sparkles, LogOut, BriefcaseBusiness, Quote,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { navigate } from '../lib/router.jsx';
import { passwordChecks } from '../lib/password.js';
import { Field, IconTile, PageLoader, cx } from '../components/ui.jsx';
import { Shell } from './Login.jsx';
import { FieldError, InputIcon } from './Setup.jsx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ['name', 'email', 'phone', 'title', 'password'];

/** Cómo se presenta cada tipo de alta. */
const LOOK = {
  admin: { icon: Crown, tone: 'amber', what: 'administrador', points: ['Acceso total: equipo, clientes, inversiones y ajustes.', 'Agregás personas y creás enlaces de registro.'] },
  socio: { icon: Handshake, tone: 'blue', what: 'socio', points: ['Proyectos, clientes, agenda y tablero del equipo.', 'Inversiones con doble confirmación de cada movimiento.'] },
  colaborador: { icon: Wrench, tone: 'teal', what: 'colaborador', points: ['Tus tareas, proyectos y citas en un solo lugar.', 'Avisos en el celular cuando algo te toca.'] },
  inversionista: { icon: Landmark, tone: 'violet', what: 'inversionista', points: ['Tu capital, tus retornos y tu participación.', 'Confirmás cada movimiento a tu nombre.'] },
  client: { icon: Building2, tone: 'teal', what: 'cliente', points: ['Etapas y avances de tus proyectos, al día.', 'Entregables para revisar y documentos compartidos.'] },
};
const lookOf = (invite) => (invite.kind === 'client' ? LOOK.client : LOOK[invite.role] ?? LOOK.colaborador);
const first = (name = '') => name.trim().split(/\s+/)[0] ?? '';

/** Tarjeta de invitación del panel de marca: quién invita, a qué y hasta cuándo. */
function InviteArt({ invite }) {
  const look = lookOf(invite);
  const Icon = look.icon;
  const until = new Date(invite.expires_at).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' });
  return (
    <div className="relative mx-auto w-full max-w-[400px]" aria-hidden="true">
      <div className="animate-float rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-pop backdrop-blur-md" style={{ '--tilt': '-2deg' }}>
        <div className="flex items-center justify-between">
          <span className="chip bg-teal/20 text-teal"><Sparkles className="h-3 w-3" />Invitación</span>
          <span className="text-[11px] text-white/55">Vence el {until}</span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-teal"><Icon className="h-7 w-7" /></span>
          <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.16em] text-white/55">Te suman como</p>
            <p className="font-display text-2xl font-bold text-white">{invite.kind === 'client' ? invite.client_name : look.what[0].toUpperCase() + look.what.slice(1)}</p>
          </div>
        </div>
        {invite.message && (
          <p className="mt-5 flex gap-2 rounded-2xl bg-white/[0.06] p-3.5 text-[13px] leading-relaxed text-white/80"><Quote className="h-4 w-4 shrink-0 text-teal" />{invite.message}</p>
        )}
        <p className="mt-5 border-t border-white/10 pt-4 text-[12.5px] text-white/60">De parte de <span className="font-semibold text-white">{invite.inviter_name}</span> · JC Analytics</p>
      </div>
    </div>
  );
}

/** El enlace no sirve (vencido, completo, desactivado o mal copiado). */
function Unavailable({ reason }) {
  const meta = {
    vencido: { icon: CalendarX2, title: 'Este enlace ya venció', text: 'Pedile a quien te lo envió que lo renueve o te comparta uno nuevo.' },
    agotado: { icon: UsersRound, title: 'Este enlace ya se completó', text: 'Ya se registraron todas las personas previstas. Pedí un enlace nuevo a quien te invitó.' },
    revocado: { icon: Link2Off, title: 'Este enlace fue desactivado', text: 'Ya no admite registros. Si deberías tener acceso, pedí un enlace nuevo.' },
    not_found: { icon: Link2Off, title: 'No encontramos este enlace', text: 'Revisá que lo hayas copiado completo, o pedí que te lo vuelvan a enviar.' },
    too_many: { icon: Clock3, title: 'Demasiados intentos', text: 'Esta conexión probó varios enlaces inválidos. Esperá 15 minutos y volvé a abrir el enlace correcto.' },
  }[reason] ?? { icon: AlertTriangle, title: 'No pudimos abrir el enlace', text: 'Revisá tu conexión e intentá de nuevo.' };
  return (
    <>
      <IconTile icon={meta.icon} tone="amber" size="lg" />
      <p className="eyebrow mt-4">Registro</p>
      <h2 className="mt-1 font-display text-[26px] font-bold leading-tight">{meta.title}</h2>
      <p className="mt-2 text-sm text-muted">{meta.text}</p>
      <button type="button" className="btn btn-outline btn-lg mt-6 w-full" onClick={() => navigate('/', { replace: true })}>Ir al ingreso <ArrowRight className="h-4 w-4" /></button>
    </>
  );
}

/** Ya hay una sesión abierta en este navegador: registrarse cerraría la actual. */
function SignedInNotice({ name, onContinue }) {
  const { logout } = useSession();
  return (
    <>
      <IconTile icon={UserRound} tone="blue" size="lg" />
      <p className="eyebrow mt-4">Registro</p>
      <h2 className="mt-1 font-display text-[26px] font-bold leading-tight">Ya tenés una sesión abierta</h2>
      <p className="mt-2 text-sm text-muted">Estás adentro como <b className="text-ink">{name}</b>. Si este enlace es para otra persona, compartíselo. Si es para vos con otro correo, cerrá sesión primero.</p>
      <div className="mt-6 grid gap-2">
        <button type="button" className="btn btn-primary btn-lg w-full" onClick={onContinue}>Seguir en mi portal <ArrowRight className="h-4 w-4" /></button>
        <button type="button" className="btn btn-ghost w-full" onClick={() => logout()}><LogOut className="h-4 w-4" />Cerrar sesión y registrarme</button>
      </div>
    </>
  );
}

function RegisterForm({ token, invite }) {
  const { signedIn, signedInClient } = useSession();
  const client = invite.kind === 'client';
  const look = lookOf(invite);
  const [form, setForm] = useState({ name: invite.name ?? '', email: '', phone: '', title: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const refs = useRef({});
  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((x) => ({ ...x, [key]: null })); setAlert(null); };
  const bind = (key, id) => ({
    id, ref: (el) => { refs.current[key] = el; }, value: form[key], onChange: set(key),
    'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `${id}-error` : undefined,
  });

  const checks = passwordChecks(form.password);
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const emailOk = EMAIL.test(form.email.trim());
  const ready = form.name.trim().length >= 2 && emailOk && checks.every((c) => c.ok) && form.confirm === form.password;

  async function submit(e) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      const res = await api('/api/invites/accept', {
        method: 'POST',
        body: { token, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, title: client ? form.title.trim() || null : undefined, password: form.password },
      });
      if (res.kind === 'client') {
        await signedInClient();
      } else {
        navigate(res.home ?? '/', { replace: true });
        signedIn(res.user);
      }
    } catch (err) {
      setBusy(false);
      const field = err?.data?.field;
      if (err?.data?.error === 'validation' && FIELDS.includes(field)) {
        setErrors({ [field]: err.data.message ?? 'Revisá este dato.' });
        refs.current[field]?.focus();
      } else if (err?.status === 410) {
        setAlert({ tone: 'amber', text: 'El enlace se completó o venció mientras llenabas el formulario. Pedí uno nuevo a quien te invitó.' });
      } else if (err?.status === 429) {
        setAlert({ tone: 'amber', text: 'Demasiados intentos desde esta conexión. Esperá 15 minutos.' });
      } else {
        setAlert({ tone: 'red', text: errorMessage(err) });
      }
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Invitación de {first(invite.inviter_name)}</p>
          <h2 className="mt-1 font-display text-[26px] font-bold leading-tight">
            {invite.name ? `¡Hola, ${first(invite.name)}!` : 'Creá tu acceso'}
          </h2>
        </div>
        <IconTile icon={look.icon} tone={look.tone} size="lg" />
      </div>
      <p className="mt-2 text-sm text-muted">
        {client
          ? <>Te damos acceso al portal de <b className="text-ink">{invite.client_name}</b> con JC Analytics. Completá tus datos y elegí tu contraseña.</>
          : <>Te suman al portal de JC Analytics como <b className="text-ink">{look.what}</b>. Completá tus datos y elegí tu contraseña: entrás de una vez.</>}
      </p>
      {invite.message && <p className="mt-3 flex gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-ink-2 lg:hidden"><Quote className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" aria-hidden="true" />{invite.message}</p>}

      <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink"><UserRound className="h-4 w-4 text-teal-ink" aria-hidden="true" />Tus datos</legend>
          <Field label="Nombre completo">
            {(id) => (<><input {...bind('name', id)} className="input" autoComplete="name" placeholder="Tu nombre y apellido" /><FieldError id={`${id}-error`} text={errors.name} /></>)}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" hint={!errors.email && form.email && !emailOk ? 'Revisá el formato del correo.' : 'Con este correo vas a ingresar.'}>
              {(id) => (
                <>
                  <div className="relative"><InputIcon icon={Mail} /><input {...bind('email', id)} className="input pl-9" type="email" inputMode="email" autoComplete="username" placeholder="vos@correo.com" /></div>
                  <FieldError id={`${id}-error`} text={errors.email} />
                </>
              )}
            </Field>
            <Field label="WhatsApp (opcional)" hint={errors.phone ? null : 'Para avisos y coordinación.'}>
              {(id) => (
                <>
                  <div className="relative"><InputIcon icon={Phone} /><input {...bind('phone', id)} className="input pl-9" type="tel" inputMode="tel" autoComplete="tel" placeholder="8888-0000" /></div>
                  <FieldError id={`${id}-error`} text={errors.phone} />
                </>
              )}
            </Field>
          </div>
          {client && (
            <Field label="Cargo (opcional)">
              {(id) => (
                <>
                  <div className="relative"><InputIcon icon={BriefcaseBusiness} /><input {...bind('title', id)} className="input pl-9" autoComplete="organization-title" placeholder="Gerencia, marketing, finanzas…" /></div>
                  <FieldError id={`${id}-error`} text={errors.title} />
                </>
              )}
            </Field>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink"><Lock className="h-4 w-4 text-teal-ink" aria-hidden="true" />Tu contraseña</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña">
              {(id) => (
                <>
                  <div className="relative">
                    <input {...bind('password', id)} className="input pr-11" type={show ? 'text' : 'password'} autoComplete="new-password" />
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
                  <input id={id} className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={mismatch || undefined} />
                  <FieldError id={`${id}-error`} text={mismatch ? 'Las contraseñas no coinciden.' : null} />
                </>
              )}
            </Field>
          </div>
          <ul className="grid gap-1.5 rounded-xl bg-surface-2 px-3.5 py-3 text-xs" aria-label="Requisitos de la contraseña">
            {checks.map((c) => {
              const Icon = c.ok ? CheckCircle2 : c.bad ? CircleX : Circle;
              return (
                <li key={c.text} className={cx('flex items-start gap-2 transition-colors', c.ok ? 'text-teal-ink' : c.bad ? 'font-medium text-coral-ink' : 'text-muted')}>
                  <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{c.text}</span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {alert && (
          <p role="alert" className={cx('animate-pop flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium', alert.tone === 'amber' ? 'bg-amber-soft text-amber-ink' : 'bg-coral-soft text-coral-ink')}>
            {alert.tone === 'amber' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{alert.text}</span>
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!ready || busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Creando tu acceso…</> : <>Crear mi acceso y entrar <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-5 flex items-start gap-2 text-xs text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Tu contraseña es solo tuya: nadie del equipo la conoce. Sesión cifrada.</p>
    </>
  );
}

/** Pantalla de registro. params.token viene de /registro/:token. */
export default function Register({ params }) {
  const session = useSession();
  const token = params?.token ?? '';
  const [state, setState] = useState({ phase: 'loading', invite: null, reason: null });
  const signedInName = session.status === 'ready' ? (session.user?.name ?? session.account?.name) : null;

  useEffect(() => {
    let alive = true;
    api('/api/invites/lookup', { method: 'POST', body: { token }, quiet: true }).then(
      (r) => alive && setState({ phase: 'form', invite: r.invite, reason: null }),
      (err) => {
        if (!alive) return;
        const reason = err?.status === 410 ? err.data?.status : err?.status === 404 ? 'not_found' : err?.status === 429 ? 'too_many' : 'error';
        setState({ phase: 'unavailable', invite: null, reason });
      },
    );
    return () => { alive = false; };
  }, [token]);

  useEffect(() => { document.title = 'Registro · JC Analytics'; }, []);

  if (state.phase === 'loading') return <PageLoader />;
  const invite = state.invite;
  const look = invite ? lookOf(invite) : null;
  const copy = {
    tag: 'Registro',
    eyebrow: invite ? `Invitación de ${invite.inviter_name}` : 'Registro',
    title: invite ? (invite.kind === 'client' ? `Tu portal con JC Analytics, para ${invite.client_name}.` : `Bienvenido al equipo de JC Analytics.`) : 'Registro en JC Analytics',
    points: look ? [[look.icon, look.points[0]], [ShieldCheck, 'Elegís tu propia contraseña: nadie más la conoce.'], [Sparkles, look.points[1]]] : [[ShieldCheck, 'Acceso privado y cifrado.']],
    footer: 'Registro con enlace · JC Analytics',
  };
  return (
    <Shell copy={copy} audience={invite?.kind === 'client' ? 'client' : invite?.role === 'inversionista' ? 'investor' : 'team'} art={invite ? <InviteArt invite={invite} /> : undefined} wide={state.phase === 'form' && !signedInName}>
      <div className="animate-fade">
        {state.phase === 'unavailable' && <Unavailable reason={state.reason} />}
        {state.phase === 'form' && signedInName && <SignedInNotice name={signedInName} onContinue={() => navigate('/', { replace: true })} />}
        {state.phase === 'form' && !signedInName && <RegisterForm token={token} invite={invite} />}
      </div>
    </Shell>
  );
}
