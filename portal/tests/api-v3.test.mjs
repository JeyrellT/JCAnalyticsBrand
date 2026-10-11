// v3: avisos push, preferencias, automatizaciones y tareas recurrentes (docs/v3-contrato.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { startServer, fakePush } from './helpers.mjs';
import { createPushService } from '../server/push.mjs';
import { inQuietHours, pushBlockReason, isAllowedPushEndpoint, readPrefs, DEFAULT_PREFS } from '../server/notify-policy.mjs';
import { parseExchangeRate, ruleDueOn, recurringSummary } from '../server/automations.mjs';
import { NOTIFICATION_CATEGORIES, AUTOMATIONS, notificationCategory } from '../shared/catalog.js';

const KEYS = ['resumen_diario', 'recordatorio_citas', 'cita_sin_confirmar', 'avance_72h', 'tareas_vencen', 'dinero_pendiente', 'fin_soporte', 'tareas_recurrentes', 'tipo_cambio'];
/** Hora de Costa Rica (UTC−6) → ms. */
const cr = (date, hhmm) => Date.parse(`${date}T${hhmm}:00-06:00`);
const HOUR = 3_600_000;

/** Servidor nuevo con 4 personas (admin, 2 socios, colaboradora) y sesiones abiertas. */
async function world({ push = fakePush(), fetchExchangeRate = null, startAt = cr('2026-10-12', '09:00') } = {}) {
  const env = await startServer({ push, fetchExchangeRate, startAt });
  const ids = {
    admin: env.addUser('jeyrell@jc.test', 'Jeyrell Tardencilla', 'admin'),
    ana: env.addUser('ana@jc.test', 'Ana Mora', 'socio'),
    beto: env.addUser('beto@jc.test', 'Beto Solís', 'socio'),
    cata: env.addUser('cata@jc.test', 'Hillary Porras', 'colaborador'),
  };
  // Las pruebas adelantan el reloj días enteros: si la sesión venció (12 h sin uso), se vuelve a entrar.
  const as = async (email) => {
    const c = env.client();
    const r = await c.login(email);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const call = async (method, path, body) => {
      let res = await c.call(method, path, body);
      if (res.status === 401) {
        await c.login(email);
        res = await c.call(method, path, body);
      }
      return res;
    };
    return {
      get: (p) => call('GET', p), post: (p, b = {}) => call('POST', p, b), patch: (p, b = {}) => call('PATCH', p, b), del: (p) => call('DELETE', p),
    };
  };
  const api = {
    admin: await as('jeyrell@jc.test'), ana: await as('ana@jc.test'), beto: await as('beto@jc.test'), cata: await as('cata@jc.test'),
  };
  const engine = env.ctx.automations;
  const at = (ms) => { env.clock.t = ms; };
  const inbox = async (who) => (await api[who].get('/api/notifications')).data.notifications;
  const log = () => env.db.prepare('SELECT * FROM automation_log ORDER BY id').all();
  return { env, ids, api, push, engine, at, inbox, log, close: () => env.close() };
}

function keys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') };
}
const subscription = (endpoint, k = keys()) => ({ subscription: { endpoint, keys: k }, platform: 'android' });
const FCM = (id = randomBytes(6).toString('hex')) => `https://fcm.googleapis.com/fcm/send/${id}`;
const deliveriesTo = (w, userId) => w.push.deliveries.filter((d) => d.sub.user_id === userId);

// ── Dispositivos ────────────────────────────────────────────────────────────

