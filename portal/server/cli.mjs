// ============================================================================
//  server/cli.mjs — administración por consola (útil para el primer usuario
//  o si se pierde el acceso de administrador).
//
//    npm run user:create -- --email ana@jcanalytic.com --name "Ana" --role socio
//    npm run user:reset  -- --email ana@jcanalytic.com
//    npm run user:list
//
//  Imprime una contraseña temporal; la persona la cambia al entrar.
// ============================================================================

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.mjs';
import { hashPassword, temporaryPassword } from './auth.mjs';
import { ROLES, MEMBER_COLORS } from '../shared/catalog.js';

const [command, ...rest] = process.argv.slice(2);
const { values } = parseArgs({ args: rest, options: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' } } });
const db = openDatabase(process.env.PORTAL_DB_PATH || fileURLToPath(new URL('../data/portal.sqlite', import.meta.url)));

const exit = (message) => { console.error(message); process.exit(1); };

if (command === 'list') {
  for (const u of db.prepare('SELECT id, email, name, role, active, last_login_at FROM users ORDER BY id').all()) {
    console.info(`${u.id}\t${u.active ? 'activo' : 'inactivo'}\t${u.role}\t${u.email}\t${u.name}\t${u.last_login_at ?? 'nunca'}`);
  }
} else if (command === 'create') {
  const email = values.email?.trim().toLowerCase();
  const role = values.role ?? 'socio';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) exit('Indicá --email válido.');
  if (!values.name?.trim()) exit('Indicá --name.');
  if (!ROLES[role]) exit(`Rol inválido. Opciones: ${Object.keys(ROLES).join(', ')}`);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) exit('Ya existe ese correo.');
  const temp = temporaryPassword();
  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  db.prepare(`INSERT INTO users (email, name, role, color, password_hash, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`)
    .run(email, values.name.trim(), role, MEMBER_COLORS[count % MEMBER_COLORS.length], await hashPassword(temp), new Date().toISOString());
  console.info(`Usuario creado: ${email} (${ROLES[role].label})\nContraseña temporal: ${temp}`);
} else if (command === 'reset') {
  const email = values.email?.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email ?? '') ?? exit('No existe ese correo.');
  const temp = temporaryPassword();
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1, active = 1 WHERE id = ?').run(await hashPassword(temp), user.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  console.info(`Contraseña restablecida para ${email}\nContraseña temporal: ${temp}`);
} else {
  exit('Comandos: create | reset | list');
}
db.close();
