// App instalable (PWA) y avisos push del portal.
//   · registerServiceWorker(): solo en producción y fuera de la demo (lo llama main.jsx).
//   · useInstallState() → { canInstall, installed, standalone, platform, iosNeedsInstall, dismissed, demo } y promptInstall().
//   · pushSupport(), getPermission(), getPushState(), subscribePush(), unsubscribePush(), sendTest().
//   · setBadge(n) / useAppBadge(n): número sobre el ícono de la app instalada.
// Todo está protegido con detección de funciones y try/catch: si algo no existe, el portal sigue igual.
// En la demo (isDemo()) no se toca el navegador: los avisos se simulan con la API de la demo.
import { useEffect, useSyncExternalStore } from 'react';
import { api, isDemo, errorMessage, ApiError } from './api.js';
import { navigate } from './router.jsx';

const hasWindow = typeof window !== 'undefined' && typeof navigator !== 'undefined';
const META_CACHE = 'jcp-meta';            // mismo nombre que en public/sw.js
const META_URL = '/__portal/push-meta';
const DEVICE_KEY = 'jcp:push-device';
const DISMISS_KEY = 'jcp:install-dismissed';
const DISMISS_DAYS = 21;

// ── Plataforma ──────────────────────────────────────────────────────────────
/** 'ios' (iPhone/iPad), 'android' o 'desktop'. */
export function detectPlatform() {
  if (!hasWindow) return 'desktop';
  const ua = navigator.userAgent || '';
  const iPadDesktopMode = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPadOS se presenta como Mac
  if (/iPhone|iPad|iPod/i.test(ua) || iPadDesktopMode) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
export const isIOS = () => detectPlatform() === 'ios';

/** ¿Corre como app instalada (desde el ícono de inicio)? */
export function isStandalone() {
  if (!hasWindow) return false;
  try {
    if (['standalone', 'fullscreen', 'minimal-ui'].some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
  } catch { /* matchMedia no disponible */ }
  return navigator.standalone === true;
}

/** Versión de iOS (17.4 → 17.04) o null si no se sabe (iPad en modo escritorio). */
function iosVersion() {
  const m = /OS (\d+)[_.](\d+)/.exec(navigator.userAgent || '');
  return m ? Number(m[1]) + Number(m[2]) / 100 : null;
}

// ── Instalación ─────────────────────────────────────────────────────────────
let deferredPrompt = null;
let justInstalled = false;
let installSnapshot = null;
const installListeners = new Set();

function installDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function computeInstall() {
  const demo = isDemo();
  const platform = detectPlatform();
  const standalone = !demo && isStandalone();
  const installed = standalone || (!demo && justInstalled);
  return {
    platform,
    installed,
    standalone,
    canInstall: !demo && !installed && deferredPrompt !== null,
    iosNeedsInstall: !demo && platform === 'ios' && !installed,
    dismissed: installDismissed(),
    demo,
  };
}

function emitInstall() {
  installSnapshot = computeInstall();
  installListeners.forEach((fn) => fn());
}

const subscribeInstall = (fn) => { installListeners.add(fn); return () => installListeners.delete(fn); };
const getInstallSnapshot = () => {
  installSnapshot ??= computeInstall();
  return installSnapshot;
};

if (hasWindow) {
  window.addEventListener('beforeinstallprompt', (event) => {
    if (isDemo()) return;
    event.preventDefault(); // mostramos nuestro propio botón "Instalar"
    deferredPrompt = event;
    emitInstall();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    justInstalled = true;
    emitInstall();
  });
  try { window.matchMedia('(display-mode: standalone)').addEventListener('change', emitInstall); } catch { /* navegador viejo */ }
}

/** Estado de instalación para la interfaz (se actualiza solo). */
export const useInstallState = () => useSyncExternalStore(subscribeInstall, getInstallSnapshot);

/** Abre el diálogo de instalación de Chrome/Edge. Devuelve 'accepted' | 'dismissed' | 'unavailable' | 'error'. */
export async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return 'unavailable';
  deferredPrompt = null; // cada evento sirve una sola vez
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice?.outcome === 'accepted') justInstalled = true;
    return choice?.outcome ?? 'dismissed';
  } catch {
    return 'error';
  } finally {
    emitInstall();
  }
}

/** "Ahora no": oculta el aviso de instalación por unas semanas en este navegador. */
export function dismissInstall() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* almacenamiento bloqueado */ }
  emitInstall();
}

// ── Service worker ──────────────────────────────────────────────────────────
let registered = false;

export function registerServiceWorker() {
  if (registered || !hasWindow || !('serviceWorker' in navigator) || !import.meta.env.PROD || isDemo()) return;
  registered = true;
  try {
    navigator.serviceWorker.addEventListener('message', onWorkerMessage);
    navigator.serviceWorker.startMessages?.();
  } catch { /* sin mensajes del SW */ }
  const start = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((registration) => {
      // La app puede quedar abierta días: al volver a ella busca una versión nueva (máximo una vez por hora).
      let checkedAt = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - checkedAt < 3_600_000) return;
        checkedAt = Date.now();
        registration.update().catch(() => {});
      });
    }).catch(() => { /* sin SW el portal funciona igual, sin avisos ni modo sin conexión */ });
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