test('push: suscribir valida la lista permitida (SSRF) y el largo de las claves', async () => {
  const w = await world();
  try {
    const bad = [
      undefined,
      { endpoint: FCM() },
      'https://fcm.googleapis.com/fcm/send/x',
      { endpoint: 'http://fcm.googleapis.com/fcm/send/x', keys: keys() },
      { endpoint: 'https://evil.example.com/push', keys: keys() },
      { endpoint: 'https://fcm.googleapis.com.evil.net/x', keys: keys() },
      { endpoint: 'https://evilpush.apple.com/x', keys: keys() },
      { endpoint: 'https://127.0.0.1/push', keys: keys() },
      { endpoint: 'https://169.254.169.254/latest/meta-data', keys: keys() },
      { endpoint: 'https://user:pw@fcm.googleapis.com/fcm/send/x', keys: keys() },
      { endpoint: 'https://fcm.googleapis.com:8443/fcm/send/x', keys: keys() },
      { endpoint: 'no es una url', keys: keys() },
      { endpoint: FCM(), keys: { ...keys(), p256dh: keys().p256dh.slice(0, 80) } },
      { endpoint: FCM(), keys: { ...keys(), p256dh: `A${keys().p256dh.slice(1)}` } },
      { endpoint: FCM(), keys: { ...keys(), auth: randomBytes(15).toString('base64url') } },
      { endpoint: FCM(), keys: { ...keys(), auth: 'no!válido#' } },
      { endpoint: FCM(), keys: { p256dh: keys().p256dh } },
    ];
    for (const sub of bad) {
      const r = await w.api.ana.post('/api/push/subscribe', { subscription: sub });
      assert.equal(r.status, 400, JSON.stringify(sub));
      assert.equal(r.data.field, 'subscription', JSON.stringify(sub));
    }
    const good = [
      FCM(), 'https://android.googleapis.com/gcm/send/x', 'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/QGx', 'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ];
    for (const endpoint of good) {
      const r = await w.api.ana.post('/api/push/subscribe', subscription(endpoint));
      assert.equal(r.status, 200, `${endpoint} ${JSON.stringify(r.data)}`);
      assert.deepEqual(Object.keys(r.data.device).sort(), ['created_at', 'id', 'last_success_at', 'platform', 'user_agent']);
    }
    // Claves en base64 estándar con relleno también sirven (se guardan como base64url).
    const k = keys();
    const padded = { p256dh: `${Buffer.from(k.p256dh, 'base64url').toString('base64')}`, auth: Buffer.from(k.auth, 'base64url').toString('base64') };
    assert.equal((await w.api.ana.post('/api/push/subscribe', subscription(FCM('padded'), padded))).status, 200);
    assert.equal(w.env.db.prepare('SELECT p256dh FROM push_subscriptions WHERE endpoint = ?').get(FCM('padded')).p256dh, k.p256dh);
    assert.ok(isAllowedPushEndpoint('https://fcm.googleapis.com/x'));
    assert.ok(!isAllowedPushEndpoint('https://xfcm.googleapis.com/x'));
  } finally { await w.close(); }
});

test('push: upsert por endpoint, baja solo de lo propio y lista de dispositivos', async () => {
  const w = await world();
  try {
    const endpoint = FCM('shared');
    const first = (await w.api.ana.post('/api/push/subscribe', subscription(endpoint))).data.device;
    const again = (await w.api.ana.post('/api/push/subscribe', { ...subscription(endpoint), platform: 'iphone' })).data.device;
    assert.equal(again.id, first.id, 'mismo endpoint = mismo dispositivo');
    assert.equal(again.platform, 'iphone');
    assert.equal(w.env.db.prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n, 1);

    // El mismo navegador pasa a otra persona: se reasigna.
    const moved = (await w.api.beto.post('/api/push/subscribe', subscription(endpoint))).data.device;
    assert.equal(moved.id, first.id);
    assert.equal((await w.api.ana.get('/api/push/config')).data.devices.length, 0);
    const config = (await w.api.beto.get('/api/push/config')).data;
    assert.equal(config.available, true);
    assert.equal(config.publicKey, w.push.publicKey);
    assert.deepEqual(config.devices.map((d) => d.id), [first.id]);
    assert.ok(!('endpoint' in config.devices[0]) && !('p256dh' in config.devices[0]) && !('auth' in config.devices[0]));
    assert.equal(config.prefs.push_enabled, true);

    // Ana no puede dar de baja el dispositivo de Beto (ni por endpoint ni por id).
    assert.deepEqual((await w.api.ana.post('/api/push/unsubscribe', { endpoint })).data, { ok: true, removed: 0 });
    assert.equal((await w.api.ana.del(`/api/push/devices/${first.id}`)).status, 404);
    assert.equal(w.env.db.prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n, 1);
    assert.equal((await w.api.ana.post('/api/push/unsubscribe', {})).status, 400);
    assert.deepEqual((await w.api.beto.post('/api/push/unsubscribe', { endpoint })).data, { ok: true, removed: 1 });

    const dev = (await w.api.beto.post('/api/push/subscribe', subscription(FCM()))).data.device;
    const del = await w.api.beto.del(`/api/push/devices/${dev.id}`);
    assert.equal(del.status, 200);
    assert.deepEqual(del.data.devices, []);
    assert.equal((await w.env.client().get('/api/push/config')).status, 401);
  } finally { await w.close(); }
});

test('push: prueba de avisos, /api/me y servidor sin push (409)', async () => {
  const w = await world();
  try {
    assert.deepEqual((await w.api.ana.post('/api/push/test')).data, { sent: 0, failed: 0, devices: 0 });
    await w.api.ana.post('/api/push/subscribe', subscription(FCM()));
    await w.api.ana.post('/api/push/subscribe', subscription(FCM()));
    assert.deepEqual((await w.api.ana.post('/api/push/test')).data, { sent: 2, failed: 0, devices: 2 });
    const payload = w.push.deliveries.at(-1).payload;
    assert.equal(payload.url, '/notificaciones');
    assert.ok(payload.title && payload.tag.startsWith('test:'));
    assert.equal((await w.api.ana.get('/api/me')).data.push_available, true);
  } finally { await w.close(); }

  const failing = await world({ push: fakePush({ result: { ok: false, status: 500, gone: false } }) });
  try {
    await failing.api.ana.post('/api/push/subscribe', subscription(FCM()));
    assert.deepEqual((await failing.api.ana.post('/api/push/test')).data, { sent: 0, failed: 1, devices: 1 });
  } finally { await failing.close(); }

  const none = await world({ push: null });
  try {
    const r = await none.api.ana.post('/api/push/test');
    assert.equal(r.status, 409);
    assert.equal(r.data.error, 'push_unavailable');
    assert.equal((await none.api.ana.get('/api/me')).data.push_available, false);
    const config = (await none.api.ana.get('/api/push/config')).data;
    assert.equal(config.available, false);
    assert.equal(config.publicKey, null);
    // Sin push los avisos siguen llegando al buzón.
    await none.api.beto.post('/api/tasks', { title: 'Revisar factura', assignee_id: none.ids.ana });
    assert.equal((await none.inbox('ana')).length, 1);
  } finally { await none.close(); }
});

test('push: las claves VAPID nunca salen por la API', async () => {
  const w = await world();
  try {
    const real = createPushService({ db: w.env.db, env: {}, now: () => w.env.clock.t, logger: { error() {} } });
    w.env.ctx.push = real; // la demo también reemplaza ctx.push después de crear el contexto
    const secrets = w.env.db.prepare('SELECT value FROM app_secrets').all().map((r) => r.value);
    assert.equal(secrets.length, 2);
    const privateKey = w.env.db.prepare("SELECT value FROM app_secrets WHERE key = 'vapid_private_key'").get().value;
    for (const path of ['/api/settings', '/api/me', '/api/push/config', '/api/automations', '/api/me/notification-prefs']) {
      const r = await w.api.admin.get(path);
      assert.equal(r.status, 200, path);
      const raw = JSON.stringify(r.data);
      assert.ok(!raw.includes(privateKey), `${path} no expone la clave privada`);
      assert.ok(!/vapid/i.test(raw), `${path} no menciona secretos VAPID`);
    }
    assert.equal((await w.api.admin.get('/api/push/config')).data.publicKey, real.publicKey);
  } finally { await w.close(); }
});

// ── Preferencias y política ─────────────────────────────────────────────────

test('preferencias: valores por defecto, validación y PATCH parcial', async () => {
  const w = await world();
  try {
    const defaults = (await w.api.cata.get('/api/me/notification-prefs')).data.prefs;
    assert.equal(defaults.push_enabled, true);
    assert.equal(defaults.digest_enabled, true);
    assert.equal(defaults.quiet_start, '21:00');
    assert.equal(defaults.quiet_end, '07:00');
    assert.equal(defaults.digest_time, '07:30');
    assert.deepEqual(Object.keys(defaults.categories).sort(), Object.keys(NOTIFICATION_CATEGORIES).sort());
    assert.ok(Object.values(defaults.categories).every((v) => v === true));

    const cases = [
      [{ quiet_start: '25:00' }, 'quiet_start'], [{ quiet_end: '7:00' }, 'quiet_end'], [{ digest_time: '07:30:00' }, 'digest_time'],
      [{ push_enabled: 'sí' }, 'push_enabled'], [{ digest_enabled: 2 }, 'digest_enabled'],
      [{ categories: { spam: true } }, 'categories'], [{ categories: { tareas: 'no' } }, 'categories'], [{ categories: ['tareas'] }, 'categories'],
    ];
    for (const [body, field] of cases) {
      const r = await w.api.cata.patch('/api/me/notification-prefs', body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.equal(r.data.field, field);
    }
    let prefs = (await w.api.cata.patch('/api/me/notification-prefs', { categories: { tareas: false } })).data.prefs;
    assert.equal(prefs.categories.tareas, false);
    assert.equal(prefs.categories.agenda, true);
    prefs = (await w.api.cata.patch('/api/me/notification-prefs', { quiet_start: '22:30', digest_enabled: false })).data.prefs;
    assert.equal(prefs.categories.tareas, false, 'un PATCH parcial no pisa lo demás');
    assert.equal(prefs.quiet_start, '22:30');
    assert.equal(prefs.digest_enabled, false);
    assert.ok(prefs.updated_at);
    assert.deepEqual((await w.api.cata.get('/api/push/config')).data.prefs, prefs);

    // Con contraseña temporal se pueden ver (acceso "any") pero no cambiar.
    w.env.addUser('nuevo@jc.test', 'Nuevo', 'colaborador', 1);
    const nuevo = w.env.client();
    await nuevo.login('nuevo@jc.test');
    assert.equal((await nuevo.get('/api/me/notification-prefs')).status, 200);
    assert.equal((await nuevo.patch('/api/me/notification-prefs', { push_enabled: false })).status, 403);
  } finally { await w.close(); }
});

test('política: categoría, push apagado, horario tranquilo y dinero solo para socios', async () => {
  const w = await world();
  try {
    await w.api.ana.post('/api/push/subscribe', subscription(FCM('ana')));
    await w.api.cata.post('/api/push/subscribe', subscription(FCM('cata')));

    // 09:00 CR: llega el push con el contenido del contrato.
    const task = (await w.api.beto.post('/api/tasks', { title: 'Enviar avance', assignee_id: w.ids.ana })).data.task;
    let mine = deliveriesTo(w, w.ids.ana);
    assert.equal(mine.length, 1, 'el envío se dispara al crear el aviso');
    const p = mine[0].payload;
    assert.deepEqual(Object.keys(p).sort(), ['badge', 'body', 'category', 'tag', 'title', 'ts', 'url']);
    assert.equal(p.title, 'Nueva tarea: Enviar avance');
    assert.equal(p.url, `/tablero?tarea=${task.id}`);
    assert.equal(p.tag, `task:/tablero?tarea=${task.id}`);
    assert.equal(p.category, 'tareas');
    assert.equal(p.badge, 1, 'globo = avisos sin leer de esa persona');
    assert.equal(p.ts, w.env.clock.t);

    // Categoría apagada: nada de push, pero el aviso queda en el buzón.
    await w.api.ana.patch('/api/me/notification-prefs', { categories: { tareas: false } });
    await w.api.beto.post('/api/tasks', { title: 'Otra tarea', assignee_id: w.ids.ana });
    assert.equal(deliveriesTo(w, w.ids.ana).length, 1);
    assert.equal((await w.inbox('ana')).length, 2);
    await w.api.ana.patch('/api/me/notification-prefs', { categories: { tareas: true }, push_enabled: false });
    await w.api.beto.post('/api/tasks', { title: 'Tercera tarea', assignee_id: w.ids.ana });
    assert.equal(deliveriesTo(w, w.ids.ana).length, 1, 'push apagado');
    await w.api.ana.patch('/api/me/notification-prefs', { push_enabled: true });

    // Horario tranquilo (21:00–07:00 CR): sin push, salvo pedidos de confirmación de dinero.
    w.at(cr('2026-10-12', '22:15'));
    await w.api.beto.post('/api/appointments', { title: 'Demo nocturna', kind: 'demo', starts_at: '2026-10-14T16:00:00Z', ends_at: '2026-10-14T17:00:00Z', attendees: [w.ids.ana, w.ids.beto] });
    assert.equal(deliveriesTo(w, w.ids.ana).length, 1, 'cita en horario tranquilo: solo buzón');
    const inv = (await w.api.beto.post('/api/investments', { name: 'Pauta Q4', category: 'marketing', currency: 'CRC' })).data.investment;
    await w.api.beto.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: w.ids.ana, amount: 100_000_00, message: 'Mi parte de la pauta' });
    mine = deliveriesTo(w, w.ids.ana);
    assert.equal(mine.length, 2, 'el pedido de confirmación pasa el horario tranquilo');
    assert.equal(mine[1].payload.category, 'dinero');
    w.at(cr('2026-10-13', '07:00'));
    await w.api.beto.post('/api/tasks', { title: 'Mañanera', assignee_id: w.ids.ana });
    assert.equal(deliveriesTo(w, w.ids.ana).length, 3, 'a las 07:00 termina el horario tranquilo');

    // Colaboradora: nunca recibe push de dinero (ni siquiera si se le intenta avisar).
    w.env.ctx.notify([w.ids.cata], null, { kind: 'investment', title: 'Nueva inversión', link: '/inversiones/1' });
    w.env.ctx.notify([w.ids.cata], null, { kind: 'automation', title: 'Alerta', body: 'x'.repeat(5000) });
    const cata = deliveriesTo(w, w.ids.cata);
    assert.equal(cata.length, 1);
    assert.equal(cata[0].payload.category, 'automatizaciones');
    assert.equal(cata[0].payload.url, '/buzon', 'sin enlace va al buzón');
    assert.match(cata[0].payload.tag, /^automation:\d+$/, 'sin enlace la etiqueta usa el id del aviso');
    assert.ok(Buffer.byteLength(JSON.stringify(cata[0].payload)) <= 3072, 'payload ≤ 3 KB');
  } finally { await w.close(); }
});

