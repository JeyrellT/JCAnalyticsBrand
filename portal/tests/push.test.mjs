// v3: envío Web Push (server/push.mjs). El cifrado aes128gcm se valida contra
// http_ece (implementación de referencia) y la firma VAPID con node:crypto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createECDH, randomBytes, verify } from 'node:crypto';
import { createRequire } from 'node:module';
import { openDatabase } from '../server/db.mjs';
import { createPushService, encryptPayload, vapidPublicKeyObject, loadVapidKeys, DEFAULT_VAPID_SUBJECT, urgencyFor } from '../server/push.mjs';

const ece = createRequire(import.meta.url)('http_ece');
const NOW = Date.parse('2026-10-11T15:00:00Z');

function subscriber() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return { ecdh, auth, p256dh: ecdh.getPublicKey().toString('base64url'), authB64: auth.toString('base64url') };
}

const decrypt = (body, s) => ece.decrypt(body, { version: 'aes128gcm', privateKey: s.ecdh, authSecret: s.authB64 });

function parseAuthorization(header) {
  const m = /^vapid t=([^,\s]+), k=([A-Za-z0-9_-]+)$/.exec(header ?? '');
  assert.ok(m, `cabecera Authorization inválida: ${header}`);
  const [h, c, sig] = m[1].split('.');
  return {
    token: m[1], key: m[2], signature: Buffer.from(sig, 'base64url'), data: Buffer.from(`${h}.${c}`),
    header: JSON.parse(Buffer.from(h, 'base64url')), claims: JSON.parse(Buffer.from(c, 'base64url')),
  };
}

// ── Servidor de push falso en 127.0.0.1 ─────────────────────────────────────
let fake;
let fakeBase;
const received = [];
let nextStatus = 201;

before(async () => {
  fake = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      received.push({ url: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks) });
      res.writeHead(nextStatus);
      res.end();
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  fakeBase = `http://127.0.0.1:${fake.address().port}`;
});
after(() => new Promise((r) => fake.close(r)));

function setup(env = {}) {
  const db = openDatabase(':memory:');
  const userId = Number(db.prepare(`INSERT INTO users (email, name, role, password_hash, created_at) VALUES ('a@jc.test', 'Ana', 'socio', 'x', ?)`)
    .run(new Date(NOW).toISOString()).lastInsertRowid);
  const errors = [];
  const service = createPushService({ db, env, now: () => NOW, logger: { error: (m) => errors.push(m), info() {} } });
  const addSub = (s, path = '/push/abc') => {
    const id = Number(db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(userId, fakeBase + path, s.p256dh, s.authB64, new Date(NOW).toISOString()).lastInsertRowid);
    return db.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(id);
  };
  return { db, service, addSub, errors };
}

test('cifrado aes128gcm (RFC 8291) que http_ece descifra', () => {
  const s = subscriber();
  const payload = Buffer.from(JSON.stringify({ title: 'Movimiento por confirmar ₡ñ', body: 'x'.repeat(2500), url: '/buzon' }));
  const body = encryptPayload(payload, s.p256dh, s.authB64);
  // Encabezado RFC 8188: sal(16) · rs(4) = 4096 · idlen(1) = 65 · clave pública efímera del servidor.
  assert.equal(body.readUInt32BE(16), 4096);
  assert.equal(body[20], 65);
  assert.equal(body[21], 0x04);
  assert.equal(body.length, 21 + 65 + payload.length + 1 + 16, 'un solo registro: datos + delimitador + etiqueta GCM');
  assert.ok(body.length <= 4096, 'cabe en el límite de los servicios de push');
  assert.deepEqual(decrypt(body, s), payload);

  // Cada envío usa sal y clave efímera nuevas.
  const again = encryptPayload(payload, s.p256dh, s.authB64);
  assert.notDeepEqual(again.subarray(0, 86), body.subarray(0, 86));
  assert.deepEqual(decrypt(again, s), payload);

  // Otro suscriptor no puede descifrarlo.
  assert.throws(() => decrypt(body, subscriber()));
  assert.throws(() => encryptPayload(payload, s.p256dh.slice(4), s.authB64), /p256dh/);
  assert.throws(() => encryptPayload(payload, s.p256dh, s.authB64.slice(2)), /auth/);
  assert.throws(() => encryptPayload(Buffer.alloc(4000), s.p256dh, s.authB64), /grande/);
});

