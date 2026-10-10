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
// ============================================================================

import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { openDatabase } from './db.mjs';
import { createPortalServer } from './app.mjs';
import { hashPassword, passwordProblem } from './auth.mjs';

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

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const server = createPortalServer({ db, staticDir: existsSync(distDir) ? distDir : null });
const port = Number(process.env.PORT) || 3002;
server.listen(port, () => console.info(`[portal] escuchando en el puerto ${port} · base ${dbPath}`));

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