test('política: reglas puras (ventana que cruza la medianoche, categorías, inactivos)', () => {
  const at = (hhmm) => cr('2026-10-12', hhmm);
  const night = { ...DEFAULT_PREFS, categories: {} };
  assert.ok(inQuietHours(night, at('21:00')));
  assert.ok(inQuietHours(night, at('23:59')));
  assert.ok(inQuietHours(night, at('00:30')));
  assert.ok(inQuietHours(night, at('06:59')));
  assert.ok(!inQuietHours(night, at('07:00')));
  assert.ok(!inQuietHours(night, at('20:59')));
  const siesta = { ...night, quiet_start: '13:00', quiet_end: '15:00' };
  assert.ok(inQuietHours(siesta, at('14:00')));
  assert.ok(!inQuietHours(siesta, at('15:00')));
  assert.ok(!inQuietHours({ ...night, quiet_start: '00:00', quiet_end: '00:00' }, at('03:00')), 'inicio = fin: sin horario tranquilo');

  const prefs = { ...night, categories: { tareas: true, dinero: true } };
  const socio = { role: 'socio', active: 1 };
  const colab = { role: 'colaborador', active: 1 };
  assert.equal(pushBlockReason(socio, 'task', prefs, at('10:00')), null);
  assert.equal(pushBlockReason(colab, 'movement', prefs, at('10:00')), 'not_investor');
  assert.equal(pushBlockReason(colab, 'message', prefs, at('10:00')), 'not_investor');
  assert.equal(pushBlockReason(socio, 'movement', prefs, at('23:00')), null);
  assert.equal(pushBlockReason(socio, 'investment', prefs, at('23:00')), 'quiet_hours');
  assert.equal(pushBlockReason({ ...socio, active: 0 }, 'task', prefs, at('10:00')), 'inactive');
  assert.equal(pushBlockReason(socio, 'digest', { ...prefs, categories: { resumen: false } }, at('10:00')), 'category_off');
  for (const [cat, meta] of Object.entries(NOTIFICATION_CATEGORIES)) for (const kind of meta.kinds) assert.equal(notificationCategory(kind), cat);
  assert.deepEqual(Object.keys(AUTOMATIONS), KEYS);
});

