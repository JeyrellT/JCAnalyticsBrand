// Ingreso y cambio obligatorio de contraseña temporal.
// Escritorio: panel "tinta" con un collage del producto a la izquierda y el formulario en tarjeta a la derecha.
// Celular: cabecera tinta con la marca y el formulario en una hoja clara.
// v5: selector de acceso. El cliente entra por /api/client/auth/login (otra identidad, otra cookie).
// v6: tres accesos, Equipo · Inversionistas · Clientes. Equipo e Inversionistas usan /api/auth/login
// (misma tabla de personas); la URL elige el inicial: /inversionista… o ?acceso=inversionista → Inversionistas,
// /cliente… o ?acceso=cliente → Clientes.
// En la demo del navegador (isDemo()) el ingreso es un selector de personas (equipo, inversionistas y clientes).
import { useRef, useState } from 'react';
import {
  Lock, ShieldCheck, ArrowRight, KanbanSquare, CalendarDays, TrendingUp, FlaskConical, Loader2, Mail, Eye, EyeOff,
  CheckCircle2, Clock3, Sparkles, Users, Building2, FolderKanban, PackageCheck, FolderOpen, Landmark, HandCoins, CheckCheck,
  Check, Wallet, FileSpreadsheet,
} from 'lucide-react';
import { api, errorMessage, isDemo, demoInfo } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { navigate, useLocation } from '../lib/router.jsx';
import { ROLES, isInvestorRole } from '../../shared/catalog.js';
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

/** Collage del portal de clientes: etapa de un proyecto, un entregable aprobado y la próxima reunión. */
function ClientCollage() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px]" aria-hidden="true">
      {/* Proyecto y su etapa actual */}
      <div className="animate-float absolute left-0 top-12 w-[262px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '-3deg', animationDelay: '0s' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="chip bg-white/10 text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-teal" />En desarrollo</span>
          <span className="font-display text-sm font-bold text-white">50%</span>
        </div>
        <p className="text-[13.5px] font-semibold leading-snug text-white">Tienda en línea y pedidos</p>
        <p className="mt-1 text-[11.5px] text-white/55">Etapa actual · Pruebas en celulares</p>
        <div className="mt-3 flex gap-1">
          <span className="h-1.5 flex-1 rounded-full bg-teal" /><span className="h-1.5 flex-1 rounded-full bg-teal" />
          <span className="h-1.5 flex-1 rounded-full bg-brand" /><span className="h-1.5 flex-1 rounded-full bg-white/15" />
        </div>
      </div>
      {/* Próxima reunión */}
      <div className="animate-float absolute right-0 top-0 w-[232px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '3deg', animationDelay: '1.2s' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10 text-white">
            <span className="text-[9px] font-bold uppercase leading-none text-teal">jue</span>
            <span className="font-display text-lg font-bold leading-none">16</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">Demo del avance</p>
            <p className="text-[11.5px] text-white/55">10:00 a.m. · Videollamada</p>
          </div>
        </div>
      </div>
      {/* Entregable aprobado */}
      <div className="animate-float absolute bottom-0 left-1/2 w-[286px] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/[0.09] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '1.5deg', animationDelay: '0.6s' }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/20 text-teal"><PackageCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-white">Campaña de temporada</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-white/55">Versión 2 · <span className="inline-flex items-center gap-1 font-semibold text-teal"><CheckCircle2 className="h-3 w-3" />Aprobada</span></p>
          </div>
        </div>
        <p className="mt-3 rounded-xl rounded-tl-sm bg-white/[0.08] px-3 py-2 text-[12px] leading-snug text-white/80">“¡Quedó excelente! Aprobada para publicar.”</p>
      </div>
    </div>
  );
}

