// ============================================================================
//  demo/backend.js
//  El backend REAL del portal corriendo dentro del navegador: mismas
//  migraciones, mismo router con permisos por rol y los mismos módulos de
//  rutas (server/routes/index.mjs), sobre una base SQLite en memoria (sql.js).
//  dispatch() reemplaza a fetch: recibe (path, { method, body }) y devuelve
//  { status, data } con la misma forma que daría la API HTTP.
//
//  Este archivo no depende del navegador: las pruebas lo pueden usar desde Node
//  con node:sqlite o con el adaptador de sql.js.
// ============================================================================

import { createContext } from '../server/context.mjs';
import { createRouter, isClientRoute } from '../server/router.mjs';
import { registerRoutes } from '../server/routes/index.mjs';
import { HttpError } from '../server/http.mjs';
import { migrate } from '../server/schema.mjs';
import { hashPassword } from '../server/auth.mjs';
import { seedDemoData, DEMO_PASSWORD, DEMO_DOMAIN } from '../server/demo-data.mjs';

export { DEMO_PASSWORD, DEMO_DOMAIN };

/** Sesión de quien mira la demo (las de la siembra usan otras). */
export const VIEWER = 'viewer';

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Navegador del "celular" simulado de cada persona (Mis dispositivos lo muestra como iPhone · App instalada). */
const DEMO_DEVICE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** Bytes pseudoaleatorios fijos (por semilla) en base64url sin relleno: claves falsas con el largo correcto. */
function fakeKey(length, seed, first = null) {
  const bytes = new Uint8Array(length);
  let x = (Math.imul(seed + 1, 2654435761) >>> 0) || 1;
  for (let i = 0; i < length; i += 1) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    bytes[i] = x & 255;
  }
  if (first != null) bytes[0] = first;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Respuesta HTTP mínima: captura lo que las rutas escriben directo (CSV, respaldo). */
function createResponse() {
  const chunks = [];
  return {
    statusCode: 200,
    headers: {},
    headersSent: false,
    writableEnded: false,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; return this; },
    getHeader(name) { return this.headers[String(name).toLowerCase()]; },
    removeHeader(name) { delete this.headers[String(name).toLowerCase()]; },
    writeHead(status, headers = {}) {
      this.statusCode = status;
      for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
      this.headersSent = true;
      return this;
    },
    write(chunk) { this.headersSent = true; chunks.push(chunk); return true; },
    end(chunk) {
      if (chunk != null) chunks.push(chunk);
      this.headersSent = true;
      this.writableEnded = true;
      return this;
    },
    text() {
      const decoder = new TextDecoder();
      return chunks.map((c) => (typeof c === 'string' ? c : decoder.decode(c))).join('');
    },
  };
}