test('política: el push nunca bloquea ni rompe la acción', async () => {
  const hanging = { publicKey: 'x', deliver: () => new Promise(() => {}) };
  const throwing = { publicKey: 'x', deliver: () => { throw new Error('boom'); } };
  const rejecting = { publicKey: 'x', deliver: () => Promise.reject(new Error('boom')) };
  for (const push of [hanging, throwing, rejecting]) {
    const w = await world({ push });
    try {
      await w.api.ana.post('/api/push/subscribe', subscription(FCM()));
      const r = await w.api.beto.post('/api/tasks', { title: 'Tarea con push roto', assignee_id: w.ids.ana });
      assert.equal(r.status, 200);
      assert.equal((await w.inbox('ana')).length, 1);
    } finally { await w.close(); }
  }
});

// ── Centro de automatizaciones ──────────────────────────────────────────────

test('automatizaciones: forma de la lista, permisos y configuración', async () => {
  const w = await world();
  try {
    const { automations, log, recurring } = (await w.api.cata.get('/api/automations')).data;
    assert.deepEqual(automations.map((a) => a.key), KEYS);
    assert.deepEqual(log, []);
    assert.deepEqual(recurring, []);
    for (const a of automations) {
      for (const k of ['key', 'name', 'description', 'schedule', 'category', 'enabled', 'config', 'config_schema', 'last_run_at', 'last_result', 'runs', 'next_run_hint']) assert.ok(k in a, `${a.key}.${k}`);
      assert.equal(a.enabled, true);
      assert.ok(Object.keys(NOTIFICATION_CATEGORIES).includes(a.category));
      for (const f of a.config_schema) assert.ok(['time', 'number'].includes(f.type) && f.label && f.key in a.config);
    }
    const byKey = Object.fromEntries(automations.map((a) => [a.key, a]));
    assert.equal(byKey.recordatorio_citas.config.minutes_before, 60);
    assert.deepEqual(byKey.recordatorio_citas.config_schema.map((f) => [f.min, f.max]), [[10, 240]]);
    assert.equal(byKey.tareas_vencen.config.time, '08:00');
    assert.equal(byKey.dinero_pendiente.config.time, '09:00');
    assert.equal(byKey.tareas_recurrentes.config.time, '06:00');
    assert.equal(byKey.tipo_cambio.config.time, '08:15');
    assert.equal(byKey.tareas_vencen.next_run_hint, 'Mañana a las 08:00', 'a las 09:00 CR ya pasó la de hoy');

    assert.equal((await w.api.ana.patch('/api/automations/tipo_cambio', { enabled: false })).status, 403);
    assert.equal((await w.api.cata.post('/api/automations/tipo_cambio/run')).status, 403);
    assert.equal((await w.api.ana.post('/api/automations/tipo_cambio/run')).status, 403);
    assert.equal((await w.api.admin.patch('/api/automations/no_existe', { enabled: false })).status, 404);
    assert.equal((await w.api.admin.post('/api/automations/no_existe/run')).status, 404);

    const cases = [
      ['recordatorio_citas', { config: { minutes_before: 5 } }], ['recordatorio_citas', { config: { minutes_before: 30.5 } }],
      ['recordatorio_citas', { config: { otra: 1 } }], ['tareas_vencen', { config: { time: '8:00' } }], ['tareas_vencen', { config: 'x' }],
    ];
    for (const [key, body] of cases) {
      const r = await w.api.admin.patch(`/api/automations/${key}`, body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.equal(r.data.field, 'config');
    }
    assert.equal((await w.api.admin.patch('/api/automations/tareas_vencen', { enabled: 'no' })).data.field, 'enabled');
    let r = await w.api.admin.patch('/api/automations/recordatorio_citas', { config: { minutes_before: 90 } });
    assert.equal(r.data.automation.config.minutes_before, 90);
    assert.match(r.data.automation.schedule, /90 min/);
    r = await w.api.admin.patch('/api/automations/tareas_vencen', { enabled: false, config: { time: '07:45' } });
    assert.equal(r.data.automation.enabled, false);
    assert.equal(r.data.automation.config.time, '07:45');
    assert.equal(r.data.automation.next_run_hint, 'Desactivada');
    const off = await w.api.admin.post('/api/automations/tareas_vencen/run');
    assert.equal(off.status, 409);
    assert.equal(off.data.error, 'automation_disabled');
    assert.equal(await w.engine.run('tareas_vencen'), null, 'desactivada: el programador la salta');
    await w.api.admin.patch('/api/automations/tareas_vencen', { enabled: true });

    const run = await w.api.admin.post('/api/automations/tareas_vencen/run');
    assert.equal(run.status, 200);
    assert.deepEqual(Object.keys(run.data.result).sort(), ['recipients', 'summary']);
    const after = (await w.api.cata.get('/api/automations')).data;
    const tv = after.automations.find((a) => a.key === 'tareas_vencen');
    assert.equal(tv.runs, 1);
    assert.equal(tv.last_run_at, new Date(w.env.clock.t).toISOString());
    assert.equal(tv.last_result, run.data.result.summary);
    assert.match(after.log[0].summary, /^Ejecución manual/);
    assert.equal(after.log[0].automation_key, 'tareas_vencen');
    const activity = (await w.api.admin.get('/api/activity?entity=automation')).data.activity;
    assert.ok(activity.length >= 2);
  } finally { await w.close(); }
});

test('resumen_diario: a las 07:30 CR, una sola vez, sin ceros y con dinero solo para socios', async () => {
  const w = await world({ startAt: cr('2026-10-11', '18:00') });
  try {
    await w.api.ana.post('/api/push/subscribe', subscription(FCM()));
    // Ana: 1 cita hoy, 1 tarea que vence hoy, 1 vencida y 1 movimiento por confirmar. Cata: 1 tarea hoy. Beto: nada.
    await w.api.beto.post('/api/appointments', { title: 'Alcance El Roble', kind: 'alcance', starts_at: '2026-10-12T16:00:00Z', ends_at: '2026-10-12T17:00:00Z', attendees: [w.ids.ana] });
    await w.api.beto.post('/api/appointments', { title: 'Cancelada', kind: 'demo', status: 'cancelada', starts_at: '2026-10-12T18:00:00Z', ends_at: '2026-10-12T19:00:00Z', attendees: [w.ids.ana] });
    await w.api.beto.post('/api/tasks', { title: 'Hoy', assignee_id: w.ids.ana, due_date: '2026-10-12' });
    await w.api.beto.post('/api/tasks', { title: 'Atrasada', assignee_id: w.ids.ana, due_date: '2026-10-10' });
    await w.api.beto.post('/api/tasks', { title: 'Sin fecha', assignee_id: w.ids.ana });
    await w.api.beto.post('/api/tasks', { title: 'Hoy Cata', assignee_id: w.ids.cata, due_date: '2026-10-12' });
    const inv = (await w.api.beto.post('/api/investments', { name: 'Pauta Q4', category: 'marketing', currency: 'CRC' })).data.investment;
    await w.api.beto.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: w.ids.ana, amount: 50_000_00, message: 'Mi parte' });
    await w.api.admin.patch('/api/me/notification-prefs', { digest_enabled: false });
    w.push.deliveries.length = 0;

    const digests = async (who) => (await w.inbox(who)).filter((n) => n.kind === 'digest');
    w.at(cr('2026-10-12', '07:29'));
    assert.equal((await w.engine.run('resumen_diario')).recipients, 0);
    assert.equal((await digests('ana')).length, 0);

    w.at(cr('2026-10-12', '07:30'));
    const res = await w.engine.run('resumen_diario');
    assert.equal(res.recipients, 2);
    const [ana] = await digests('ana');
    assert.equal(ana.body, 'Hoy: 1 cita · 2 tareas (1 vencida) · 1 por confirmar');
    assert.equal(ana.link, '/');
    const [cata] = await digests('cata');
    assert.equal(cata.body, 'Hoy: 0 citas · 1 tarea', 'sin "por confirmar" para colaboradores');
    assert.equal((await digests('beto')).length, 0, 'todo en cero: no se envía');
    assert.equal((await digests('admin')).length, 0, 'resumen apagado');
    assert.equal(deliveriesTo(w, w.ids.ana).filter((d) => d.payload.category === 'resumen').length, 1);

    w.at(cr('2026-10-12', '07:31'));
    await w.engine.runDue();
    await w.engine.run('resumen_diario', { force: true });
    assert.equal((await digests('ana')).length, 1, 'no se repite el mismo día');
    assert.ok(w.log().some((l) => l.dedupe_key === `digest:2026-10-12:${w.ids.ana}`));

    // Cada persona elige su hora; fuera de la ventana de 3 h no llega tarde.
    await w.api.beto.patch('/api/me/notification-prefs', { digest_time: '09:00' });
    await w.api.ana.post('/api/tasks', { title: 'Para Beto hoy', assignee_id: w.ids.beto, due_date: '2026-10-12' });
    await w.engine.run('resumen_diario');
    assert.equal((await digests('beto')).length, 0);
    w.at(cr('2026-10-12', '09:00'));
    await w.engine.run('resumen_diario');
    assert.equal((await digests('beto')).length, 1);
    w.at(cr('2026-10-13', '12:00'));
    await w.engine.run('resumen_diario');
    assert.equal((await digests('beto')).length, 1, 'a las 12:00 ya pasó la ventana del resumen de las 09:00');
  } finally { await w.close(); }
});