function onWorkerMessage(event) {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'portal:navigate' && typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')) {
    // Tocaron un aviso con el portal abierto: cambiamos de sección sin recargar.
    navigate(data.url);
    event.ports?.[0]?.postMessage(true);
  } else if (data.type === 'portal:push') {
    window.dispatchEvent(new CustomEvent('portal:push', { detail: { category: data.category ?? null } }));
  }
}

/** Llama fn cuando llega un aviso push con el portal abierto (p. ej. para refrescar el buzón). */
export function onPortalPush(fn) {
  if (!hasWindow) return () => {};
  window.addEventListener('portal:push', fn);
  return () => window.removeEventListener('portal:push', fn);
}

async function getRegistration({ create = false } = {}) {
  if (!hasWindow || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing || !create || !import.meta.env.PROD) return existing ?? null;
    return await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  } catch {
    return null;
  }
}

async function activeRegistration() {
  const registration = await getRegistration({ create: true });
  if (!registration) throw new PushError('unsupported');
  if (registration.active) return registration;
  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => { setTimeout(() => resolve(null), 10_000); }),
  ]);
  if (!ready) throw new PushError('sw-timeout');
  return ready;
}

// ── Avisos push ─────────────────────────────────────────────────────────────
export class PushError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/**
 * ¿Puede este navegador recibir avisos? → { supported, reason, demo }
 * reason: 'ios-install' (iPhone sin instalar) · 'ios-old' (< iOS 16.4) · 'unsupported' · 'insecure' · 'dev'
 */
export function pushSupport() {
  if (isDemo()) return { supported: true, reason: null, demo: true };
  if (!hasWindow || !window.isSecureContext) return { supported: false, reason: 'insecure' };
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'unsupported' };
  if (detectPlatform() === 'ios') {
    const version = iosVersion();
    if (version !== null && version < 16.04) return { supported: false, reason: 'ios-old' };
    if (!isStandalone()) return { supported: false, reason: 'ios-install' };
  }
  if (!('PushManager' in window) || !('Notification' in window)) return { supported: false, reason: 'unsupported' };
  if (!import.meta.env.PROD) return { supported: false, reason: 'dev' };
  return { supported: true, reason: null };
}

/** 'default' | 'granted' | 'denied' | 'unsupported' */
export function getPermission() {
  if (isDemo()) return demoPush.endpoint ? 'granted' : 'default';
  try {
    return hasWindow && 'Notification' in window ? Notification.permission : 'unsupported';
  } catch {
    return 'unsupported';
  }
}

/** Estado local: { permission, subscribed, endpoint, deviceId }. deviceId es el id del portal guardado al activar. */
export async function getPushState() {
  const permission = getPermission();
  if (isDemo()) return { permission, subscribed: Boolean(demoPush.endpoint), endpoint: demoPush.endpoint, deviceId: demoPush.endpoint ? storedDeviceId() : null };
  const empty = { permission, subscribed: false, endpoint: null, deviceId: null };
  if (!pushSupport().supported) return empty;
  try {
    const registration = await getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    if (!subscription || permission !== 'granted') return empty;
    return { permission, subscribed: true, endpoint: subscription.endpoint, deviceId: storedDeviceId() };
  } catch {
    return empty;
  }
}

/**
 * Activa los avisos en este dispositivo. Llamar DIRECTO desde un toque/clic:
 * iPhone solo pide permiso dentro de un gesto, por eso el permiso va antes de cualquier espera.
 */
export async function subscribePush() {
  if (isDemo()) return subscribeDemo();
  const support = pushSupport();
  if (!support.supported) throw new PushError(support.reason);
  let permission = Notification.permission;
  if (permission !== 'granted') permission = await requestPermission();
  if (permission !== 'granted') throw new PushError(permission === 'denied' ? 'denied' : 'dismissed');

  const [registration, config] = await Promise.all([activeRegistration(), api('/api/push/config')]);
  if (!config?.available || !config.publicKey) throw new PushError('server-off');
  const key = base64UrlToBytes(config.publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription.options?.applicationServerKey, key)) {
    // El servidor cambió de clave: la suscripción vieja ya no sirve.
    await subscription.unsubscribe().catch(() => {});
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const platform = detectPlatform();
  const result = await api('/api/push/subscribe', { method: 'POST', body: { subscription: subscription.toJSON(), platform } });
  rememberDevice(result?.device?.id ?? null);
  await rememberPushMeta(config.publicKey, platform);
  return { device: result?.device ?? null, endpoint: subscription.endpoint };
}

/** Apaga los avisos en este dispositivo (en el portal y en el navegador). */
export async function unsubscribePush() {
  if (isDemo()) return unsubscribeDemo();
  const registration = await getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription().catch(() => null) : null;
  if (subscription) {
    // Si el portal no responde, igual se borra cuando el envío falle (410).
    await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } }).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  }
  rememberDevice(null);
  return true;
}

