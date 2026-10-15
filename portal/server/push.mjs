// ============================================================================
//  server/push.mjs — envío Web Push (SOLO Node; ninguna ruta lo importa).
//
//  · VAPID (RFC 8292): JWT ES256 firmado con node:crypto (firma IEEE P1363).
//  · Cifrado del contenido aes128gcm (RFC 8291 + RFC 8188): ECDH P-256 efímero,
//    HKDF-SHA-256 y AES-128-GCM, un solo registro.
//  · Entrega (RFC 8030): POST al endpoint de la suscripción con TTL y Urgency.
//    404/410 → la suscripción ya no existe y se borra; otro error suma una
//    falla y a las 10 seguidas también se borra.
//
//  La lista de servicios permitidos (SSRF) se aplica al suscribir, en
//  routes/push.mjs; deliver() confía en lo que ya está guardado.
// ============================================================================

import { createECDH, createPrivateKey, createPublicKey, sign, hkdfSync, createCipheriv, randomBytes } from 'node:crypto';

export const DEFAULT_VAPID_SUBJECT = 'mailto:gerencia@jcanalytic.com';
const TTL_SECONDS = 24 * 3600;
const JWT_LIFETIME_SECONDS = 12 * 3600;
const RECORD_SIZE = 4096;
const MAX_FAILURES = 10;
const TIMEOUT_MS = 10_000;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const fromB64url = (s) => Buffer.from(String(s), 'base64url');
/** Escalar privado de 32 bytes (algunas versiones de OpenSSL omiten los ceros iniciales). */
const pad32 = (buf) => (buf.length >= 32 ? buf : Buffer.concat([Buffer.alloc(32 - buf.length), buf]));

/** Claves JWK a partir de la clave pública sin comprimir (65 bytes) y el escalar privado (32 bytes). */
function jwkFor(publicKey, privateKey) {
  const jwk = { kty: 'EC', crv: 'P-256', x: b64url(publicKey.subarray(1, 33)), y: b64url(publicKey.subarray(33, 65)) };
  return privateKey ? { ...jwk, d: b64url(privateKey) } : jwk;
}

/** Objeto de clave pública de Node a partir de la forma base64url que viaja en `k=`. */
export function vapidPublicKeyObject(publicKeyB64url) {
  return createPublicKey({ key: jwkFor(fromB64url(publicKeyB64url)), format: 'jwk' });
}

/** Valida un par VAPID (base64url) y devuelve los bytes; lanza si no es un par P-256 coherente. */
function checkVapidPair(publicB64, privateB64) {
  const publicKey = fromB64url(publicB64);
  const privateKey = fromB64url(privateB64);
  if (publicKey.length !== 65 || publicKey[0] !== 0x04) throw new Error('La clave pública VAPID debe ser un punto P-256 sin comprimir (65 bytes, base64url).');
  if (privateKey.length !== 32) throw new Error('La clave privada VAPID debe ser el escalar d de 32 bytes (base64url).');
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(privateKey);
  if (!ecdh.getPublicKey().equals(publicKey)) throw new Error('Las claves VAPID pública y privada no forman un par.');
  return { publicKey, privateKey };
}

/**
 * Claves VAPID: de las variables de entorno o, si no hay, generadas una vez y
 * guardadas en app_secrets (que ninguna ruta lee).
 */
export function loadVapidKeys(db, env = {}) {
  const envPublic = env.PORTAL_VAPID_PUBLIC_KEY?.trim();
  const envPrivate = env.PORTAL_VAPID_PRIVATE_KEY?.trim();
  if (envPublic || envPrivate) {
    if (!envPublic || !envPrivate) throw new Error('Definí PORTAL_VAPID_PUBLIC_KEY y PORTAL_VAPID_PRIVATE_KEY juntas (o ninguna).');
    return checkVapidPair(envPublic, envPrivate);
  }
  const read = (key) => db.prepare('SELECT value FROM app_secrets WHERE key = ?').get(key)?.value;
  let pub = read('vapid_public_key');
  let priv = read('vapid_private_key');
  if (!pub || !priv) {
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    pub = b64url(ecdh.getPublicKey());
    priv = b64url(pad32(ecdh.getPrivateKey()));
    // INSERT OR IGNORE + relectura: si dos procesos arrancan a la vez, gana el primero.
    const save = db.prepare('INSERT OR IGNORE INTO app_secrets (key, value) VALUES (?, ?)');
    save.run('vapid_public_key', pub);
    save.run('vapid_private_key', priv);
    pub = read('vapid_public_key');
    priv = read('vapid_private_key');
  }
  return checkVapidPair(pub, priv);
}