test('recordatorio_citas (T−60) y cita_sin_confirmar (< 24 h, solo de cliente)', async () => {
  const w = await world({ startAt: cr('2026-10-12', '06:00') });
  try {
    const client = (await w.api.ana.post('/api/clients', { name: 'Ferretería El Roble', contact_name: 'Don Luis', contact_phone: '+506 8800-1122' })).data.client;
    const mk = (body) => w.api.ana.post('/api/appointments', { kind: 'alcance', attendees: [w.ids.ana, w.ids.beto], ...body }).then((r) => r.data.appointment);
    const a = await mk({ title: 'Alcance El Roble', client_id: client.id, starts_at: new Date(cr('2026-10-12', '10:00')).toISOString(), ends_at: new Date(cr('2026-10-12', '11:00')).toISOString() });
    await mk({ title: 'Cancelada', status: 'cancelada', starts_at: new Date(cr('2026-10-12', '10:00')).toISOString(), ends_at: new Date(cr('2026-10-12', '11:00')).toISOString() });
    await mk({ title: 'Interna', kind: 'interna', starts_at: new Date(cr('2026-10-12', '11:00')).toISOString(), ends_at: new Date(cr('2026-10-12', '12:00')).toISOString() });
    await mk({ title: 'Confirmada', status: 'confirmada', starts_at: new Date(cr('2026-10-12', '12:00')).toISOString(), ends_at: new Date(cr('2026-10-12', '13:00')).toISOString() });
    await mk({ title: 'Lejana', starts_at: new Date(cr('2026-10-14', '12:00')).toISOString(), ends_at: new Date(cr('2026-10-14', '13:00')).toISOString() });
    const reminders = async (who) => (await w.inbox(who)).filter((n) => n.title.startsWith('En '));

    // Cita sin confirmar: solo la de cliente programada en < 24 h; al creador y participantes, una vez.
    const confirm = await w.engine.run('cita_sin_confirmar');
    assert.equal(confirm.recipients, 2);
    const [notice] = (await w.inbox('beto')).filter((n) => n.title.startsWith('Confirmá'));
    assert.equal(notice.title, 'Confirmá con Ferretería El Roble');
    assert.match(notice.body, /Alcance El Roble/);
    assert.match(notice.body, /8800-1122/);
    assert.equal(notice.link, `/agenda?cita=${a.id}`);
    assert.equal(notice.kind, 'appointment');
    await w.engine.run('cita_sin_confirmar', { force: true });
    assert.equal((await w.inbox('beto')).filter((n) => n.title.startsWith('Confirmá')).length, 1);
    assert.equal((await w.inbox('ana')).filter((n) => n.title.startsWith('Confirmá')).length, 1, 'la creadora también');

    w.at(cr('2026-10-12', '08:59'));
    await w.engine.run('recordatorio_citas');
    assert.equal((await reminders('ana')).length, 0, '61 min antes todavía no');
    w.at(cr('2026-10-12', '09:00'));
    const r = await w.engine.run('recordatorio_citas');
    assert.equal(r.recipients, 2);
    const [rem] = await reminders('ana');
    assert.equal(rem.title, 'En 1 h: Alcance El Roble');
    assert.equal(rem.kind, 'appointment');
    assert.equal(rem.link, `/agenda?cita=${a.id}`);
    assert.equal((await reminders('beto')).length, 1);
    w.at(cr('2026-10-12', '09:01'));
    await w.engine.runDue();
    assert.equal((await reminders('ana')).length, 1, 'no se repite');
    assert.equal((await w.inbox('ana')).filter((n) => n.title.includes('Cancelada')).length, 0);

    // Si la cita se mueve, hay recordatorio nuevo para la hora nueva.
    await w.api.beto.patch(`/api/appointments/${a.id}`, { starts_at: new Date(cr('2026-10-12', '09:40')).toISOString(), ends_at: new Date(cr('2026-10-12', '10:40')).toISOString() });
    await w.engine.run('recordatorio_citas');
    const after = await reminders('ana');
    assert.equal(after.length, 2);
    assert.equal(after[0].title, 'En 39 min: Alcance El Roble');
  } finally { await w.close(); }
});

