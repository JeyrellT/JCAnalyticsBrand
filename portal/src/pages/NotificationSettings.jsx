// Avisos y app (/notificaciones): instalar el portal en el celular, activar los avisos en este
// dispositivo, qué te avisamos, horario tranquilo, resumen "Mi día" y mis dispositivos.
// Los interruptores son optimistas: cambian al instante y vuelven atrás si el portal no guardó.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Smartphone, BellRing, BellOff, Bell, Send, ListChecks, CalendarClock, FolderKanban, Wallet, Sunrise, Bot,
  Moon, Monitor, MonitorSmartphone, Trash2, FlaskConical, Loader2, ShieldAlert,
} from 'lucide-react';
import { NOTIFICATION_CATEGORIES } from '../../shared/catalog.js';
import { api, isDemo, errorMessage } from '../lib/api.js';
import { useSession, useResource } from '../lib/session.jsx';
import {
  useInstallState, pushSupport, getPushState, getPermission, subscribePush, unsubscribePush, sendTest,
  pushErrorMessage, forgetLocalSubscription, detectPlatform,
} from '../lib/pwa.js';
import { InstallCard } from '../components/InstallPrompt.jsx';
import { PageHeader, PageLoader, Badge, cx, useToast, useConfirm } from '../components/ui.jsx';
import { timeAgo, formatDate, dayKey } from '../lib/format.js';

const CATEGORY_ICONS = { tareas: ListChecks, agenda: CalendarClock, proyectos: FolderKanban, dinero: Wallet, resumen: Sunrise, automatizaciones: Bot };

const DEFAULT_PREFS = { push_enabled: true, categories: {}, quiet_start: '21:00', quiet_end: '07:00', digest_enabled: true, digest_time: '07:30' };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizePrefs(raw) {
  const p = { ...DEFAULT_PREFS, ...(raw ?? {}) };
  let categories = p.categories;
  if (typeof categories === 'string') {
    try { categories = JSON.parse(categories); } catch { categories = {}; }
  }
  return {
    push_enabled: Boolean(p.push_enabled),
    categories: categories && typeof categories === 'object' ? categories : {},
    quiet_start: String(p.quiet_start).slice(0, 5),
    quiet_end: String(p.quiet_end).slice(0, 5),
    digest_enabled: Boolean(p.digest_enabled),
    digest_time: String(p.digest_time).slice(0, 5),
  };
}

const validPrefs = (p) => TIME_RE.test(p.quiet_start) && TIME_RE.test(p.quiet_end) && TIME_RE.test(p.digest_time);