/** Después de quitar ESTE dispositivo desde la lista: borra la suscripción local sin llamar a la API. */
export async function forgetLocalSubscription() {
  rememberDevice(null);
  if (isDemo()) { demoPush.endpoint = null; return; }
  try {
    const registration = await getRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    await subscription?.unsubscribe();
  } catch { /* nada que borrar */ }
}

/** Envía un aviso de prueba a todos mis dispositivos → { sent, failed, devices }. */
export const sendTest = () => api('/api/push/test', { method: 'POST' });

const PUSH_MESSAGES = {
  denied: 'El navegador bloqueó los avisos. Activalos en los ajustes del navegador y probá de nuevo.',
  dismissed: 'No diste permiso para los avisos. Podés probar de nuevo cuando quieras.',
  'server-off': 'El servidor todavía no tiene avisos activos.',
  'ios-install': 'En iPhone primero instalá la app: Compartir → "Agregar a inicio".',
  'ios-old': 'Los avisos necesitan iOS 16.4 o más nuevo.',
  unsupported: 'Este navegador no permite avisos.',
  insecure: 'Los avisos necesitan una conexión segura (https).',
  dev: 'En modo desarrollo no hay avisos: probalo en el portal publicado.',
  'sw-timeout': 'No pudimos preparar la app. Recargá la página e intentá de nuevo.',
};

/** Mensaje legible para errores de subscribePush/unsubscribePush/sendTest. */
export function pushErrorMessage(error) {
  if (error instanceof PushError) return PUSH_MESSAGES[error.code] ?? 'No pudimos activar los avisos.';
  if (error instanceof ApiError) {
    if (error.data?.error === 'push_unavailable') return PUSH_MESSAGES['server-off'];
    return errorMessage(error);
  }
  if (error?.name === 'NotAllowedError') return PUSH_MESSAGES.denied;
  return 'No pudimos activar los avisos. Intentá de nuevo en un momento.';
}

function requestPermission() {
  return new Promise((resolve) => {
    try {
      // Safari viejo usa callback; el resto, promesa.
      const result = Notification.requestPermission(resolve);
      if (result && typeof result.then === 'function') result.then(resolve, () => resolve('default'));
    } catch {
      resolve('default');
    }
  });
}

function base64UrlToBytes(value) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function sameKey(buffer, bytes) {
  if (!buffer) return true; // el navegador no la expone: asumimos la misma
  const current = new Uint8Array(buffer);
  return current.length === bytes.length && current.every((b, i) => b === bytes[i]);
}

let memoryDeviceId = null;
function rememberDevice(id) {
  memoryDeviceId = id;
  try {
    if (id == null) localStorage.removeItem(DEVICE_KEY);
    else localStorage.setItem(DEVICE_KEY, String(id));
  } catch { /* almacenamiento bloqueado */ }
}
function storedDeviceId() {
  try {
    const value = localStorage.getItem(DEVICE_KEY);
    if (value != null) return Number(value);
  } catch { /* almacenamiento bloqueado */ }
  return memoryDeviceId;
}

/** El SW la necesita para renovar la suscripción por su cuenta (pushsubscriptionchange). */
async function rememberPushMeta(publicKey, platform) {
  try {
    const cache = await caches.open(META_CACHE);
    await cache.put(META_URL, new Response(JSON.stringify({ publicKey, platform }), { headers: { 'Content-Type': 'application/json' } }));
  } catch { /* sin Cache Storage */ }
}

// ── Demo: dispositivo simulado (la demo muestra el aviso dentro de la página) ─
const demoPush = { endpoint: null };

function randomBase64Url(length, first) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  if (first != null) bytes[0] = first;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function subscribeDemo() {
  const endpoint = demoPush.endpoint ?? `https://fcm.googleapis.com/fcm/send/demo-${randomBase64Url(12)}`;
  const subscription = { endpoint, expirationTime: null, keys: { p256dh: randomBase64Url(65, 4), auth: randomBase64Url(16) } };
  const result = await api('/api/push/subscribe', { method: 'POST', body: { subscription, platform: detectPlatform() } });
  demoPush.endpoint = endpoint;
  rememberDevice(result?.device?.id ?? null);
  return { device: result?.device ?? null, endpoint };
}

async function unsubscribeDemo() {
  if (demoPush.endpoint) await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: demoPush.endpoint } }).catch(() => {});
  demoPush.endpoint = null;
  rememberDevice(null);
  return true;
}

// ── Globo del ícono ─────────────────────────────────────────────────────────
/** Número sobre el ícono de la app instalada (0 lo borra). Sin efecto donde no se soporta. */
export function setBadge(count) {
  if (!hasWindow || isDemo()) return;
  try {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (n > 0 && 'setAppBadge' in navigator) navigator.setAppBadge(n).catch(() => {});
    else if (n === 0 && 'clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
  } catch { /* no soportado */ }
}

/** Mantiene el globo del ícono igual a count (p. ej. avisos sin leer). */
export function useAppBadge(count) {
  useEffect(() => { setBadge(count); }, [count]);
}