test('avance_72h: aviso a los 2/3 y al vencer, una vez por ciclo', async () => {
  const start = cr('2026-10-12', '09:00');
  const w = await world({ startAt: start });
  try {
    const p = (await w.api.ana.post('/api/projects', { name: 'Landing Uniquex', client: 'Uniquex', kind: 'cliente', status: 'en_curso', owner_id: w.ids.beto })).data.project;
    await w.api.ana.post('/api/projects', { name: 'Interno', kind: 'interno', status: 'en_curso', owner_id: w.ids.beto });
    const sla = async (who) => (await w.inbox(who)).filter((n) => n.kind === 'automation');

    w.at(start + 47 * HOUR);
    await w.engine.run('avance_72h');
    assert.equal((await sla('beto')).length, 0);
    w.at(start + 49 * HOUR);
    await w.engine.run('avance_72h');
    let beto = await sla('beto');
    assert.equal(beto.length, 1);
    assert.equal(beto[0].title, 'Avance pronto: Uniquex');
    assert.equal(beto[0].link, `/proyectos/${p.id}`);
    assert.equal((await sla('admin')).length, 0, 'el aviso preventivo es solo para el responsable');
    w.at(start + 50 * HOUR);
    await w.engine.runDue();
    assert.equal((await sla('beto')).length, 1, 'una vez por ciclo');

    w.at(start + 73 * HOUR);
    await w.engine.run('avance_72h');
    beto = await sla('beto');
    assert.equal(beto.length, 2);
    assert.equal(beto[0].title, 'Avance vencido: Uniquex');
    const admin = await sla('admin');
    assert.equal(admin.length, 1, 'al vencer también se avisa a los admin');
    await w.engine.run('avance_72h', { force: true });
    assert.equal((await sla('beto')).length, 2);

    // Un avance abre un ciclo nuevo.
    w.at(start + 74 * HOUR);
    await w.api.beto.post(`/api/projects/${p.id}/updates`, { channel: 'whatsapp', note: 'Avance enviado con video.' });
    w.at(start + 74 * HOUR + 49 * HOUR);
    await w.engine.run('avance_72h');
    assert.equal((await sla('beto')).length, 3);
    const keys = w.log().map((l) => l.dedupe_key).filter(Boolean);
    assert.equal(keys.filter((k) => k.startsWith(`sla-warn:${p.id}:`)).length, 2);
    assert.equal(keys.filter((k) => k.startsWith(`sla-late:${p.id}:`)).length, 1);
  } finally { await w.close(); }
});

test('tareas_vencen (08:00) y fin_soporte (7 días antes)', async () => {
  const w = await world({ startAt: cr('2026-10-12', '06:00') });
  try {
    const t = (await w.api.ana.post('/api/tasks', { title: 'Entregar manual', assignee_id: w.ids.cata, due_date: '2026-10-12' })).data.task;
    const done = (await w.api.ana.post('/api/tasks', { title: 'Ya hecha', assignee_id: w.ids.cata, due_date: '2026-10-12' })).data.task;
    await w.api.ana.patch(`/api/tasks/${done.id}`, { status: 'hecho' });
    await w.api.ana.post('/api/tasks', { title: 'Mañana', assignee_id: w.ids.cata, due_date: '2026-10-13' });
    const due = async () => (await w.inbox('cata')).filter((n) => n.title.startsWith('Vence hoy'));

    w.at(cr('2026-10-12', '07:59'));
    assert.equal(await w.engine.run('tareas_vencen'), null, 'antes de la hora no corre');
    w.at(cr('2026-10-12', '08:00'));
    const r = await w.engine.run('tareas_vencen');
    assert.equal(r.recipients, 1);
    const [n] = await due();
    assert.equal(n.title, 'Vence hoy: Entregar manual');
    assert.equal(n.kind, 'task');
    assert.equal(n.link, `/tablero?tarea=${t.id}`);
    w.at(cr('2026-10-12', '08:05'));
    await w.engine.runDue();
    assert.equal((await due()).length, 1);

    // Soporte: entregado el 2026-09-19 → termina el 2026-10-19 (7 días después de hoy).
    const vip = (await w.api.ana.post('/api/projects', { name: 'Cotizador VIP', client: 'VIP', kind: 'cliente', status: 'soporte', delivered_at: '2026-09-19', owner_id: w.ids.beto })).data.project;
    await w.api.ana.post('/api/projects', { name: 'Más tarde', kind: 'cliente', status: 'soporte', delivered_at: '2026-09-20', owner_id: w.ids.beto });
    await w.api.ana.post('/api/projects', { name: 'Sin responsable', client: 'Huérfano', kind: 'cliente', status: 'entregado', delivered_at: '2026-09-15', owner_id: null });
    const support = async (who) => (await w.inbox(who)).filter((x) => x.title.startsWith('El soporte'));
    w.at(cr('2026-10-12', '08:29'));
    assert.equal(await w.engine.run('fin_soporte'), null);
    w.at(cr('2026-10-12', '08:30'));
    await w.engine.run('fin_soporte');
    const beto = await support('beto');
    assert.equal(beto.length, 1);
    assert.equal(beto[0].title, 'El soporte de VIP termina el 2026-10-19');
    assert.equal(beto[0].kind, 'automation');
    assert.equal(beto[0].link, `/proyectos/${vip.id}`);
    assert.equal((await support('admin')).length, 1, 'sin responsable avisa a los admin');
    await w.engine.run('fin_soporte', { force: true });
    assert.equal((await support('beto')).length, 1);
    w.at(cr('2026-10-13', '08:30'));
    await w.engine.run('fin_soporte');
    assert.equal((await support('beto')).length, 2, 'al día siguiente entra el que termina el 2026-10-20');
  } finally { await w.close(); }
});

test('dinero_pendiente: movimientos con más de 24 h, a quien debe confirmar', async () => {
  const w = await world({ startAt: cr('2026-10-11', '08:00') });
  try {
    const inv = (await w.api.beto.post('/api/investments', { name: 'BarberXCR', category: 'producto_propio', currency: 'CRC' })).data.investment;
    const old = (await w.api.beto.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: w.ids.ana, amount: 200_000_00, message: 'Aporte de Ana' })).data.movement;
    w.at(cr('2026-10-12', '08:00'));
    await w.api.beto.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: w.ids.ana, amount: 1_000_00, message: 'Reciente' });
    await w.api.admin.post('/api/push/subscribe', subscription(FCM()));
    const reminders = async (who) => (await w.inbox(who)).filter((n) => n.title.startsWith('Por confirmar'));

    w.at(cr('2026-10-12', '08:59'));
    assert.equal(await w.engine.run('dinero_pendiente'), null);
    w.at(cr('2026-10-12', '09:00'));
    const r = await w.engine.run('dinero_pendiente');
    assert.equal(r.recipients, 1);
    const [n] = await reminders('ana');
    assert.equal(n.kind, 'movement');
    assert.match(n.title, /Aporte de ₡200[.\s ]000/);
    assert.equal(n.link, `/inversiones/${inv.id}?mov=${old.id}`);
    for (const who of ['admin', 'beto', 'cata']) assert.equal((await reminders(who)).length, 0, who);
    assert.equal(w.push.deliveries.filter((d) => d.payload.title.startsWith('Por confirmar')).length, 0);

    await w.engine.run('dinero_pendiente', { force: true });
    assert.equal((await reminders('ana')).length, 1, 'una vez por día');
    w.at(cr('2026-10-13', '09:00'));
    await w.engine.run('dinero_pendiente');
    assert.equal((await reminders('ana')).length, 3, 'al día siguiente recuerda los dos (ya tienen más de 24 h)');
    assert.ok(w.log().some((l) => l.dedupe_key === `money:${old.id}:2026-10-13`));

    // El historial de dinero no se muestra a colaboradores.
    const cataLog = (await w.api.cata.get('/api/automations')).data;
    assert.ok(cataLog.log.every((l) => l.automation_key !== 'dinero_pendiente'));
    assert.equal(cataLog.automations.find((a) => a.key === 'dinero_pendiente').last_result, null);
    assert.ok((await w.api.ana.get('/api/automations')).data.log.some((l) => l.automation_key === 'dinero_pendiente'));
  } finally { await w.close(); }
});