const hourFmt = new Intl.DateTimeFormat('es-CR', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
function formatHour(value) {
  if (!TIME_RE.test(value ?? '')) return value || '—';
  const [h, m] = value.split(':').map(Number);
  return hourFmt.format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

/**
 * Preferencias con guardado optimista: [prefs, commit(next, { debounce })].
 * Mientras no haya cambios locales se muestran las del servidor; si un guardado falla,
 * vuelve a lo último confirmado y avisa.
 */
function usePrefs(serverPrefs) {
  const toast = useToast();
  const [local, setLocal] = useState(null);
  const timer = useRef(null);
  const pending = useRef(null);
  const seq = useRef(0);
  const confirmed = useRef(null);
  const latest = useRef(null);
  const prefs = local ?? (serverPrefs ? normalizePrefs(serverPrefs) : null);

  const commit = useCallback((next, { debounce = 0 } = {}) => {
    latest.current = next;
    setLocal(next);
    clearTimeout(timer.current);
    pending.current = null;
    if (!validPrefs(next)) return; // hora a medio escribir: se guarda cuando quede completa
    const send = async () => {
      pending.current = null;
      const body = latest.current;
      const id = ++seq.current;
      try {
        await api('/api/me/notification-prefs', { method: 'PATCH', body });
        confirmed.current = body;
      } catch (error) {
        if (id !== seq.current) return;
        latest.current = confirmed.current;
        setLocal(confirmed.current);
        toast(errorMessage(error), 'error');
      }
    };
    if (debounce) {
      pending.current = send;
      timer.current = setTimeout(send, debounce);
    } else {
      send();
    }
  }, [toast]);

  // Al salir de la página, guarda lo que quedó pendiente.
  useEffect(() => {
    const t = timer;
    const p = pending;
    return () => { clearTimeout(t.current); p.current?.(); };
  }, []);

  return [prefs, commit];
}

/** Estado de los avisos en ESTE navegador (permiso y suscripción local). */
function usePushState(version) {
  const [state, setState] = useState(() => ({ loading: true, permission: getPermission(), subscribed: false, endpoint: null, deviceId: null }));
  useEffect(() => {
    let alive = true;
    getPushState().then((next) => { if (alive) setState({ loading: false, ...next }); });
    return () => { alive = false; };
  }, [version]);
  return state;
}

// ── Piezas de interfaz ──────────────────────────────────────────────────────
function Section({ icon: Icon, title, hint, chip, children }) {
  const id = useId();
  return (
    <section className="card card-pad" aria-labelledby={id}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 id={id} className="section-title">{title}</h2>
            {chip}
          </div>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Knob({ checked }) {
  return (
    <span aria-hidden="true" className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-teal-dark' : 'bg-slate-300')}>
      <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </span>
  );
}

/** Fila completa tocable (≥ 56 px) con interruptor. */
function SwitchRow({ icon: Icon, label, hint, checked, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-50">
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-ink-soft"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <Knob checked={checked} />
    </button>
  );
}

function TimeField({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type="time" required className="input tap tabular min-w-0" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DemoNote() {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">Estás en la demo.</span> Los ajustes se guardan solo aquí y los avisos aparecen simulados en la pantalla.
        Instalar la app y recibir avisos reales en el celular funciona en el portal publicado.
      </p>
    </div>
  );
}

// ── (b) Avisos en este dispositivo ──────────────────────────────────────────
const STATUS = {
  on: { tone: 'teal', label: 'Activos', text: 'Este dispositivo recibe avisos aunque el portal esté cerrado. Tocá un aviso y te lleva directo a lo que pasó.' },
  off: { tone: 'slate', label: 'Apagados', text: 'Activalos para enterarte al instante de tareas, citas y plata por confirmar.' },
  blocked: { tone: 'red', label: 'Bloqueados por el navegador', text: 'Diste "No permitir" alguna vez. Para activarlos:' },
  'server-off': { tone: 'slate', label: 'Todavía no', text: 'El servidor todavía no tiene avisos activos. Mientras tanto, todo llega a tu buzón.' },
  'ios-install': { tone: 'amber', label: 'En iPhone primero instalá la app', text: 'En iPhone y iPad los avisos solo funcionan con el portal instalado en la pantalla de inicio. Seguí los pasos de arriba y abrilo desde el ícono.' },
  'ios-old': { tone: 'amber', label: 'Actualizá tu iPhone', text: 'Los avisos necesitan iOS 16.4 o más nuevo: Ajustes → General → Actualización de software.' },
  unsupported: { tone: 'slate', label: 'No disponible en este navegador', text: 'Probá con Chrome en Android, con la app instalada en iPhone, o con Chrome, Edge o Safari en la compu.' },
  insecure: { tone: 'slate', label: 'No disponible en este navegador', text: 'Los avisos necesitan el portal publicado con https.' },
  dev: { tone: 'slate', label: 'No disponible en este navegador', text: 'En modo desarrollo no hay avisos: probalo en el portal publicado.' },
};

const UNBLOCK = {
  ios: 'Ajustes del iPhone → Notificaciones → JC Portal → Permitir notificaciones. Después volvé aquí.',
  android: 'Mantené presionado el ícono de JC Portal → Información de la app → Notificaciones → Permitir. En Chrome: candado junto a la dirección → Permisos → Notificaciones.',
  desktop: 'Hacé clic en el candado junto a la dirección → Notificaciones → Permitir, y recargá la página.',
};

function DeviceSection({ config, push, prefs, onEnablePrefs, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null); // 'toggle' | 'test'
  const support = pushSupport();
  const devices = config?.devices ?? [];
  // La suscripción local cuenta si el portal la tiene registrada a mi nombre (equipos compartidos).
  const registered = push.subscribed && (!config || push.deviceId == null || devices.some((d) => d.id === push.deviceId));

  let status;
  if (!support.supported) status = support.reason;
  else if (config && !config.available) status = 'server-off';
  else if (!support.demo && push.permission === 'denied') status = 'blocked';
  else status = registered ? 'on' : 'off';
  const meta = STATUS[status] ?? STATUS.unsupported;
  const canToggle = status === 'on' || status === 'off';
  const shownOn = busy === 'toggle' ? !registered : registered; // optimista mientras guarda
  const canTest = Boolean(config?.available) && (registered || devices.length > 0);

  async function toggle() {
    if (busy) return;
    setBusy('toggle');
    try {
      if (registered) {
        await unsubscribePush();
        toast('Listo: este dispositivo ya no recibe avisos.');
      } else {
        // Primera llamada del toque: el permiso se pide dentro del gesto (iPhone lo exige).
        await subscribePush();
        if (prefs && !prefs.push_enabled) onEnablePrefs();
        toast(support.demo ? 'Avisos simulados activados. Probá "Enviar aviso de prueba".' : '¡Avisos activados en este dispositivo!');
      }
    } catch (error) {
      toast(pushErrorMessage(error), 'error');
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  async function test() {
    if (busy) return;
    setBusy('test');
    try {
      const result = await sendTest();
      const sent = result?.sent ?? 0;
      const total = result?.devices ?? sent + (result?.failed ?? 0);
      if (!total) toast('No tenés dispositivos con avisos activos. Activalos primero.', 'error');
      else if (!sent) toast('El aviso no llegó a ningún dispositivo. Probá apagar y volver a activar.', 'error');
      else if (sent < total) toast(`Aviso enviado a ${sent} de ${total} dispositivos. Revisá "Mis dispositivos".`);
      else if (support.demo) toast('Aviso de prueba enviado: mirá la pantalla.');
      else toast(total > 1 ? `¡Enviado a tus ${total} dispositivos! Llega en unos segundos.` : '¡Enviado! Llega en unos segundos.');
    } catch (error) {
      toast(pushErrorMessage(error), 'error');
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  return (
    <Section icon={BellRing} title="Avisos en este dispositivo" chip={<Badge tone={meta.tone} dot>{meta.label}</Badge>}>
      <p className="text-sm text-muted">
        {support.demo && status === 'on' ? 'Avisos simulados: aparecen dentro de la pantalla de la demo.' : meta.text}
      </p>
      {status === 'blocked' && (
        <p className="mt-2 flex items-start gap-2 rounded-2xl bg-coral-soft p-3 text-sm text-coral">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {UNBLOCK[detectPlatform()]}
        </p>
      )}

      {canToggle && (
        <button type="button" role="switch" aria-checked={shownOn} onClick={toggle} disabled={busy !== null || push.loading}
          className={cx('mt-4 flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-wait',
            shownOn ? 'border-teal/40 bg-teal-soft' : 'border-line bg-paper hover:border-slate-300')}>
          <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', shownOn ? 'bg-teal-dark text-white' : 'bg-white text-brand shadow-sm')}>
            {busy === 'toggle' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              : shownOn ? <BellRing className="h-5 w-5" aria-hidden="true" /> : <BellOff className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{shownOn ? 'Avisos activos aquí' : 'Activar avisos aquí'}</span>
            <span className="block text-xs text-muted">{shownOn ? 'Tocá para apagarlos en este dispositivo.' : 'Te pedimos permiso una sola vez.'}</span>
          </span>
          <Knob checked={shownOn} />
        </button>
      )}

      {canTest && (
        <button type="button" onClick={test} disabled={busy !== null} className="btn btn-outline tap mt-3 w-full">
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          Enviar aviso de prueba
        </button>
      )}

      <p className="mt-3 text-xs text-muted">
        Cada celular o compu se activa por separado. En un equipo compartido, apagá los avisos antes de cerrar sesión.
      </p>
    </Section>
  );
}

// ── (c) Qué te avisamos · (d) Horario tranquilo y resumen ───────────────────
function CategoriesSection({ prefs, commit, canInvest }) {
  // "Resumen Mi día" tiene su propia tarjeta (un solo interruptor para el resumen).
  // "Dinero de socios" (invest) solo para socios y admin.
  const entries = Object.entries(NOTIFICATION_CATEGORIES).filter(([key, meta]) => key !== 'resumen' && (!meta.invest || canInvest));
  const setCategory = (key, value) => commit({ ...prefs, categories: { ...prefs.categories, [key]: value } });
  return (
    <Section icon={Bell} title="Qué te avisamos" hint="Elegí qué suena en tus dispositivos. Igual todo queda en tu buzón.">
      {!prefs.push_enabled && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          <span className="min-w-0 flex-1">Tenés los avisos pausados en todos tus dispositivos.</span>
          <button type="button" className="btn btn-dark tap" onClick={() => commit({ ...prefs, push_enabled: true })}>Reanudar</button>
        </div>
      )}
      <div className="-mx-1 divide-y divide-line">
        {entries.map(([key, meta]) => (
          <SwitchRow key={key} icon={CATEGORY_ICONS[key] ?? Bell} label={meta.label} hint={meta.hint}
            checked={prefs.categories[key] !== false} onChange={(value) => setCategory(key, value)} />
        ))}
      </div>
    </Section>
  );
}

function QuietSection({ prefs, commit }) {
  return (
    <Section icon={Moon} title="Horario tranquilo" hint="No te escribimos de noche, salvo plata por confirmar. Igual todo queda en tu buzón.">
      <div className="grid grid-cols-2 gap-3">
        <TimeField label="Desde" value={prefs.quiet_start} onChange={(v) => commit({ ...prefs, quiet_start: v }, { debounce: 700 })} />
        <TimeField label="Hasta" value={prefs.quiet_end} onChange={(v) => commit({ ...prefs, quiet_end: v }, { debounce: 700 })} />
      </div>
      <p className="mt-2 text-xs text-muted">Silencio de {formatHour(prefs.quiet_start)} a {formatHour(prefs.quiet_end)}, hora de Costa Rica.</p>
    </Section>
  );
}

function DigestSection({ prefs, commit }) {
  const on = prefs.digest_enabled && prefs.categories.resumen !== false;
  const toggle = (value) => commit({ ...prefs, digest_enabled: value, categories: { ...prefs.categories, resumen: value } });
  return (
    <Section icon={Sunrise} title='Resumen "Mi día"' hint="Cada mañana te contamos cuántas citas, tareas y pendientes tenés hoy. Si no hay nada, no te escribimos.">
      <div className="-mx-1">
        <SwitchRow label="Recibir el resumen" hint={on ? `Todos los días a las ${formatHour(prefs.digest_time)}` : 'Apagado'} checked={on} onChange={toggle} />
      </div>
      {on && (
        <div className="mt-2 max-w-[13rem]">
          <TimeField label="Hora del resumen" value={prefs.digest_time} onChange={(v) => commit({ ...prefs, digest_time: v }, { debounce: 700 })} />
        </div>
      )}
    </Section>
  );
}

// ── (e) Mis dispositivos ────────────────────────────────────────────────────
function describeDevice(device) {
  const ua = device.user_agent || '';
  let platform = device.platform;
  const os = /iPad/.test(ua) ? 'iPad'
    : /iPhone|iPod/.test(ua) ? 'iPhone'
      : /Android/.test(ua) ? 'Android'
        : /CrOS/.test(ua) ? 'Chromebook'
          : /Windows/.test(ua) ? 'Windows'
            : /Macintosh|Mac OS X/.test(ua) ? (platform === 'ios' ? 'iPad' : 'Mac')
              : /Linux/.test(ua) ? 'Linux' : null;
  if (!['ios', 'android', 'desktop'].includes(platform)) platform = os === 'iPhone' || os === 'iPad' ? 'ios' : os === 'Android' ? 'android' : 'desktop';
  const browser = /EdgA?\/|EdgiOS/.test(ua) ? 'Edge'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
      : /OPR\//.test(ua) ? 'Opera'
        : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
          : /CriOS|Chrome\//.test(ua) ? 'Chrome'
            : /Version\/[\d.]+.*Safari/.test(ua) ? 'Safari' : null;
  const name = os ?? { ios: 'iPhone o iPad', android: 'Android', desktop: 'Computadora' }[platform];
  // En iPhone los avisos solo existen con la app instalada.
  return { name, detail: platform === 'ios' ? 'App instalada' : browser, icon: platform === 'desktop' ? Monitor : Smartphone };
}

function DevicesSection({ devices, thisDeviceId, setConfig, onChanged }) {
  const confirm = useConfirm();
  const toast = useToast();

  async function remove(device, info) {
    const ok = await confirm({
      title: '¿Quitar este dispositivo?',
      message: `${info.name}${info.detail ? ` (${info.detail})` : ''} va a dejar de recibir avisos del portal. Podés volver a activarlos cuando quieras.`,
      confirmLabel: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    setConfig((c) => (c ? { ...c, devices: (c.devices ?? []).filter((d) => d.id !== device.id) } : c)); // optimista
    try {
      await api(`/api/push/devices/${device.id}`, { method: 'DELETE' });
      if (device.id === thisDeviceId) await forgetLocalSubscription();
      toast('Dispositivo quitado.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      onChanged(); // recarga la lista (si falló, el dispositivo vuelve)
    }
  }

  return (
    <Section icon={MonitorSmartphone} title="Mis dispositivos" hint="Dónde tenés los avisos activos." chip={devices.length > 0 && <Badge tone="slate">{devices.length}</Badge>}>
      {devices.length === 0 ? (
        <p className="rounded-2xl bg-paper p-4 text-sm text-muted">Todavía no activaste avisos en ningún celular ni compu.</p>
      ) : (
        <ul className="-my-1 divide-y divide-line">
          {devices.map((device) => {
            const info = describeDevice(device);
            const mine = device.id === thisDeviceId;
            return (
              <li key={device.id} className="flex items-center gap-3 py-2.5">
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', mine ? 'bg-brand text-white' : 'bg-paper text-ink-soft')}>
                  <info.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-semibold">
                    <span>{info.name}</span>
                    {info.detail && <span className="font-normal text-muted">· {info.detail}</span>}
                    {mine && <Badge tone="blue">Este dispositivo</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {device.last_success_at ? `Último aviso ${timeAgo(device.last_success_at)}` : 'Todavía sin avisos'}
                    {device.created_at ? ` · desde el ${formatDate(dayKey(device.created_at))}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => remove(device, info)} aria-label={`Quitar ${info.name}`}
                  className="tap flex shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-coral-soft hover:text-coral">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function NotificationSettings() {
  const { canInvest } = useSession();
  const config = useResource('/api/push/config');
  const { reload, setData: setConfig } = config;
  const install = useInstallState();
  const [pushVersion, setPushVersion] = useState(0);
  const push = usePushState(pushVersion);
  const [prefs, commit] = usePrefs(config.data ? (config.data.prefs ?? {}) : null);

  const refresh = useCallback(() => { setPushVersion((v) => v + 1); reload(); }, [reload]);

  // Si cambian el permiso en los ajustes del teléfono y vuelven, se refleja al instante.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setPushVersion((v) => v + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Control" title="Avisos y app" subtitle="Instalá el portal en tu celular y elegí qué te avisamos." />
      {isDemo() && <DemoNote />}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Section icon={Smartphone} title="App en tu celular" hint="Abrí el portal desde un ícono, como cualquier app."
            chip={install.installed ? <Badge tone="teal" dot>Instalada</Badge> : <Badge tone="slate" dot>En navegador</Badge>}>
            <InstallCard />
          </Section>
          <DeviceSection config={config.data} push={push} prefs={prefs}
            onEnablePrefs={() => prefs && commit({ ...prefs, push_enabled: true })} onChanged={refresh} />
        </div>
        <div className="space-y-4">
          {prefs ? (
            <>
              <CategoriesSection prefs={prefs} commit={commit} canInvest={canInvest} />
              <QuietSection prefs={prefs} commit={commit} />
              <DigestSection prefs={prefs} commit={commit} />
            </>
          ) : (
            <Section icon={Bell} title="Qué te avisamos">
              <PageLoader error={config.error} onRetry={reload} />
            </Section>
          )}
          {config.data && (
            <DevicesSection devices={config.data.devices ?? []} thisDeviceId={push.subscribed ? push.deviceId : null}
              setConfig={setConfig} onChanged={refresh} />
          )}
        </div>
      </div>
    </div>
  );
}
