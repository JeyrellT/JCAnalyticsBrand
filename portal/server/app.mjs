// ============================================================================
//  server/app.mjs
//  Servidor HTTP del portal: API JSON + archivos estáticos del frontend en el
//  mismo origen (sin CORS, cookie de sesión SameSite=Strict).
//
//  Capas de seguridad:
//    · Sesión en cookie HttpOnly; en la base solo vive el hash del token.
//    · Toda escritura exige el encabezado X-Portal-Request y un Origin propio
//      (defensa CSRF además de SameSite=Strict).
//    · Permisos por rol en cada ruta: user · invest (socio/admin) · admin.
//    · Clientes con identidad aparte (v5): cookie propia, tabla propia y solo
//      rutas /api/client/* (acceso client/client_any). Una cookie de cliente no
//      abre ninguna ruta del equipo, ni al revés.
//    · Límite de intentos de login por IP y por correo.
//    · Encabezados CSP, anti-iframe y HSTS en producción.
// ============================================================================

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { createContext } from './context.mjs';
import { HttpError, readJson, parseCookies, serializeCookie } from './http.mjs';
import { createLoginLimiter, newSessionToken, hashToken } from './auth.mjs';
import { registerRoutes } from './routes/index.mjs';
import { createRouter, isClientRoute } from './router.mjs';

const COOKIE = 'jcp_session';
const IDLE_MS = 12 * 3_600_000;         // la sesión expira tras 12 h sin uso
const ABSOLUTE_MS = 7 * 24 * 3_600_000; // y siempre a los 7 días

// Portal de clientes: sesión más corta (uso esporádico, fuera del equipo).
const CLIENT_COOKIE = 'jcc_session';
const CLIENT_IDLE_MS = 8 * 3_600_000;
const CLIENT_ABSOLUTE_MS = 3 * 24 * 3_600_000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * @param {object} o
 * @param {object|null} [o.push]  servicio Web Push (server/push.mjs); null = avisos solo en el buzón
 * @param {(() => Promise<unknown>)|null} [o.fetchExchangeRate]  consulta del tipo de cambio para la automatización tipo_cambio
 * El servidor devuelto expone `server.ctx` (y `server.ctx.automations`) para el programador de index.mjs y las pruebas.
 */