/** Collage del portal de inversionistas: su posición, un aporte por confirmar y un retorno confirmado con mensaje de vuelta. */
function InvestorCollage() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px]" aria-hidden="true">
      {/* Posición del inversionista */}
      <div className="animate-float absolute left-0 top-12 w-[258px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '-3deg', animationDelay: '0s' }}>
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Mi inversión</p>
        <div className="flex items-center gap-2">
          <p className="font-display text-[22px] font-bold leading-none text-white tabular-nums">₡750 000</p>
          <span className="chip bg-teal/20 text-teal"><TrendingUp className="h-3 w-3" />1,24×</span>
        </div>
        <p className="mt-1 text-[11.5px] text-white/55">aportado · BarberXCR</p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/55"><span>Participación</span><span className="font-semibold text-white">18 %</span></div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[18%] rounded-full bg-teal" /></div>
      </div>
      {/* Aporte por confirmar */}
      <div className="animate-float absolute right-0 top-0 w-[236px] rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '3deg', animationDelay: '1.2s' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber/20 text-amber"><HandCoins className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">Confirmá un aporte</p>
            <p className="text-[11.5px] text-white/55">₡250 000 · SINPE 70211</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11.5px] font-semibold">
          <span className="flex items-center justify-center gap-1 rounded-lg bg-teal/25 py-1.5 text-teal"><Check className="h-3.5 w-3.5" />Confirmar</span>
          <span className="flex items-center justify-center rounded-lg bg-white/10 py-1.5 text-white/75">Objetar</span>
        </div>
      </div>
      {/* Retorno confirmado con su mensaje de vuelta */}
      <div className="animate-float absolute bottom-0 left-1/2 w-[286px] -translate-x-1/2 rounded-2xl border border-white/10 bg-white/[0.09] p-3.5 shadow-pop backdrop-blur-md" style={{ '--tilt': '1.5deg', animationDelay: '0.6s' }}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/20 text-teal"><CheckCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold leading-none text-white tabular-nums">₡38 000</p>
            <p className="mt-1 truncate text-[11.5px] text-white/55">retorno · octubre</p>
          </div>
          <span className="chip bg-teal/20 text-teal"><CheckCircle2 className="h-3 w-3" />Confirmado</span>
        </div>
        <p className="mt-3 rounded-xl rounded-tl-sm bg-white/[0.08] px-3 py-2 text-[12px] leading-snug text-white/80">“Recibido en mi cuenta BN, gracias ✓”</p>
      </div>
    </div>
  );
}

/** Textos de la pantalla de ingreso según quién entra. */
const SHELL_COPY = {
  team: {
    tag: 'Portal del equipo',
    eyebrow: 'Portal privado del equipo',
    title: 'Proyectos, operación e inversiones en un solo lugar.',
    points: [
      [KanbanSquare, 'Tablero kanban y avances a clientes cada 72 h.'],
      [CalendarDays, 'Agenda de citas con detección de choques.'],
      [TrendingUp, 'Aportes y retornos de socios con confirmación y mensaje de vuelta.'],
    ],
    footer: 'Sesión cifrada · solo el equipo de JC Analytics',
  },
  client: {
    tag: 'Portal de clientes',
    eyebrow: 'Portal de clientes',
    title: 'Tu proyecto con JC Analytics, claro y al día.',
    points: [
      [FolderKanban, 'Etapas y avances de cada proyecto, sin perseguir a nadie.'],
      [PackageCheck, 'Entregables listos para revisar y aprobar en un toque.'],
      [FolderOpen, 'Solicitudes, documentos y reuniones en un solo lugar.'],
    ],
    footer: 'Sesión cifrada · solo las personas de tu empresa con acceso',
  },
  investor: {
    tag: 'Portal de inversionistas',
    eyebrow: 'Portal de inversionistas',
    title: 'Tu capital con JC Analytics, claro y confirmado.',
    points: [
      [Wallet, 'Tu capital, tus retornos y tu participación en cada inversión.'],
      [CheckCheck, 'Doble confirmación: cada colón queda con su mensaje de vuelta.'],
      [FileSpreadsheet, 'Estado de cuenta para Excel y conversación directa con el equipo.'],
    ],
    footer: 'Sesión cifrada · solo inversionistas de JC Analytics',
  },
};

/**
 * Marco de las pantallas sin sesión (ingreso, primer ingreso y configuración inicial).
 * `copy` y `art` reemplazan los textos y el collage del panel; `wide` da más ancho al formulario.
 */
