// Utilidades de prueba: levanta el servidor con una base en memoria y un reloj
// controlable, y ofrece un cliente HTTP con cookies por persona.
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';
import { hashPassword } from '../server/auth.mjs';

export const PASSWORD = 'ClaveSegura2026';

/**
 * @param {object} [o]
 * @param {number} [o.startAt]  hora inicial del reloj (ms)
 * @param {object|null} [o.push]  servicio push falso (ver fakePush) o null
 * @param {Function|null} [o.fetchExchangeRate]  consulta del tipo de cambio inyectada
 * @param {string|null} [o.setupCode]  código de configuración inicial (v6)
 */
export async function startServer({ startAt = Date.parse('2026-10-10T15:00:00Z'), push = null, fetchExchangeRate = null, setupCode = null } = {}) {
  const db = openDatabase(':memory:');
  const clock = { t: startAt };
  const server = createPortalServer({ db, env: {}, now: () => clock.t, logger: { error() {}, info() {} }, push, fetchExchangeRate, setupCode });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const hash = await hashPassword(PASSWORD);
  const addUser = (email, name, role, mustChange = 0) => Number(db.prepare(
    `INSERT INTO users (email, name, role, color, password_hash, must_change_password, created_at) VALUES (?, ?, ?, '#0065df', ?, ?, ?)`,
  ).run(email, name, role, hash, mustChange, new Date(clock.t).toISOString()).lastInsertRowid);

  function client() {
    let cookie = '';
    async function call(method, path, body, { headers = {} } = {}) {
      const res = await fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(method !== 'GET' ? { 'x-portal-request': '1' } : {}),
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      const type = res.headers.get('content-type') ?? '';
      const data = type.includes('json') ? await res.json() : await res.text();
      return { status: res.status, data, headers: res.headers };
    }
    return {
      call,
      get: (p) => call('GET', p),
      post: (p, b = {}) => call('POST', p, b),
      patch: (p, b = {}) => call('PATCH', p, b),
      del: (p) => call('DELETE', p),
      login: (email, password = PASSWORD) => call('POST', '/api/auth/login', { email, password }),
      get cookie() { return cookie; },
    };
  }

  return { db, base, clock, addUser, client, ctx: server.ctx, close: () => new Promise((r) => server.close(r)) };
}

/** Servicio push falso con la misma forma que server/push.mjs: registra cada envío. */
export function fakePush({ result = { ok: true, status: 201, gone: false } } = {}) {
  const deliveries = [];
  return {
    publicKey: 'BFakePublicKeyForTests',
    deliveries,
    deliver(sub, payload) {
      deliveries.push({ sub, payload });
      return Promise.resolve(typeof result === 'function' ? result(sub, payload) : result);
    },
  };
}
