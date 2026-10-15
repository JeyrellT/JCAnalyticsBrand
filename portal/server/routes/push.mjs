// ============================================================================
//  server/routes/push.mjs
//  Dispositivos con avisos push (suscripciones Web Push) y preferencias de
//  avisos de cada persona. Sin dependencias de Node: también corre en la demo,
//  donde ctx.push es un simulador. Ver docs/v3-contrato.md.
// ============================================================================

import { NOTIFICATION_CATEGORIES } from '../../shared/catalog.js';
import { fail, invalid, has, text } from '../http.mjs';
import { isAllowedPushEndpoint, base64urlInfo, readPrefs, HHMM_RE, unreadBadge } from '../notify-policy.mjs';

/** Máximo de dispositivos por persona: al pasarse, se descartan los más viejos. */
const MAX_DEVICES = 20;

const bool = (value, field) => {
  if (![true, false, 0, 1].includes(value)) invalid(field, 'Debe ser sí o no.');
  return value ? 1 : 0;
};
const hhmm = (value, field) => {
  if (typeof value !== 'string' || !HHMM_RE.test(value)) invalid(field, 'Usar el formato HH:MM (hora de Costa Rica).');
  return value;
};

export function pushRoutes(route, ctx) {
  const { db } = ctx;

  const DEVICE_COLUMNS = 'id, platform, user_agent, created_at, last_success_at';
  const devicesOf = (userId) => db.prepare(`SELECT ${DEVICE_COLUMNS} FROM push_subscriptions WHERE user_id = ? ORDER BY created_at DESC, id DESC`).all(userId);

  route('GET', '/api/push/config', 'user', ({ user }) => ({
    available: !!ctx.push,
    publicKey: ctx.push?.publicKey ?? null,
    devices: devicesOf(user.id),
    prefs: readPrefs(db, user.id),
  }));

  route('POST', '/api/push/subscribe', 'user', ({ user, body, req }) => {
    const sub = body.subscription;
    if (!sub || typeof sub !== 'object' || Array.isArray(sub)) invalid('subscription', 'Suscripción inválida.');
    // Defensa SSRF: el servidor solo hará POST a servicios de push conocidos.
    if (!isAllowedPushEndpoint(sub.endpoint)) invalid('subscription', 'El servicio de avisos de este navegador no está permitido.');
    const p256dh = base64urlInfo(sub.keys?.p256dh);
    if (p256dh.bytes !== 65 || p256dh.value[0] !== 'B') invalid('subscription', 'Clave p256dh inválida (65 bytes en base64url).');
    const auth = base64urlInfo(sub.keys?.auth);
    if (auth.bytes !== 16) invalid('subscription', 'Clave auth inválida (16 bytes en base64url).');
    const platform = text(body.platform, 'platform', { max: 40 });
    const userAgent = String(req?.headers?.['user-agent'] ?? '').slice(0, 200) || null;
    const at = ctx.nowIso();
    // Upsert por endpoint: si el navegador ya estaba registrado (aun a nombre de otra persona), pasa a quien suscribe ahora.
    db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, platform, user_agent, created_at, failures)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(endpoint) DO UPDATE SET
        created_at = CASE WHEN push_subscriptions.user_id = excluded.user_id THEN push_subscriptions.created_at ELSE excluded.created_at END,
        last_success_at = CASE WHEN push_subscriptions.user_id = excluded.user_id THEN push_subscriptions.last_success_at ELSE NULL END,
        user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        platform = excluded.platform, user_agent = excluded.user_agent, failures = 0, last_error = NULL`)
      .run(user.id, sub.endpoint, p256dh.value, auth.value, platform, userAgent, at);
    const device = db.prepare(`SELECT ${DEVICE_COLUMNS} FROM push_subscriptions WHERE endpoint = ?`).get(sub.endpoint);
    const extra = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT -1 OFFSET ?').all(user.id, MAX_DEVICES);
    for (const row of extra) if (row.id !== device.id) db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(row.id);
    return { device };
  });

  route('POST', '/api/push/unsubscribe', 'user', ({ user, body }) => {
    if (typeof body.endpoint !== 'string' || !body.endpoint || body.endpoint.length > 2048) invalid('endpoint', 'Endpoint inválido.');
    const { changes } = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').run(body.endpoint, user.id);
    return { ok: true, removed: changes };
  });

  route('DELETE', '/api/push/devices/:id', 'user', ({ user, params }) => {
    const { changes } = db.prepare('DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?').run(params.id, user.id);
    if (!changes) fail(404, 'not_found');
    return { ok: true, devices: devicesOf(user.id) };
  });

  route('POST', '/api/push/test', 'user', async ({ user }) => {
    const push = ctx.push;
    if (!push) fail(409, 'push_unavailable');
    const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY id').all(user.id);
    const ms = ctx.now();
    const payload = {
      title: 'Prueba de avisos',
      body: `Hola ${user.name.split(' ')[0]}: si ves esto, los avisos llegan a este dispositivo.`,
      url: '/notificaciones',
      tag: `test:${ms}`,
      category: 'prueba',
      // El globo del ícono refleja los avisos sin leer reales (0 lo borraría).
      badge: unreadBadge(db, user),
      ts: ms,
    };
    // La prueba sí espera el resultado (es lo que la persona quiere ver), con tope de tiempo propio del servicio.
    const results = await Promise.all(subs.map(async (sub) => {
      try { return await push.deliver(sub, payload); } catch { return { ok: false }; }
    }));
    const sent = results.filter((r) => r?.ok).length;
    return { sent, failed: results.length - sent, devices: subs.length };
  });

  // ── Preferencias de avisos ────────────────────────────────────────────────
  route('GET', '/api/me/notification-prefs', 'any', ({ user }) => ({ prefs: readPrefs(db, user.id) }));

  route('PATCH', '/api/me/notification-prefs', 'user', ({ user, body }) => {
    const current = readPrefs(db, user.id);
    const next = { ...current, categories: { ...current.categories } };
    if (has(body, 'push_enabled')) next.push_enabled = !!bool(body.push_enabled, 'push_enabled');
    if (has(body, 'digest_enabled')) next.digest_enabled = !!bool(body.digest_enabled, 'digest_enabled');
    for (const key of ['quiet_start', 'quiet_end', 'digest_time']) if (has(body, key)) next[key] = hhmm(body[key], key);
    if (has(body, 'categories')) {
      const cats = body.categories;
      if (!cats || typeof cats !== 'object' || Array.isArray(cats)) invalid('categories', 'Lista de categorías inválida.');
      for (const [cat, on] of Object.entries(cats)) {
        if (!NOTIFICATION_CATEGORIES[cat]) invalid('categories', `Categoría desconocida: ${cat}.`);
        next.categories[cat] = !!bool(on, 'categories');
      }
    }
    db.prepare(`INSERT INTO notification_prefs (user_id, push_enabled, categories, quiet_start, quiet_end, digest_enabled, digest_time, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET push_enabled = excluded.push_enabled, categories = excluded.categories,
        quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end, digest_enabled = excluded.digest_enabled,
        digest_time = excluded.digest_time, updated_at = excluded.updated_at`)
      .run(user.id, next.push_enabled ? 1 : 0, JSON.stringify(next.categories), next.quiet_start, next.quiet_end,
        next.digest_enabled ? 1 : 0, next.digest_time, ctx.nowIso());
    return { prefs: readPrefs(db, user.id) };
  });
}