export function Shell({ children, audience = 'team', copy: customCopy, art, wide = false }) {
  const copy = customCopy ?? SHELL_COPY[audience] ?? SHELL_COPY.team;
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
        <div className="relative my-auto py-10">{art ?? (audience === 'client' ? <ClientCollage /> : audience === 'investor' ? <InvestorCollage /> : <ProductCollage />)}</div>
        <div className="relative max-w-lg">
          <p className="eyebrow !text-teal">{copy.eyebrow}</p>
          <h1 className="mt-3 font-display text-[38px] font-bold leading-[1.08]">{copy.title}</h1>
          <ul className="mt-7 space-y-2.5 text-sm text-white/70">
            {copy.points.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-teal"><Icon className="h-4 w-4" /></span>{text}</li>
            ))}
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
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-teal">{copy.tag}</span>
              </span>
            </div>
            <ThemeToggle light />
          </div>
          <p className="relative mt-7 max-w-[300px] font-display text-[24px] font-bold leading-tight">{copy.title}</p>
        </div>
        <div className={cx('relative -mt-8 w-full px-4 pb-10 lg:mt-0 lg:px-0', wide ? 'lg:max-w-[540px]' : 'lg:max-w-[440px]')}>
          <div className="card animate-pop rounded-3xl p-6 shadow-raised sm:p-8">{children}</div>
          <p className="mt-5 hidden items-center justify-center gap-2 text-xs text-muted lg:flex">
            <ShieldCheck className="h-3.5 w-3.5" />{copy.footer}
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

/** ¿La URL pide el acceso de clientes? (/cliente… o ?acceso=cliente) */
const wantsClient = (path, query) => /^\/cliente(\/|$)/.test(path) || query.get('acceso') === 'cliente';
/** ¿La URL pide el acceso de inversionistas? (/inversionista… o ?acceso=inversionista) */
const wantsInvestor = (path, query) => /^\/inversionista(\/|$)/.test(path) || query.get('acceso') === 'inversionista';
/** Acceso que se preselecciona según el enlace por el que llegó la persona. */
const accessFromUrl = (path, query) => (wantsInvestor(path, query) ? 'investor' : wantsClient(path, query) ? 'client' : 'team');

/** Los tres accesos del ingreso, en el orden del selector. */
const ACCESS = {
  team: { label: 'Equipo', icon: Users },
  investor: { label: 'Inversionistas', icon: Landmark },
  client: { label: 'Clientes', icon: Building2 },
};
const ALL_ACCESS = ['team', 'investor', 'client'];

/**
 * Selector "Equipo · Inversionistas · Clientes": grupo de opciones con foco itinerante.
 * Las flechas recorren las opciones en ciclo; Inicio y Fin van a la primera y a la última.
 * En celular cada opción apila ícono y texto para que "Inversionistas" entre sin cortarse.
 */
function AccessToggle({ value, onChange, modes = ALL_ACCESS, className }) {
  const refs = useRef({});
  function onKeyDown(e) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let index;
    if (step) index = (modes.indexOf(value) + step + modes.length) % modes.length;
    else if (e.key === 'Home') index = 0;
    else if (e.key === 'End') index = modes.length - 1;
    else return;
    e.preventDefault();
    const next = modes[index];
    onChange(next);
    refs.current[next]?.focus();
  }
  return (
    <div role="radiogroup" aria-label="Tipo de acceso" onKeyDown={onKeyDown} className={cx('flex gap-1 rounded-2xl border border-line bg-surface-2 p-1', className)}>
      {modes.map((key) => {
        const { label, icon: Icon } = ACCESS[key];
        const on = value === key;
        return (
          <button key={key} ref={(el) => { refs.current[key] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onChange(key)}
            className={cx(
              'flex min-h-[52px] min-w-0 flex-auto flex-col items-center justify-center gap-1 rounded-xl px-2 text-[12.5px] font-semibold leading-tight transition sm:min-h-11 sm:flex-row sm:gap-2 sm:text-sm',
              on ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
            )}>
            <Icon className={cx('h-4 w-4 shrink-0', on && 'text-brand')} aria-hidden="true" />{label}
          </button>
        );
      })}
    </div>
  );
}

