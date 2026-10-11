// ============================================================================
//  server/index.mjs — punto de entrada (Railway: `npm start`).
//
//  Variables de entorno:
//    PORT                    puerto (Railway lo asigna)
//    PORTAL_DB_PATH          ruta del archivo SQLite (en Railway: un volumen, p. ej. /data/portal.sqlite)
//    PORTAL_ADMIN_EMAIL      ┐ solo si la base está vacía: crea el primer administrador
//    PORTAL_ADMIN_NAME       │ con esta contraseña temporal (se pide cambiarla al entrar).
//    PORTAL_ADMIN_PASSWORD   ┘ Borrar estas variables después del primer arranque.
//    PORTAL_ALLOWED_ORIGINS  orígenes extra permitidos para escrituras (opcional)
//    NODE_ENV=production     activa cookies Secure y HSTS
//    PORTAL_VAPID_PUBLIC_KEY ┐ claves Web Push (base64url; pública sin comprimir de 65 bytes,
//    PORTAL_VAPID_PRIVATE_KEY┘ privada = escalar d de 32 bytes). Sin ellas se generan una vez y se guardan en la base.
//    PORTAL_VAPID_SUBJECT    contacto VAPID (por defecto mailto:gerencia@jcanalytic.com)
//    PORTAL_FX_URL           API del tipo de cambio (por defecto https://api.hacienda.go.cr/indicadores/tc/dolar)
//    PORTAL_SCHEDULER=0      apaga el programador de automatizaciones (corre cada 60 s)
// ============================================================================

import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { openDatabase } from './db.mjs';
import { createPortalServer } from './app.mjs';
import { hashPassword, passwordProblem } from './auth.mjs';
import { createPushService } from './push.mjs';

const dbPath = process.env.PORTAL_DB_PATH || fileURLToPath(new URL('../data/portal.sqlite', import.meta.url));
const db = openDatabase(dbPath);

const users = db.prepare('SELECT COUNT(*) n FROM users').get().n;
if (!users) {
  const email = process.env.PORTAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PORTAL_ADMIN_PASSWORD;
  if (email && password) {
    const problem = passwordProblem(password);
    if (problem) {
      console.error(`[portal] PORTAL_ADMIN_PASSWORD no cumple la política: ${problem}`);
      process.exit(1);
    }
    db.prepare(`INSERT INTO users (email, name, role, color, password_hash, must_change_password, created_at)
      VALUES (?, ?, 'admin', '#0065df', ?, 1, ?)`).run(email, process.env.PORTAL_ADMIN_NAME?.trim() || 'Administrador', await hashPassword(password), new Date().toISOString());
    console.info(`[portal] Administrador inicial creado: ${email}. Quitá PORTAL_ADMIN_PASSWORD de las variables.`);
  } else {
    console.warn('[portal] La base no tiene usuarios. Definí PORTAL_ADMIN_EMAIL y PORTAL_ADMIN_PASSWORD o ejecutá `npm run user:create`.');
  }
}

// Avisos push: si las claves VAPID del entorno están mal, el portal sigue sin push (y lo dice en el log).
let push = null;
try {
  push = createPushService({ db, env: process.env, logger: console });
} catch (error) {
  console.error(`[portal] Avisos push desactivados: ${error.message}`);
}

const FX_URL = process.env.PORTAL_FX_URL || 'https://api.hacienda.go.cr/indicadores/tc/dolar';
async function fetchExchangeRate() {
  let res;
  try {
    res = await fetch(FX_URL, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new Error(error?.name === 'TimeoutError' ? 'sin respuesta en 10 s' : error?.cause?.code || error?.message || 'error de red');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const server = createPortalServer({ db, staticDir: existsSync(distDir) ? distDir : null, push, fetchExchangeRate });
const port = Number(process.env.PORT) || 3002;
server.listen(port, () => console.info(`[portal] escuchando en el puerto ${port} · base ${dbPath}${push ? ' · push activo' : ''}`));

// Programador de automatizaciones: una pasada por minuto (la primera, poco después de arrancar).
let schedulerTimer = null;
let firstTick = null;
if (process.env.PORTAL_SCHEDULER !== '0') {
  const tick = () => server.ctx.automations.runDue()
    .then((results) => {
      for (const r of results) if (r.error) console.error(`[portal] automatización ${r.key}: ${r.summary}`);
    })
    .catch((error) => console.error(`[portal] programador: ${error?.stack ?? error}`));
  schedulerTimer = setInterval(tick, 60_000);
  firstTick = setTimeout(tick, 5_000);
}

const shutdown = () => {
  clearInterval(schedulerTimer);
  clearTimeout(firstTick);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