test('tareas_recurrentes: semanal, mensual y diaria a las 06:00, sin duplicar', async () => {
  const w = await world({ startAt: cr('2026-10-11', '12:00') }); // domingo
  try {
    const project = (await w.api.ana.post('/api/projects', { name: 'Contenido JC', kind: 'interno', status: 'en_curso' })).data.project;
    const mk = (body) => w.api.ana.post('/api/recurring-tasks', body).then((r) => {
      assert.equal(r.status, 200, JSON.stringify(r.data));
      return r.data.recurring_task;
    });
    const weekly = await mk({ title: 'Reporte semanal de pauta', frequency: 'semanal', weekday: 1, assignee_id: w.ids.cata, project_id: project.id, priority: 'alta', due_in_days: 2 });
    const monthly = await mk({ title: 'Cierre de planilla', frequency: 'mensual', monthday: 12, assignee_id: w.ids.beto });
    await mk({ title: 'Revisar buzón de clientes', frequency: 'diaria', assignee_id: w.ids.ana });
    await mk({ title: 'Los martes', frequency: 'semanal', weekday: 2, assignee_id: w.ids.cata });
    await mk({ title: 'Pausada', frequency: 'diaria', active: false, assignee_id: w.ids.cata });
    assert.equal(weekly.summary, 'Cada lunes · tarea para Hillary · vence en 2 días');
    assert.equal(weekly.project_name, 'Contenido JC');
    assert.equal(weekly.next_date, '2026-10-12');
    assert.equal(monthly.summary, 'El día 12 de cada mes · tarea para Beto · vence el mismo día');
    const tasks = () => w.env.db.prepare('SELECT * FROM tasks ORDER BY id').all();

    w.at(cr('2026-10-12', '05:59'));
    assert.equal(await w.engine.run('tareas_recurrentes'), null);
    w.at(cr('2026-10-12', '06:00'));
    const maxBefore = w.env.db.prepare("SELECT MAX(position) m FROM tasks WHERE status = 'por_hacer'").get().m ?? 0;
    const r = await w.engine.run('tareas_recurrentes');
    assert.match(r.summary, /^3 tareas recurrentes creadas/);
    let created = tasks();
    assert.deepEqual(created.map((t) => t.title), ['Reporte semanal de pauta', 'Cierre de planilla', 'Revisar buzón de clientes']);
    const t = created[0];
    assert.equal(t.status, 'por_hacer');
    assert.equal(t.due_date, '2026-10-14');
    assert.equal(t.priority, 'alta');
    assert.equal(t.project_id, project.id);
    assert.equal(t.assignee_id, w.ids.cata);
    assert.equal(t.created_by, w.ids.ana);
    assert.ok(t.position > maxBefore && created[1].position > t.position, 'al final de la columna');
    assert.equal(created[2].due_date, '2026-10-12');
    const [notice] = (await w.inbox('cata')).filter((n) => n.title === 'Nueva tarea: Reporte semanal de pauta');
    assert.equal(notice.link, `/tablero?tarea=${t.id}`);
    assert.equal((await w.inbox('ana')).filter((n) => n.title === 'Nueva tarea: Revisar buzón de clientes').length, 1, 'la creadora también recibe el aviso de su regla diaria');
    assert.ok((await w.api.cata.get('/api/tasks')).data.tasks.some((x) => x.id === t.id));
    assert.ok(w.env.db.prepare("SELECT 1 FROM activity WHERE entity = 'task' AND entity_id = ? AND action = 'created'").get(t.id));
    assert.equal(w.env.db.prepare('SELECT last_created_on FROM recurring_tasks WHERE id = ?').get(weekly.id).last_created_on, '2026-10-12');

    w.at(cr('2026-10-12', '06:01'));
    await w.engine.runDue();
    await w.engine.run('tareas_recurrentes', { force: true });
    assert.equal(tasks().length, 3, 'no se duplica el mismo día');

    w.at(cr('2026-10-13', '06:00'));
    await w.engine.run('tareas_recurrentes');
    created = tasks().slice(3).map((x) => x.title);
    assert.deepEqual(created, ['Revisar buzón de clientes', 'Los martes']);
    assert.ok(ruleDueOn({ frequency: 'mensual', monthday: 28 }, '2026-02-28'));
    assert.ok(!ruleDueOn({ frequency: 'semanal', weekday: 7 }, '2026-10-12'));
    assert.equal(recurringSummary({ frequency: 'diaria', due_in_days: 1, active: 0 }), 'Cada día · tarea sin asignar · vence al día siguiente · pausada');
    assert.equal((await w.api.cata.get('/api/automations')).data.recurring.length, 5);
  } finally { await w.close(); }
});

