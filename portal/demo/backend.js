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
import { createRouter } from '../server/router.mjs';
import { registerRoutes } from '../server/routes/index.mjs';
import { HttpError } from '../server/http.mjs';
import { migrate } from '../server/schema.mjs';
import { hashPassword } from '../server/auth.mjs';
import { seedDemoData, DEMO_PASSWORD, DEMO_DOMAIN } from '../server/demo-data.mjs';

export { DEMO_PASSWORD, DEMO_DOMAIN };

/** Sesión de quien mira la demo (las de la siembra usan otras). */
export const VIEWER = 'viewer';

const clone = (value) => JSON.parse(JSON.stringify(value));

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
  const session = {
    limiter: { blocked: () => false, fail() {}, reset() {}, release() {} },
    start(_res, req, userId) { sessions.set(req.sid, userId); },
    end(req) { sessions.delete(req.sid); },
    endOthers(req, userId) {
      for (const [sid, uid] of sessions) if (uid === userId && sid !== req.sid) sessions.delete(sid);
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

  async function dispatch(path, { method = 'GET', body } = {}, sid = VIEWER) {
    const verb = String(method).toUpperCase();
    const url = new URL(path, 'http://portal.demo');
    try {
      const { route: found, params } = router.match(verb, url.pathname);
      const user = found.access === 'public' ? null : currentUser(sid);
      router.authorize(found, user);
      const input = readBody(verb, body);
      const req = {
        method: verb,
        url: url.pathname + url.search,
        headers: { 'user-agent': 'portal-demo', host: 'portal.demo' },
        sid,
      };
      const res = createResponse();
      const result = await found.handler({ req, res, user, params, query: url.searchParams, body: input, ip: 'demo' });
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

  /** Carga los datos ficticios pasando por la API real y deja la demo sin sesión. */
  async function seed() {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const login = async (who) => {
      const sid = `seed:${who}`;
      await client(sid)('POST', '/api/auth/login', { email: `${who}@${DEMO_DOMAIN}`, password: DEMO_PASSWORD });
      return client(sid);
    };
    const out = await seedDemoData({ db, passwordHash, login, now: now?.() });
    sessions.clear();
    return out;
  }

  /** Personas para el selector de la demo, en el orden en que se crearon. */
  const personas = () => db.prepare('SELECT id, name, email, role, color FROM users WHERE active = 1 ORDER BY id').all();

  return { db, ctx, router, dispatch, client, seed, personas, sessions };
}