test('claves VAPID: se generan una vez, se guardan en app_secrets y el entorno manda', () => {
  const { db, service } = setup();
  const pub = Buffer.from(service.publicKey, 'base64url');
  assert.equal(pub.length, 65);
  assert.equal(pub[0], 0x04);
  const stored = Object.fromEntries(db.prepare('SELECT key, value FROM app_secrets').all().map((r) => [r.key, r.value]));
  assert.equal(stored.vapid_public_key, service.publicKey);
  assert.equal(Buffer.from(stored.vapid_private_key, 'base64url').length, 32);
  assert.equal(createPushService({ db, env: {}, now: () => NOW }).publicKey, service.publicKey, 'no se regeneran al reiniciar');
  assert.equal(service.subject, DEFAULT_VAPID_SUBJECT);

  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const env = { PORTAL_VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString('base64url'), PORTAL_VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString('base64url'), PORTAL_VAPID_SUBJECT: 'mailto:ops@jc.test' };
  const fromEnv = createPushService({ db, env, now: () => NOW });
  assert.equal(fromEnv.publicKey, env.PORTAL_VAPID_PUBLIC_KEY);
  assert.equal(fromEnv.subject, 'mailto:ops@jc.test');

  const other = createECDH('prime256v1');
  other.generateKeys();
  assert.throws(() => loadVapidKeys(db, { ...env, PORTAL_VAPID_PRIVATE_KEY: other.getPrivateKey().toString('base64url') }), /par/);
  assert.throws(() => loadVapidKeys(db, { PORTAL_VAPID_PUBLIC_KEY: env.PORTAL_VAPID_PUBLIC_KEY }), /juntas/);
  assert.throws(() => loadVapidKeys(db, { ...env, PORTAL_VAPID_PUBLIC_KEY: 'abc' }), /65 bytes/);
});

test('deliver(): cabeceras RFC 8030, JWT VAPID válido y contenido descifrable', async () => {
  const { db, service, addSub } = setup();
  const s = subscriber();
  const sub = addSub(s);
  received.length = 0;
  nextStatus = 201;
  const payload = { title: 'Por confirmar: Aporte de ₡100.000', body: 'Pauta', url: '/inversiones/1?mov=2', tag: 'movement:/inversiones/1?mov=2', category: 'dinero', badge: 3, ts: NOW };
  const result = await service.deliver(sub, payload);
  assert.deepEqual(result, { ok: true, status: 201, gone: false });

  assert.equal(received.length, 1);
  const req = received[0];
  assert.equal(req.method, 'POST');
  assert.equal(req.url, '/push/abc');
  assert.equal(req.headers['content-encoding'], 'aes128gcm');
  assert.equal(req.headers['content-type'], 'application/octet-stream');
  assert.equal(req.headers.ttl, '86400');
  assert.equal(req.headers.urgency, 'high', 'dinero es urgente');
  assert.deepEqual(JSON.parse(decrypt(req.body, s).toString('utf8')), payload);

  const jwt = parseAuthorization(req.headers.authorization);
  assert.equal(jwt.key, service.publicKey);
  assert.deepEqual(jwt.header, { typ: 'JWT', alg: 'ES256' });
  assert.equal(jwt.signature.length, 64, 'firma ES256 en formato IEEE P1363 (r || s)');
  assert.ok(verify('sha256', jwt.data, { key: vapidPublicKeyObject(jwt.key), dsaEncoding: 'ieee-p1363' }, jwt.signature), 'firma VAPID válida');
  assert.equal(jwt.claims.aud, fakeBase, 'aud = origen del endpoint');
  assert.equal(jwt.claims.sub, DEFAULT_VAPID_SUBJECT);
  assert.ok(jwt.claims.exp > NOW / 1000 && jwt.claims.exp <= NOW / 1000 + 24 * 3600, 'exp dentro de 24 h');

  const row = db.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(sub.id);
  assert.equal(row.last_success_at, new Date(NOW).toISOString());
  assert.equal(row.failures, 0);

  // Urgencia normal para lo que no es dinero ni citas.
  await service.deliver(sub, { ...payload, category: 'tareas' });
  assert.equal(received[1].headers.urgency, 'normal');
  assert.equal(urgencyFor({ category: 'agenda' }), 'high');
});