/** Textos del formulario de ingreso según el acceso elegido. */
const FORM_COPY = {
  team: {
    eyebrow: 'Bienvenido',
    lead: 'Usá el correo y la contraseña que te dio el administrador.',
    placeholder: 'vos@jcanalytic.com',
    note: 'Acceso solo para el equipo. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.',
  },
  investor: {
    eyebrow: 'Portal de inversionistas',
    lead: 'Ingresá con el correo que te dio JC Analytics.',
    placeholder: 'vos@correo.com',
    note: 'Acceso privado para inversionistas de JC Analytics. ¿Olvidaste la contraseña? Pedile a JC Analytics que te la restablezca. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.',
  },
  client: {
    eyebrow: 'Portal de clientes',
    lead: 'Ingresá con el correo que te dio tu ejecutivo de JC Analytics.',
    placeholder: 'vos@tuempresa.com',
    note: 'Acceso privado para clientes de JC Analytics. ¿Olvidaste la contraseña? Tu ejecutivo de cuenta te la restablece. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.',
  },
};

function PasswordLogin() {
  const { signedIn, signedInClient } = useSession();
  const { path, query } = useLocation();
  const [mode, setMode] = useState(() => accessFromUrl(path, query));
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const client = mode === 'client';
  const copy = FORM_COPY[mode];

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setError('');
    setForm((f) => ({ ...f, password: '' }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (client) {
        await api('/api/client/auth/login', { method: 'POST', body: form });
        await signedInClient();
      } else {
        // Equipo e inversionistas comparten la identidad: el rol decide qué portal se abre.
        const { user } = await api('/api/auth/login', { method: 'POST', body: form });
        // Si alguien del equipo entró por un enlace de clientes o de inversionistas, arranca en su inicio.
        // (A un inversionista que entró por "/" lo lleva su propio portal a /inversionista.)
        if (!isInvestorRole(user) && (wantsClient(path, query) || wantsInvestor(path, query))) navigate('/', { replace: true });
        signedIn(user);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell audience={mode}>
      <AccessToggle value={mode} onChange={switchMode} className="mb-6" />
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 className="mt-1 font-display text-[26px] font-bold">Ingresar</h2>
      <p className="mt-1 text-sm text-muted">{copy.lead}</p>
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Field label="Correo">
          {(id) => (
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
              <input id={id} className="input pl-9" type="email" autoComplete="username" inputMode="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={copy.placeholder} />
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
      <p className="mt-6 flex items-start gap-2 text-xs text-muted"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{copy.note}</span></p>
    </Shell>
  );
}

/** Qué ve cada rol en la demo (una línea por persona). */
const DEMO_SCOPE = {
  admin: 'Ve todo: operaciones, inversiones y ajustes del equipo.',
  socio: 'Operaciones del equipo e inversiones de socios.',
  colaborador: 'Operaciones del equipo, sin acceso a inversiones.',
  inversionista: 'Solo su portal: su capital, sus retornos y lo que tiene que confirmar.',
};

/** Encabezado del selector de personas de la demo según el acceso. */
const DEMO_COPY = {
  team: { title: '¿Con quién querés entrar?', lead: 'Elegí una persona del equipo para recorrer el portal con sus permisos. Podés cambiar de persona cuando quieras.', list: 'Personas de la demo' },
  investor: { title: '¿Con qué inversionista querés entrar?', lead: 'Mirá el portal como lo ve un inversionista: su capital, sus retornos y los movimientos que tiene que confirmar.', list: 'Inversionistas de la demo' },
  client: { title: '¿Con qué cliente querés entrar?', lead: 'Mirá el portal como lo ve cada empresa: sus proyectos, entregables por aprobar, solicitudes y documentos.', list: 'Clientes de la demo' },
};

function DemoLogin() {
  const { signedIn, signedInClient } = useSession();
  const { personas, password, clientPersonas } = demoInfo();
  const clients = Array.isArray(clientPersonas) ? clientPersonas : [];
  const team = personas.filter((p) => !isInvestorRole(p));
  const investors = personas.filter((p) => isInvestorRole(p));
  const modes = ALL_ACCESS.filter((m) => m === 'team' || (m === 'investor' ? investors.length > 0 : clients.length > 0));
  const { path, query } = useLocation();
  const [mode, setMode] = useState(() => {
    const wanted = accessFromUrl(path, query);
    return modes.includes(wanted) ? wanted : 'team';
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const copy = DEMO_COPY[mode];

  async function enter(persona) {
    setBusy(persona.email);
    setError('');
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: { email: persona.email, password } });
      navigate(isInvestorRole(user) ? '/inversionista' : '/', { replace: true });
      signedIn(user);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  async function enterClient(persona) {
    setBusy(persona.email);
    setError('');
    try {
      await api('/api/client/auth/login', { method: 'POST', body: { email: persona.email, password } });
      await signedInClient();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  const row = 'group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3 text-left transition hover:border-brand/40 hover:bg-surface hover:shadow-raised active:scale-[0.99] disabled:opacity-60';
  const arrow = (email) => (busy === email
    ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />
    : <ArrowRight className="h-5 w-5 shrink-0 text-muted-2 transition group-hover:translate-x-0.5 group-hover:text-brand" />);

  return (
    <Shell audience={mode}>
      <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-3 py-2.5 text-sm font-semibold text-amber-ink ring-1 ring-amber/30">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Demo con datos ficticios · los cambios se pierden al recargar</span>
      </p>
      {modes.length > 1 && <AccessToggle value={mode} modes={modes} onChange={(next) => { setMode(next); setError(''); }} className="mt-5" />}
      <h2 className="mt-6 font-display text-[24px] font-bold">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted">{copy.lead}</p>
      <ul key={mode} className="stagger mt-5 space-y-2" aria-label={copy.list}>
        {mode === 'client' ? clients.map((p) => (
          <li key={p.email}>
            <button type="button" onClick={() => enterClient(p)} disabled={busy !== null} className={row}>
              <Avatar name={p.name} color="#0065df" size={42} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  {p.client_name && <span className="text-[10.5px] font-bold uppercase tracking-wide text-teal-ink">{p.client_name}</span>}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{p.title || 'Cuenta del portal de clientes'}</span>
              </span>
              {arrow(p.email)}
            </button>
          </li>
        )) : (mode === 'investor' ? investors : team).map((p) => (
          <li key={p.email}>
            <button type="button" onClick={() => enter(p)} disabled={busy !== null} className={row}>
              <Avatar name={p.name} color={p.color} size={42} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className={cx('text-[10.5px] font-bold uppercase tracking-wide', isInvestorRole(p) ? 'text-violet-ink' : 'text-brand-ink')}>{ROLES[p.role]?.label ?? p.role}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{DEMO_SCOPE[p.role] ?? ROLES[p.role]?.hint}</span>
              </span>
              {arrow(p.email)}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-4 rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-coral-ink">{error}</p>}
      <p className="mt-5 flex items-start gap-2 text-xs text-muted"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />Todo corre dentro de esta página: nada se envía ni se guarda en el portal real.</p>
    </Shell>
  );
}

/** Cambio de contraseña. `endpoint`: equipo (/api/me/password) o cliente (/api/client/me/password). */
export function PasswordForm({ forced = false, onDone, endpoint = '/api/me/password' }) {
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
      await api(endpoint, { method: 'POST', body: { current_password: form.current_password, new_password: form.new_password } });
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
  const { user, isInvestor } = useSession();
  return (
    <Shell audience={isInvestor ? 'investor' : 'team'}>
      <p className="eyebrow">Primer ingreso</p>
      <h2 className="mt-1 font-display text-[26px] font-bold">Hola, {user.name.split(' ')[0]}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">
        {isInvestor && 'Te damos la bienvenida al portal de inversionistas de JC Analytics. '}Antes de entrar, cambiá la contraseña temporal por una que solo vos conozcas.
      </p>
      <PasswordForm forced />
    </Shell>
  );
}

/** Primer ingreso de un cliente: cambia la clave temporal antes de ver su portal. */
export function ClientForcePasswordChange() {
  const { account, client } = useSession();
  return (
    <Shell audience="client">
      <p className="eyebrow">Primer ingreso</p>
      <h2 className="mt-1 font-display text-[26px] font-bold">Hola, {account.name.split(' ')[0]}</h2>
      <p className="mt-1 mb-6 text-sm text-muted">
        Te damos la bienvenida al portal de {client?.name ?? 'tu empresa'} con JC Analytics. Antes de entrar, cambiá la contraseña temporal por una que solo vos conozcas.
      </p>
      <PasswordForm forced endpoint="/api/client/me/password" />
    </Shell>
  );
}