/** Igual que readJson() del servidor: GET/DELETE no llevan cuerpo y solo se aceptan objetos. */
function readBody(method, body) {
  if (method === 'GET' || method === 'DELETE' || body === undefined || body === null) return {};
  let parsed;
  try { parsed = clone(body); } catch { throw new HttpError(400, 'invalid_json'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'invalid_json');
  return parsed;
}

/**
 * @param {object} o
 * @param {object} o.db      base con la API de node:sqlite (exec/prepare)
 * @param {() => number} [o.now]
 * @param {(error: unknown, where: string) => void} [o.onError]  errores inesperados (500)
 */
export function createDemoBackend({ db, now, onError = (error, where) => console.error(`[demo] ${where}`, error) }) {
  migrate(db);
  const ctx = createContext(now ? { db, now } : { db });
  const router = createRouter();

  // Sesiones lógicas: identificador → id de usuario. La siembra inicia sesión
  // con cada persona a la vez; quien mira la demo usa VIEWER.
  const sessions = new Map();
  // Portal de clientes (v5): sesiones aparte, igual que la cookie jcc_session del servidor.
  const clientSessions = new Map();
  const session = {
    limiter: { blocked: () => false, fail() {}, reset() {}, release() {} },
    start(_res, req, userId) { sessions.set(req.sid, userId); },
    end(req) { sessions.delete(req.sid); },
    endOthers(req, userId) {
      for (const [sid, uid] of sessions) if (uid === userId && sid !== req.sid) sessions.delete(sid);
    },
    client: {
      start(_res, req, accountId) { clientSessions.set(req.sid, accountId); },
      end(req) { clientSessions.delete(req.sid); },
      endOthers(req, accountId) {
        for (const [sid, aid] of clientSessions) if (aid === accountId && sid !== req.sid) clientSessions.delete(sid);
      },
    },
  };

  registerRoutes(router.route, ctx, session);

  function currentUser(sid) {
    const userId = sessions.get(sid);
    if (userId == null) return null;
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!row?.active) {
      sessions.delete(sid);
      return null;
    }
    return row;
  }

  function currentClient(sid) {
    const accountId = clientSessions.get(sid);
    if (accountId == null) return null;
    const row = db.prepare('SELECT a.*, c.name client_name FROM client_accounts a JOIN clients c ON c.id = a.client_id WHERE a.id = ?').get(accountId);
    if (!row?.active) {
      clientSessions.delete(sid);
      return null;
    }
    return { ...row, principal: 'client' };
  }

  async function dispatch(path, { method = 'GET', body } = {}, sid = VIEWER) {
    const verb = String(method).toUpperCase();
    const url = new URL(path, 'http://portal.demo');
    try {
      const { route: found, params } = router.match(verb, url.pathname);
      const clientRoute = isClientRoute(found);
      const principal = found.access === 'public' ? null : clientRoute ? currentClient(sid) : currentUser(sid);
      router.authorize(found, principal);
      const input = readBody(verb, body);
      const req = {
        method: verb,
        url: url.pathname + url.search,
        // El navegador real: "Mis dispositivos" describe bien el equipo que activa avisos en la demo.
        headers: { 'user-agent': (typeof navigator !== 'undefined' && navigator.userAgent) || 'portal-demo', host: 'portal.demo' },
        sid,
      };
      const res = createResponse();
      const result = await found.handler({
        req, res, params, query: url.searchParams, body: input, ip: 'demo',
        user: clientRoute ? null : principal,
        account: clientRoute ? principal : null,
      });
      if (res.headersSent) {
        const type = String(res.getHeader('content-type') ?? '');
        const text = res.text();
        return { status: res.statusCode, data: type.includes('json') && text ? JSON.parse(text) : text, headers: res.headers };
      }
      return { status: 200, data: clone(result ?? { ok: true }) };
    } catch (error) {
      if (error instanceof HttpError) return { status: error.status, data: { error: error.code, ...error.extra } };
      onError(error, `${verb} ${url.pathname}`);
      return { status: 500, data: { error: 'server_error' } };
    }
  }

  /** Cliente de la API ligado a una sesión (lanza si la respuesta no es 2xx). */
  function client(sid) {
    return async (method, path, body) => {
      const { status, data } = await dispatch(path, { method, body }, sid);
      if (status < 200 || status >= 300) throw new Error(`${method} ${path} → ${status} ${JSON.stringify(data)}`);
      return data;
    };
  }

  /**
   * Corre fn(api) con una sesión lógica propia de otra persona (sin pasar por el
   * login): los escenarios de la demo crean datos por las rutas reales "como" ella.
   */
  async function as(userId, fn) {
    const sid = `as:${userId}:${Math.random().toString(36).slice(2)}`;
    sessions.set(sid, userId);
    try {
      return await fn(client(sid));
    } finally {
      sessions.delete(sid);
    }
  }

  /**
   * Avisos visibles desde el primer momento: cada persona tiene un "celular" con
   * avisos activos (suscripción falsa que pasa la lista permitida) y su horario
   * tranquilo vacío (inicio = fin), para que la demo muestre avisos a cualquier hora.
   */
  async function seedDemoDevices() {
    const createdAt = new Date(ctx.now() - 2 * 86_400_000).toISOString();
    const insert = db.prepare(`INSERT OR IGNORE INTO push_subscriptions (user_id, endpoint, p256dh, auth, platform, user_agent, created_at, failures)
      VALUES (?, ?, ?, ?, 'demo', ?, ?, 0)`);
    for (const { id } of db.prepare('SELECT id FROM users WHERE active = 1 ORDER BY id').all()) {
      await as(id, (api) => api('PATCH', '/api/me/notification-prefs', { quiet_start: '00:00', quiet_end: '00:00' }));
      insert.run(id, `https://fcm.googleapis.com/fcm/send/demo-${id}`, fakeKey(65, id, 0x04), fakeKey(16, id + 97), DEMO_DEVICE_UA, createdAt);
    }
  }

  /** Carga los datos ficticios pasando por la API real y deja la demo sin sesión. */
  async function seed() {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const login = async (who) => {
      const sid = `seed:${who}`;
      await client(sid)('POST', '/api/auth/login', { email: `${who}@${DEMO_DOMAIN}`, password: DEMO_PASSWORD });
      return client(sid);
    };
    const loginClient = async (email) => {
      const sid = `seed-client:${email}`;
      await client(sid)('POST', '/api/client/auth/login', { email, password: DEMO_PASSWORD });
      return client(sid);
    };
    const out = await seedDemoData({ db, passwordHash, login, loginClient, now: now?.() });
    await seedDemoDevices();
    sessions.clear();
    clientSessions.clear();
    return out;
  }

  /** Corre fn(api) con una sesión de cliente lógica (escenarios y siembra del portal de clientes). */
  async function asClient(accountId, fn) {
    const sid = `client:${accountId}:${Math.random().toString(36).slice(2)}`;
    clientSessions.set(sid, accountId);
    try {
      return await fn(client(sid));
    } finally {
      clientSessions.delete(sid);
    }
  }

  /** Id de la persona que mira la demo (sesión VIEWER) o null en el selector. */
  const viewerId = () => sessions.get(VIEWER) ?? null;
  /** Id de la cuenta de cliente que mira la demo (sesión VIEWER) o null. */
  const viewerClientId = () => clientSessions.get(VIEWER) ?? null;

  /**
   * Servicio de push simulado (misma forma que server/push.mjs): la política de
   * avisos decide como en producción y aquí cada "envío" sale bien. Solo se
   * muestra en pantalla lo que va a la persona que mira la demo (una vez por
   * aviso aunque tenga varios dispositivos).
   * @param {(payload: object) => void} onShow
   */
  let shownCount = 0;
  function simulatePush(onShow) {
    const shown = new WeakSet();
    const touch = db.prepare('UPDATE push_subscriptions SET last_success_at = ?, failures = 0, last_error = NULL WHERE id = ?');
    ctx.push = {
      publicKey: 'demo',
      async deliver(sub, payload) {
        if (sub.user_id === viewerId() && payload && typeof payload === 'object' && !shown.has(payload)) {
          shown.add(payload);
          shownCount += 1;
          try { onShow(payload); } catch (error) { onError(error, 'push simulado'); }
        }
        // Fuera de la transacción de quien avisó (ctx.notify corre dentro de algunas).
        const at = ctx.nowIso();
        queueMicrotask(() => { try { touch.run(at, sub.id); } catch { /* el dispositivo ya no existe */ } });
        return { ok: true, status: 201, gone: false };
      },
    };
  }

  /** Personas para el selector de la demo, en el orden en que se crearon. */
  const personas = () => db.prepare('SELECT id, name, email, role, color FROM users WHERE active = 1 ORDER BY id').all();
  /** Cuentas de cliente activas para el selector de la demo (v5). */
  const clientPersonas = () => db.prepare(`SELECT a.id, a.name, a.email, a.title, c.name client_name FROM client_accounts a
    JOIN clients c ON c.id = a.client_id WHERE a.active = 1 ORDER BY a.id`).all();

  return {
    db, ctx, router, dispatch, client, seed, personas, clientPersonas, sessions, clientSessions, as, asClient, viewerId, viewerClientId, simulatePush,
    /** Cuántos avisos se mostraron en pantalla hasta ahora (para saber si un escenario produjo alguno). */
    pushShown: () => shownCount,
  };
}