test('deliver(): 410/404 borran la suscripción; otros errores suman fallas y a las 10 se borra', async () => {
  const { db, service, addSub, errors } = setup();
  const gone = addSub(subscriber(), '/push/gone');
  nextStatus = 410;
  assert.deepEqual(await service.deliver(gone, { title: 'x', category: 'tareas' }), { ok: false, status: 410, gone: true });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM push_subscriptions WHERE id = ?').get(gone.id).n, 0);

  const missing = addSub(subscriber(), '/push/missing');
  nextStatus = 404;
  assert.equal((await service.deliver(missing, { title: 'x' })).gone, true);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM push_subscriptions WHERE id = ?').get(missing.id).n, 0);

  const flaky = addSub(subscriber(), '/push/flaky');
  nextStatus = 500;
  for (let i = 1; i <= 9; i += 1) {
    const r = await service.deliver(flaky, { title: 'x' });
    assert.deepEqual(r, { ok: false, status: 500, gone: false });
  }
  let row = db.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(flaky.id);
  assert.equal(row.failures, 9);
  assert.equal(row.last_error, 'HTTP 500');
  // Un éxito reinicia el contador.
  nextStatus = 201;
  assert.equal((await service.deliver(flaky, { title: 'x' })).ok, true);
  row = db.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(flaky.id);
  assert.equal(row.failures, 0);
  assert.equal(row.last_error, null);
  nextStatus = 503;
  for (let i = 1; i <= 10; i += 1) await service.deliver(flaky, { title: 'x' });
  assert.equal(db.prepare('SELECT COUNT(*) n FROM push_subscriptions WHERE id = ?').get(flaky.id).n, 0, 'borrada a las 10 fallas seguidas');
  assert.ok(errors.some((e) => e.includes('borrada')));

  // Error de red (nadie escucha): cuenta como falla, no lanza.
  const dead = { ...addSub(subscriber(), '/push/dead'), endpoint: 'http://127.0.0.1:9/push' };
  const r = await service.deliver(dead, { title: 'x' });
  assert.equal(r.ok, false);
  assert.equal(r.gone, false);
  assert.equal(db.prepare('SELECT failures FROM push_subscriptions WHERE id = ?').get(dead.id).failures, 1);
  nextStatus = 201;
});

test('deliver(): fetch inyectable, tiempo límite y base cerrada no rompen', async () => {
  const db = openDatabase(':memory:');
  db.prepare(`INSERT INTO users (email, name, role, password_hash, created_at) VALUES ('b@jc.test', 'Beto', 'socio', 'x', 'now')`).run();
  const calls = [];
  const service = createPushService({
    db, now: () => NOW, logger: { error() {} },
    fetchImpl: async (url, init) => { calls.push({ url, init }); throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }); },
  });
  const s = subscriber();
  db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (1, 'https://fcm.googleapis.com/fcm/send/x', ?, ?, 'now')`).run(s.p256dh, s.authB64);
  const sub = db.prepare('SELECT * FROM push_subscriptions').get();
  const r = await service.deliver(sub, { title: 'x' });
  assert.deepEqual(r, { ok: false, status: 0, gone: false });
  assert.ok(calls[0].init.signal instanceof AbortSignal, 'con AbortSignal.timeout');
  assert.equal(parseAuthorization(calls[0].init.headers.Authorization).claims.aud, 'https://fcm.googleapis.com');
  assert.equal(db.prepare('SELECT last_error FROM push_subscriptions').get().last_error, 'timeout');
  db.close();
  // Un envío que termina con la base ya cerrada (apagado) no lanza.
  assert.equal((await service.deliver(sub, { title: 'x' })).ok, false);
});