test('tareas recurrentes: validación y permisos (creador o admin)', async () => {
  const w = await world();
  try {
    const cases = [
      [{ frequency: 'diaria' }, 'title'], [{ title: 'X', frequency: 'diaria' }, 'title'],
      [{ title: 'Sin frecuencia' }, 'frequency'], [{ title: 'Anual', frequency: 'anual' }, 'frequency'],
      [{ title: 'Semanal', frequency: 'semanal' }, 'weekday'], [{ title: 'Semanal', frequency: 'semanal', weekday: 8 }, 'weekday'],
      [{ title: 'Semanal', frequency: 'semanal', weekday: 1.5 }, 'weekday'],
      [{ title: 'Mensual', frequency: 'mensual', monthday: 29 }, 'monthday'], [{ title: 'Mensual', frequency: 'mensual' }, 'monthday'],
      [{ title: 'Diaria', frequency: 'diaria', due_in_days: -1 }, 'due_in_days'], [{ title: 'Diaria', frequency: 'diaria', assignee_id: 9999 }, 'assignee_id'],
      [{ title: 'Diaria', frequency: 'diaria', project_id: 9999 }, 'project_id'], [{ title: 'Diaria', frequency: 'diaria', priority: 'ya' }, 'priority'],
      [{ title: 'Diaria', frequency: 'diaria', active: 'si' }, 'active'],
    ];
    for (const [body, field] of cases) {
      const r = await w.api.cata.post('/api/recurring-tasks', body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.equal(r.data.field, field, JSON.stringify(body));
    }
    const rule = (await w.api.cata.post('/api/recurring-tasks', { title: 'Publicar reel', frequency: 'semanal', weekday: 5, monthday: 3 })).data.recurring_task;
    assert.equal(rule.monthday, null, 'semanal ignora monthday');
    assert.equal(rule.created_by, w.ids.cata);
    assert.equal(rule.active, true);

    assert.equal((await w.api.ana.patch(`/api/recurring-tasks/${rule.id}`, { title: 'Hackeada' })).status, 403);
    assert.equal((await w.api.ana.del(`/api/recurring-tasks/${rule.id}`)).status, 403);
    assert.equal((await w.api.cata.patch('/api/recurring-tasks/9999', { title: 'x' })).status, 404);
    let r = await w.api.cata.patch(`/api/recurring-tasks/${rule.id}`, { frequency: 'mensual' });
    assert.equal(r.status, 400);
    assert.equal(r.data.field, 'monthday');
    r = await w.api.cata.patch(`/api/recurring-tasks/${rule.id}`, { frequency: 'mensual', monthday: 1, active: false });
    assert.equal(r.status, 200);
    assert.equal(r.data.recurring_task.weekday, null);
    assert.equal(r.data.recurring_task.summary, 'El día 1 de cada mes · tarea sin asignar · vence el mismo día · pausada');
    assert.equal(r.data.recurring_task.next_date, null);
    r = await w.api.admin.patch(`/api/recurring-tasks/${rule.id}`, { assignee_id: w.ids.cata, active: true });
    assert.equal(r.status, 200, 'el admin puede editar reglas ajenas');
    assert.equal(r.data.recurring_task.assignee_name, 'Hillary Porras');
    assert.equal(r.data.recurring_task.title, 'Publicar reel');
    const list = (await w.api.beto.get('/api/recurring-tasks')).data.recurring;
    assert.equal(list.length, 1);
    assert.ok(['assignee_name', 'project_name', 'summary'].every((k) => k in list[0]));
    assert.equal((await w.api.cata.del(`/api/recurring-tasks/${rule.id}`)).status, 200);
    assert.deepEqual((await w.api.cata.get('/api/recurring-tasks')).data.recurring, []);
    assert.equal((await w.env.client().get('/api/recurring-tasks')).status, 401);
  } finally { await w.close(); }
});

test('tipo_cambio: lector tolerante, rango, falla conserva el valor y reintento', async () => {
  const fx = { response: { venta: { fecha: '2026-10-12', valor: 512.34 } }, calls: 0 };
  const fetchExchangeRate = async () => {
    fx.calls += 1;
    if (fx.response instanceof Error) throw fx.response;
    return fx.response;
  };
  const w = await world({ fetchExchangeRate, startAt: cr('2026-10-12', '06:00') });
  try {
    await w.api.admin.post('/api/push/subscribe', subscription(FCM()));
    const setting = async () => (await w.api.cata.get('/api/settings')).data.settings.fx_usd_crc;
    assert.equal(await setting(), '515');
    w.at(cr('2026-10-12', '08:14'));
    assert.equal(await w.engine.run('tipo_cambio'), null);
    assert.equal(fx.calls, 0);

    w.at(cr('2026-10-12', '08:15'));
    const r = await w.engine.run('tipo_cambio');
    assert.equal(fx.calls, 1);
    assert.equal(await setting(), '512.34');
    assert.equal(r.recipients, 1);
    const [notice] = (await w.inbox('admin')).filter((n) => n.kind === 'automation');
    assert.match(notice.title, /Tipo de cambio: ₡512,34/);
    assert.equal((await w.inbox('ana')).filter((n) => n.kind === 'automation').length, 0, 'solo admin');
    assert.equal(w.push.deliveries.filter((d) => d.payload.category === 'automatizaciones').length, 1);
    assert.ok((await w.api.admin.get('/api/activity?entity=settings')).data.activity.some((a) => a.summary.includes('Hacienda')));
    assert.ok(w.log().some((l) => l.dedupe_key === 'fx:2026-10-12'));

    w.at(cr('2026-10-12', '09:15'));
    assert.equal(await w.engine.run('tipo_cambio'), null, 'una consulta por día');
    fx.response = { dolar: { venta: { valor: 520 } } };
    const forced = await w.engine.run('tipo_cambio', { force: true });
    assert.equal(await setting(), '520');
    assert.equal(forced.recipients, 0, 'el aviso del día ya salió');
    assert.equal((await w.inbox('admin')).filter((n) => n.kind === 'automation').length, 1);

    // Día siguiente: valor fuera de rango → se conserva el anterior.
    fx.response = 2000;
    w.at(cr('2026-10-13', '08:15'));
    const bad = await w.engine.run('tipo_cambio');
    assert.equal(bad.error, true);
    assert.match(bad.summary, /fuera de rango/);
    assert.equal(await setting(), '520');
    // Reintento a los 30 min; una falla de red tampoco cambia el valor.
    fx.response = new Error('getaddrinfo ENOTFOUND api.hacienda.go.cr');
    w.at(cr('2026-10-13', '08:30'));
    assert.equal(await w.engine.run('tipo_cambio'), null);
    w.at(cr('2026-10-13', '08:45'));
    const failed = await w.engine.run('tipo_cambio');
    assert.match(failed.summary, /ENOTFOUND/);
    assert.equal(await setting(), '520');
    const row = (await w.api.cata.get('/api/automations')).data.automations.find((a) => a.key === 'tipo_cambio');
    assert.match(row.last_result, /No se pudo consultar Hacienda/);
    fx.response = 520;
    w.at(cr('2026-10-13', '09:15'));
    assert.match((await w.engine.run('tipo_cambio')).summary, /Sin cambios/);
    assert.equal(fx.calls, 5);

    // Lector tolerante.
    assert.equal(parseExchangeRate({ venta: { valor: 515.5 } }), 515.5);
    assert.equal(parseExchangeRate({ dolar: { venta: { valor: '516,25' } } }), 516.25);
    assert.equal(parseExchangeRate(517), 517);
    assert.equal(parseExchangeRate('518.5'), 518.5);
    assert.equal(parseExchangeRate({ compra: { valor: 500 } }), null);
    assert.equal(parseExchangeRate(null), null);
    assert.equal(parseExchangeRate([]), null);
  } finally { await w.close(); }

  // Sin fetchExchangeRate inyectado: "sin conexión configurada" y el valor no cambia.
  const offline = await world();
  try {
    const res = (await offline.api.admin.post('/api/automations/tipo_cambio/run')).data.result;
    assert.match(res.summary, /Sin conexión configurada/);
    assert.equal((await offline.api.admin.get('/api/settings')).data.settings.fx_usd_crc, '515');
  } finally { await offline.close(); }
});

test('runDue: corre lo que toca, respeta "desactivada" y no lanza', async () => {
  const w = await world({ startAt: cr('2026-10-12', '05:00') });
  try {
    let results = await w.engine.runDue();
    assert.deepEqual(results.map((r) => r.key).sort(), ['avance_72h', 'cita_sin_confirmar', 'recordatorio_citas', 'resumen_diario'], 'a las 05:00 solo las que revisan cada minuto');
    await w.api.admin.patch('/api/automations/avance_72h', { enabled: false });
    w.at(cr('2026-10-12', '23:00'));
    results = await w.engine.runDue();
    assert.ok(!results.some((r) => r.key === 'avance_72h'));
    assert.ok(results.some((r) => r.key === 'tipo_cambio' && /Sin conexión/.test(r.summary)));
    assert.ok(results.every((r) => typeof r.summary === 'string'));
    assert.equal(readPrefs(w.env.db, w.ids.ana).digest_time, '07:30');
  } finally { await w.close(); }
});
