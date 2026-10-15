// ============================================================================
//  server/notify-policy.mjs
//  Política de avisos push (compatible con el navegador: corre también en la
//  demo). Decide, por cada aviso que crea ctx.notify, a quién se le envía
//  además como push y con qué contenido. El envío real lo hace ctx.push
//  (server/push.mjs en Node o un simulador en la demo) sin bloquear la
//  respuesta HTTP. Ver docs/v3-contrato.md § "Push: arquitectura".
// ============================================================================

import { NOTIFICATION_CATEGORIES, notificationCategory, canInvest } from '../shared/catalog.js';
import { SENSITIVE_KINDS } from './context.mjs';

/** Servicios de push aceptados (defensa SSRF): el host debe ser uno de estos o un subdominio. */
export const PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

/** true si el endpoint es https, sin credenciales ni puerto raro, y su host está en la lista permitida. */
export function isAllowedPushEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  let u;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  return PUSH_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

const B64URL_RE = /^[A-Za-z0-9_-]+={0,2}$/;
/** Largo en bytes de un texto base64url (o base64 con +/), o -1 si no es válido. Normaliza a base64url sin relleno. */
export function base64urlInfo(value) {
  if (typeof value !== 'string') return { bytes: -1, value: null };
  const v = value.trim().replace(/\+/g, '-').replace(/\//g, '_');
  if (!v || v.length > 200 || !B64URL_RE.test(v)) return { bytes: -1, value: null };
  const bare = v.replace(/=+$/, '');
  if (bare.length % 4 === 1) return { bytes: -1, value: null };
  return { bytes: Math.floor((bare.length * 3) / 4), value: bare };
}

// ── Preferencias ────────────────────────────────────────────────────────────

export const DEFAULT_PREFS = Object.freeze({
  push_enabled: true,
  quiet_start: '21:00',
  quiet_end: '07:00',
  digest_enabled: true,
  digest_time: '07:30',
});

export const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const hhmmToMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Minutos desde la medianoche en Costa Rica (UTC−6 fijo, sin horario de verano). */
export function crMinutes(ms) {
  const d = new Date(ms - 6 * 3_600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Preferencias normalizadas de una persona (valores por defecto si no hay fila). */
export function readPrefs(db, userId) {
  const row = db.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(userId);
  let stored = {};
  try { stored = JSON.parse(row?.categories || '{}') ?? {}; } catch { stored = {}; }
  const categories = {};
  for (const cat of Object.keys(NOTIFICATION_CATEGORIES)) categories[cat] = stored[cat] !== false;
  return {
    push_enabled: row ? !!row.push_enabled : DEFAULT_PREFS.push_enabled,
    categories,
    quiet_start: row && HHMM_RE.test(row.quiet_start) ? row.quiet_start : DEFAULT_PREFS.quiet_start,
    quiet_end: row && HHMM_RE.test(row.quiet_end) ? row.quiet_end : DEFAULT_PREFS.quiet_end,
    digest_enabled: row ? !!row.digest_enabled : DEFAULT_PREFS.digest_enabled,
    digest_time: row && HHMM_RE.test(row.digest_time) ? row.digest_time : DEFAULT_PREFS.digest_time,
    updated_at: row?.updated_at ?? null,
  };
}

/** ¿Está la hora `ms` dentro del horario tranquilo? Soporta ventanas que cruzan la medianoche; inicio = fin = sin horario. */
export function inQuietHours(prefs, ms) {
  const start = hhmmToMinutes(prefs.quiet_start);
  const end = hhmmToMinutes(prefs.quiet_end);
  if (start === end) return false;
  const m = crMinutes(ms);
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/**
 * Motivo por el que NO se envía el push, o null si corresponde enviarlo.
 * El aviso queda en el buzón en todos los casos.
 */
export function pushBlockReason(user, kind, prefs, ms) {
  if (!user || !user.active) return 'inactive';
  if (!prefs.push_enabled) return 'push_disabled';
  const category = notificationCategory(kind);
  if (category === 'dinero' && !canInvest(user)) return 'not_investor';
  if (prefs.categories[category] === false) return 'category_off';
  // En horario tranquilo solo pasan los pedidos de confirmación de dinero.
  if (inQuietHours(prefs, ms) && kind !== 'movement') return 'quiet_hours';
  return null;
}

/** Avisos sin leer que ve esta persona (mismo criterio que el buzón): el número del globo del ícono. */
export function unreadBadge(db, user) {
  const hidden = canInvest(user) ? '' : `AND kind NOT IN (${SENSITIVE_KINDS.map((k) => `'${k}'`).join(',')})`;
  return db.prepare(`SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL ${hidden}`).get(user.id).n;
}

const clip = (value, max) => {
  const s = String(value ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

/** Contenido del push (JSON pequeño: muy por debajo de 3 KB aun con acentos y emojis). */
export function buildPushPayload({ kind, title, body, link, id }, { badge, ts }) {
  return {
    title: clip(title, 120),
    body: clip(body ?? '', 300),
    url: link || '/buzon',
    tag: clip(`${kind}:${link || id}`, 120),
    category: notificationCategory(kind),
    badge,
    ts,
  };
}

/** Envía sin esperar ni dejar escapar errores (ni síncronos ni de la promesa). */
export function fireAndForget(push, sub, payload) {
  try {
    const pending = push.deliver(sub, payload);
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch { /* el push es un extra: nunca rompe la acción */ }
}

/**
 * Registra el gancho de push en el contexto. Por cada aviso creado por
 * ctx.notify decide destinatario por destinatario y dispara los envíos sin
 * bloquear la respuesta. ctx.push se lee en cada aviso (la demo puede
 * asignarlo después).
 */
export function installPushDispatch(ctx) {
  const { db } = ctx;
  ctx.setPushHook((userIds, notification) => {
    const push = ctx.push;
    if (!push || typeof push.deliver !== 'function') return;
    const ms = ctx.now();
    for (const userId of userIds) {
      try {
        const user = db.prepare('SELECT id, role, active FROM users WHERE id = ?').get(userId);
        if (pushBlockReason(user, notification.kind, readPrefs(db, userId), ms)) continue;
        const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY id').all(userId);
        if (!subs.length) continue;
        const payload = buildPushPayload({ ...notification, id: notification.ids?.[userId] ?? '' }, { badge: unreadBadge(db, user), ts: ms });
        for (const sub of subs) fireAndForget(push, sub, payload);
      } catch { /* un destinatario con problemas no frena a los demás */ }
    }
  });
}