export function createPortalServer({
  db, env = process.env, now = () => Date.now(), staticDir = null, logger = console, push = null, fetchExchangeRate = null,
} = {}) {
  const ctx = createContext({ db, now, push, fetchExchangeRate });
  const router = createRouter();

  const isProduction = env.NODE_ENV === 'production';
  const allowedOrigins = new Set((env.PORTAL_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean));
  const limiterIp = createLoginLimiter({ max: 20, now });
  const limiterEmail = createLoginLimiter({ max: 5, now });

  const isSecure = (req) => req.headers['x-forwarded-proto'] === 'https' || (isProduction && env.PORTAL_INSECURE_COOKIE !== '1');
  // El último salto de X-Forwarded-For lo agrega el proxy de Railway; los anteriores (y X-Real-IP)
  // los puede escribir el cliente, así que no sirven para limitar intentos.
  const clientIp = (req) => String(req.headers['x-forwarded-for']?.split(',').at(-1) || req.socket.remoteAddress || '').trim();

  const session = {
    limiter: {
      blocked: ([ipKey, emailKey]) => limiterIp.blocked([ipKey]) || limiterEmail.blocked([emailKey]),
      fail: ([ipKey, emailKey]) => { limiterIp.fail([ipKey]); limiterEmail.fail([emailKey]); },
      reset: ([ipKey, emailKey]) => { limiterEmail.reset([emailKey]); limiterIp.release([ipKey]); },
    },
    start(res, req, userId, ip) {
      const token = newSessionToken();
      const at = now();
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date(at).toISOString());
      db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)').run(
        hashToken(token), userId, new Date(at).toISOString(), new Date(at + IDLE_MS).toISOString(), ip, String(req.headers['user-agent'] ?? '').slice(0, 200),
      );
      res.setHeader('Set-Cookie', serializeCookie(COOKIE, token, { maxAge: ABSOLUTE_MS / 1000, secure: isSecure(req) }));
    },
    end(req, res) {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
      res.setHeader('Set-Cookie', serializeCookie(COOKIE, '', { maxAge: 0, secure: isSecure(req) }));
    },
    endOthers(req, userId) {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(userId, token ? hashToken(token) : '');
    },
    /** Sesiones de cuentas de cliente: misma mecánica, otra tabla y otra cookie. */
    client: {
      start(res, req, accountId, ip) {
        const token = newSessionToken();
        const at = now();
        db.prepare('DELETE FROM client_sessions WHERE expires_at < ?').run(new Date(at).toISOString());
        db.prepare('INSERT INTO client_sessions (token_hash, account_id, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)').run(
          hashToken(token), accountId, new Date(at).toISOString(), new Date(at + CLIENT_IDLE_MS).toISOString(), ip, String(req.headers['user-agent'] ?? '').slice(0, 200),
        );
        res.setHeader('Set-Cookie', serializeCookie(CLIENT_COOKIE, token, { maxAge: CLIENT_ABSOLUTE_MS / 1000, secure: isSecure(req) }));
      },
      end(req, res) {
        const token = parseCookies(req.headers.cookie)[CLIENT_COOKIE];
        if (token) db.prepare('DELETE FROM client_sessions WHERE token_hash = ?').run(hashToken(token));
        res.setHeader('Set-Cookie', serializeCookie(CLIENT_COOKIE, '', { maxAge: 0, secure: isSecure(req) }));
      },
      endOthers(req, accountId) {
        const token = parseCookies(req.headers.cookie)[CLIENT_COOKIE];
        db.prepare('DELETE FROM client_sessions WHERE account_id = ? AND token_hash <> ?').run(accountId, token ? hashToken(token) : '');
      },
    },
  };

  function currentUser(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (!token || token.length > 100) return null;
    const tokenHash = hashToken(token);
    const row = db.prepare(`SELECT s.created_at s_created, s.expires_at s_expires, u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`).get(tokenHash);
    if (!row) return null;
    const t = now();
    if (!row.active || new Date(row.s_expires).getTime() < t || new Date(row.s_created).getTime() + ABSOLUTE_MS < t) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      return null;
    }
    // Renovación deslizante, a lo sumo una escritura cada 5 minutos.
    if (new Date(row.s_expires).getTime() - t < IDLE_MS - 5 * 60_000) {
      db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(new Date(t + IDLE_MS).toISOString(), tokenHash);
    }
    return row;
  }

  /** Cuenta de cliente de la cookie jcc_session (con el nombre de su empresa) o null. */
  function currentClient(req) {
    const token = parseCookies(req.headers.cookie)[CLIENT_COOKIE];
    if (!token || token.length > 100) return null;
    const tokenHash = hashToken(token);
    const row = db.prepare(`SELECT s.created_at s_created, s.expires_at s_expires, a.*, c.name client_name FROM client_sessions s
      JOIN client_accounts a ON a.id = s.account_id JOIN clients c ON c.id = a.client_id WHERE s.token_hash = ?`).get(tokenHash);
    if (!row) return null;
    const t = now();
    if (!row.active || new Date(row.s_expires).getTime() < t || new Date(row.s_created).getTime() + CLIENT_ABSOLUTE_MS < t) {
      db.prepare('DELETE FROM client_sessions WHERE token_hash = ?').run(tokenHash);
      return null;
    }
    if (new Date(row.s_expires).getTime() - t < CLIENT_IDLE_MS - 5 * 60_000) {
      db.prepare('UPDATE client_sessions SET expires_at = ? WHERE token_hash = ?').run(new Date(t + CLIENT_IDLE_MS).toISOString(), tokenHash);
    }
    return { ...row, principal: 'client' };
  }

  registerRoutes(router.route, ctx, session);

  function securityHeaders(res, req) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (isSecure(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  function json(res, status, body) {
    if (res.headersSent) return;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  }

  function originAllowed(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // navegadores siempre lo envían en escrituras cross-site; el encabezado propio cubre el resto
    if (allowedOrigins.has(origin)) return true;
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  }

  async function handleApi(req, res, pathname, query) {
    const { route: found, params } = router.match(req.method, pathname);
    if (req.method !== 'GET') {
      if (req.headers['x-portal-request'] !== '1' || !originAllowed(req)) return json(res, 403, { error: 'csrf_blocked' });
    }
    // Cada familia de rutas lee SOLO su cookie: la del equipo o la del cliente.
    const clientRoute = isClientRoute(found);
    const principal = found.access === 'public' ? null : clientRoute ? currentClient(req) : currentUser(req);
    router.authorize(found, principal);
    const body = await readJson(req);
    const result = await found.handler({
      req, res, params, query, body, ip: clientIp(req),
      user: clientRoute ? null : principal,
      account: clientRoute ? principal : null,
    });
    if (!res.headersSent) json(res, 200, result ?? { ok: true });
  }

  async function serveStatic(req, res, pathname) {
    if (!staticDir) return json(res, 404, { error: 'not_found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'method_not_allowed' });
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { return json(res, 400, { error: 'bad_path' }); }
    const root = normalize(staticDir + sep);
    let file = normalize(join(root, decoded));
    if (!file.startsWith(root)) return json(res, 403, { error: 'forbidden' });
    let info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      // Rutas de la SPA (/proyectos/3, /agenda…) devuelven index.html; un archivo con extensión inexistente es 404.
      if (extname(decoded)) return json(res, 404, { error: 'not_found' });
      file = join(root, 'index.html');
      info = await stat(file).catch(() => null);
      if (!info) return json(res, 404, { error: 'not_found' });
    }
    const isAsset = decoded.startsWith('/assets/');
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    res.end(await readFile(file));
  }

  const server = createServer({ requestTimeout: 30_000, headersTimeout: 15_000 }, async (req, res) => {
    const started = Date.now();
    let pathname = '/';
    try {
      const parsed = new URL(req.url, 'http://localhost');
      pathname = parsed.pathname;
      securityHeaders(res, req);
      if (pathname === '/health') {
        db.prepare('SELECT 1').get();
        return json(res, 200, { status: 'ok' });
      }
      if (pathname.startsWith('/api/')) await handleApi(req, res, pathname, parsed.searchParams);
      else await serveStatic(req, res, pathname);
    } catch (error) {
      if (error instanceof HttpError) {
        json(res, error.status, { error: error.code, ...error.extra });
      } else {
        logger.error(`[portal] ${req.method} ${pathname} failed: ${error?.stack ?? error}`);
        json(res, 500, { error: 'server_error' });
      }
    } finally {
      if (env.PORTAL_LOG_REQUESTS === '1') logger.info(`[portal] ${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    }
  });
  server.ctx = ctx;
  return server;
}