/** JWT ES256 para la cabecera Authorization: vapid t=…, k=… */
export function createVapidJwt({ audience, subject, publicKey, privateKey, nowMs }) {
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64url(JSON.stringify({ aud: audience, exp: Math.floor(nowMs / 1000) + JWT_LIFETIME_SECONDS, sub: subject }));
  const unsigned = `${header}.${claims}`;
  const key = createPrivateKey({ key: jwkFor(publicKey, privateKey), format: 'jwk' });
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${b64url(signature)}`;
}

/**
 * Cifra `plaintext` para una suscripción (RFC 8291, aes128gcm, un registro).
 * @param {Buffer} plaintext
 * @param {string} p256dhB64  clave pública del navegador (65 bytes, base64url)
 * @param {string} authB64    secreto de autenticación (16 bytes, base64url)
 * @returns {Buffer} cuerpo listo para enviar
 */
export function encryptPayload(plaintext, p256dhB64, authB64, { salt = randomBytes(16), serverKeys = null } = {}) {
  const uaPublic = fromB64url(p256dhB64);
  const authSecret = fromB64url(authB64);
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) throw new Error('p256dh inválido');
  if (authSecret.length !== 16) throw new Error('auth inválido');
  if (plaintext.length > RECORD_SIZE - 17 - 86) throw new Error('payload demasiado grande');

  const ecdh = serverKeys ?? createECDH('prime256v1');
  if (!serverKeys) ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));
  // CEK y NONCE (RFC 8188) con la sal aleatoria del encabezado.
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));

  // Un solo registro: datos || 0x02 (delimitador del último registro), sin relleno extra.
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const record = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, record]);
}

/** Urgencia RFC 8030: dinero y citas no esperan; lo demás es normal. */
export const urgencyFor = (payload) => (['dinero', 'agenda'].includes(payload?.category) ? 'high' : 'normal');

/**
 * @param {object} o
 * @param {object} o.db
 * @param {object} [o.env]        PORTAL_VAPID_PUBLIC_KEY / PORTAL_VAPID_PRIVATE_KEY / PORTAL_VAPID_SUBJECT
 * @param {typeof fetch} [o.fetchImpl]
 * @param {() => number} [o.now]
 * @param {{ error: Function, info?: Function }} [o.logger]
 */
export function createPushService({ db, env = {}, fetchImpl = globalThis.fetch, now = () => Date.now(), logger = console } = {}) {
  const { publicKey, privateKey } = loadVapidKeys(db, env);
  const publicKeyB64 = b64url(publicKey);
  const subject = env.PORTAL_VAPID_SUBJECT?.trim() || DEFAULT_VAPID_SUBJECT;
  /** Un JWT por origen, reutilizado mientras le quede más de una hora. */
  const jwtCache = new Map();

  function authorization(endpoint) {
    const audience = new URL(endpoint).origin;
    const t = now();
    const cached = jwtCache.get(audience);
    if (cached && cached.expMs - t > 3_600_000) return cached.header;
    const jwt = createVapidJwt({ audience, subject, publicKey, privateKey, nowMs: t });
    const header = `vapid t=${jwt}, k=${publicKeyB64}`;
    jwtCache.set(audience, { header, expMs: t + JWT_LIFETIME_SECONDS * 1000 });
    return header;
  }

  /** Escrituras sobre la suscripción tolerantes a una base ya cerrada (envío tardío al apagar). */
  function safeDb(fn) {
    try { return fn(); } catch (error) { logger.error?.(`[push] no se pudo actualizar la suscripción: ${error?.message ?? error}`); return null; }
  }

  function recordFailure(sub, message) {
    return safeDb(() => {
      db.prepare('UPDATE push_subscriptions SET failures = failures + 1, last_error = ? WHERE id = ?').run(String(message).slice(0, 200), sub.id);
      const row = db.prepare('SELECT failures FROM push_subscriptions WHERE id = ?').get(sub.id);
      if (row && row.failures >= MAX_FAILURES) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
        return true;
      }
      return false;
    });
  }

  /**
   * Envía `payload` (objeto JSON) a una suscripción guardada.
   * @returns {Promise<{ ok: boolean, status: number, gone: boolean }>}
   */
  async function deliver(sub, payload) {
    let status = 0;
    let problem;
    try {
      const body = encryptPayload(Buffer.from(JSON.stringify(payload)), sub.p256dh, sub.auth);
      const res = await fetchImpl(sub.endpoint, {
        method: 'POST',
        headers: {
          Authorization: authorization(sub.endpoint),
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: String(TTL_SECONDS),
          Urgency: urgencyFor(payload),
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      status = res.status;
      await res.arrayBuffer().catch(() => null); // libera la conexión
      if (status >= 200 && status < 300) {
        safeDb(() => db.prepare('UPDATE push_subscriptions SET last_success_at = ?, failures = 0, last_error = NULL WHERE id = ?')
          .run(new Date(now()).toISOString(), sub.id));
        return { ok: true, status, gone: false };
      }
      if (status === 404 || status === 410) {
        safeDb(() => db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id));
        return { ok: false, status, gone: true };
      }
      problem = `HTTP ${status}`;
    } catch (error) {
      problem = error?.name === 'TimeoutError' ? 'timeout' : (error?.message ?? String(error));
    }
    const removed = recordFailure(sub, problem);
    logger.error?.(`[push] envío fallido a la suscripción ${sub.id}: ${problem}${removed ? ' (borrada tras 10 fallas)' : ''}`);
    return { ok: false, status, gone: false };
  }

  return { publicKey: publicKeyB64, subject, deliver };
}
