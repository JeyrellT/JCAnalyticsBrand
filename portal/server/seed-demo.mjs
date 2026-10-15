// ============================================================================
//  server/seed-demo.mjs — crea una base de DEMOSTRACIÓN para desarrollo local y
//  pruebas de interfaz (5 personas, clientes, proyectos, tareas, citas e
//  inversiones) usando la API real por HTTP. Los datos viven en demo-data.mjs.
//
//    npm run seed:demo                 → data/demo.sqlite
//    PORTAL_DB_PATH=/ruta.sqlite npm run seed:demo
//
//  Nunca se ejecuta con NODE_ENV=production ni sobre una base con usuarios.
// ============================================================================

import { fileURLToPath } from 'node:url';
import { rmSync, existsSync } from 'node:fs';
import { openDatabase } from './db.mjs';
import { createPortalServer } from './app.mjs';
import { hashPassword } from './auth.mjs';
import { seedDemoData, DEMO_PASSWORD, DEMO_DOMAIN } from './demo-data.mjs';

export { DEMO_PASSWORD };

export async function seedDemo(dbPath) {
  if (process.env.NODE_ENV === 'production') throw new Error('seed-demo no corre en producción');
  if (dbPath !== ':memory:' && existsSync(dbPath)) {
    const probe = openDatabase(dbPath);
    const users = probe.prepare('SELECT COUNT(*) n FROM users').get().n;
    probe.close();
    if (users && !process.argv.includes('--reset')) throw new Error(`${dbPath} ya tiene usuarios. Usá --reset para recrear la base demo.`);
    for (const suffix of ['', '-wal', '-shm']) rmSync(dbPath + suffix, { force: true });
  }
  const db = openDatabase(dbPath);
  const server = createPortalServer({ db, env: {}, logger: { error: console.error, info() {} } });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function login(who) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-portal-request': '1' },
      body: JSON.stringify({ email: `${who}@${DEMO_DOMAIN}`, password: DEMO_PASSWORD }),
    });
    if (!res.ok) throw new Error(`login ${who} → ${res.status}`);
    const cookie = res.headers.get('set-cookie').split(';')[0];
    return async (method, path, body) => {
      const r = await fetch(base + path, { method, headers: { cookie, 'content-type': 'application/json', 'x-portal-request': '1' }, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json();
      if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data)}`);
      return data;
    };
  }

  async function loginClient(email) {
    const res = await fetch(`${base}/api/client/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-portal-request': '1' },
      body: JSON.stringify({ email, password: DEMO_PASSWORD }),
    });
    if (!res.ok) throw new Error(`login cliente ${email} → ${res.status}`);
    const cookie = res.headers.get('set-cookie').split(';')[0];
    return async (method, path, body) => {
      const r = await fetch(base + path, { method, headers: { cookie, 'content-type': 'application/json', 'x-portal-request': '1' }, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json();
      if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data)}`);
      return data;
    };
  }

  try {
    const out = await seedDemoData({ db, passwordHash: await hashPassword(DEMO_PASSWORD), login, loginClient });
    return { ...out, password: DEMO_PASSWORD };
  } finally {
    await new Promise((r) => server.close(r));
    db.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dbPath = process.env.PORTAL_DB_PATH || fileURLToPath(new URL('../data/demo.sqlite', import.meta.url));
  try {
    const out = await seedDemo(dbPath);
    console.info(`Base demo lista en ${dbPath}\nContraseña de todas las cuentas: ${out.password}`);
    for (const u of out.users) console.info(`  ${u.role.padEnd(12)} ${u.email}  (${u.name})`);
    for (const c of out.clients) console.info(`  ${'cliente'.padEnd(12)} ${c.email}  (${c.name}) → portal de clientes`);
    console.info('Iniciá con: PORTAL_DB_PATH=' + dbPath + ' npm start');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
