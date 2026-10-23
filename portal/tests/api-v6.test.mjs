// v6: configuración inicial del dueño y portal de inversionistas (docs/v6-contrato.md).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from './helpers.mjs';
import { MIGRATIONS, migrate } from '../server/schema.mjs';

const CODE = 'ABCD-EFGH-JKMN-PQRS';
const OWNER = { name: 'Jeyrell Tardencilla', email: 'gerencia@jc.test', password: 'DuenoSeguro2026' };
const servers = [];
after(() => Promise.all(servers.map((s) => s.close())));
async function boot(opts) {
  const env = await startServer(opts);
  servers.push(env);
  return env;
}

test('configuración inicial: el dueño crea su cuenta una sola vez con el código', async () => {
  const env = await boot({ setupCode: CODE });
  const anon = env.client();
  assert.deepEqual((await anon.get('/api/setup')).data, { needed: true, available: true });
  assert.equal((await anon.post('/api/setup', { ...OWNER, code: 'XXXX-XXXX-XXXX-XXXX' })).data.field, 'code');
  assert.equal((await anon.post('/api/setup', { ...OWNER, code: CODE, password: 'password2026' })).data.field, 'password', 'contraseña de diccionario');
  assert.equal((await anon.post('/api/setup', { ...OWNER, code: CODE, email: 'no-es-correo' })).data.field, 'email');

  // El código se acepta sin guiones ni mayúsculas; el dueño queda adentro como admin, sin clave temporal.
  const ok = await anon.post('/api/setup', { ...OWNER, code: CODE.toLowerCase().replaceAll('-', '') });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.user.role, 'admin');
  assert.equal(ok.data.user.must_change_password, false);
  assert.equal((await anon.get('/api/me')).data.user.email, OWNER.email);

  // Desde ese momento, cerrado para siempre (aunque se conozca el código).
  assert.deepEqual((await anon.get('/api/setup')).data, { needed: false, available: true });
  const again = await env.client().post('/api/setup', { ...OWNER, email: 'otro@jc.test', code: CODE });
  assert.equal(again.status, 409);
  assert.equal(again.data.error, 'setup_done');
  assert.equal(env.db.prepare('SELECT COUNT(*) n FROM users').get().n, 1);
  assert.equal(env.db.prepare("SELECT COUNT(*) n FROM activity WHERE action = 'setup'").get().n, 1);
});

test('configuración inicial: dos pestañas a la vez no crean dos dueños; sin código no hay configuración', async () => {
  const env = await boot({ setupCode: CODE });
  const [a, b] = await Promise.all([
    env.client().post('/api/setup', { ...OWNER, code: CODE }),
    env.client().post('/api/setup', { ...OWNER, email: 'segundo@jc.test', code: CODE }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(env.db.prepare('SELECT COUNT(*) n FROM users').get().n, 1);

  const closed = await boot({ setupCode: null });
  assert.deepEqual((await closed.client().get('/api/setup')).data, { needed: true, available: false });
  assert.equal((await closed.client().post('/api/setup', { ...OWNER, code: CODE })).status, 503);
});

test('configuración inicial: freno por IP ante códigos adivinados', async () => {
  const env = await boot({ setupCode: CODE });
  const c = env.client();
  let last;
  for (let i = 0; i < 6; i += 1) last = await c.post('/api/setup', { ...OWNER, code: `MAL${i}-CODE-XXXX` });
  assert.equal(last.status, 429);
});

test('migración 6: reconstruir users conserva datos, sesiones y claves foráneas', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const [i, sql] of MIGRATIONS.slice(0, 5).entries()) { db.exec(sql); db.exec(`PRAGMA user_version = ${i + 1}`); }
  const at = '2026-10-01T00:00:00.000Z';
  db.prepare("INSERT INTO users (email, name, role, password_hash, created_at) VALUES ('a@jc.test', 'Ana', 'socio', 'h', ?)").run(at);
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ('t', 1, ?, ?)").run(at, at);
  db.prepare("INSERT INTO notifications (user_id, kind, title, created_at) VALUES (1, 'task', 'Hola', ?)").run(at);
  migrate(db);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, MIGRATIONS.length);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 1, 'las sesiones no se borran en cascada');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM notifications').get().n, 1);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1, 'las claves foráneas vuelven a quedar activas');
  assert.throws(() => db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ('x', 99, ?, ?)").run(at, at), /FOREIGN KEY/);
  db.prepare("INSERT INTO users (email, name, role, password_hash, created_at) VALUES ('i@jc.test', 'Inv', 'inversionista', 'h', ?)").run(at);
  assert.throws(() => db.prepare("INSERT INTO users (email, name, role, password_hash, created_at) VALUES ('x@jc.test', 'X', 'jefe', 'h', ?)").run(at), /CHECK/);
});

test('inversionista: acceso solo a su portal; la administración aprueba SU dinero', async () => {
  const env = await boot();
  const ids = { admin: env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin'), ana: env.addUser('ana@jc.test', 'Ana', 'socio'), beto: env.addUser('beto@jc.test', 'Beto', 'socio') };
  const as = async (mail) => { const c = env.client(); assert.equal((await c.login(mail)).status, 200); return c; };
  const admin = await as('jeyrell@jc.test');
  const ana = await as('ana@jc.test');
  const beto = await as('beto@jc.test');

  // El dueño da de alta a la inversionista: clave temporal, cambio obligatorio.
  const created = await admin.post('/api/users', { name: 'Inversionista Ángel', email: 'angel@inv.test', role: 'inversionista' });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const invId = created.data.user.id;
  const inv = env.client();
  assert.equal((await inv.login('angel@inv.test', created.data.temporary_password)).status, 200);
  assert.equal((await inv.get('/api/investor/overview')).data.error, 'password_change_required');
  assert.equal((await inv.post('/api/me/password', { current_password: created.data.temporary_password, new_password: 'AngelInvierte2026' })).status, 200);

  // Ninguna ruta de la operación ni de las inversiones del equipo; y su portal no es para el equipo.
  for (const path of ['/api/projects', '/api/clients', '/api/briefs', '/api/dashboard', '/api/investments', '/api/movements/pending', '/api/notifications', '/api/users', '/api/activity']) {
    assert.equal((await inv.get(path)).status, 403, path);
  }
  assert.equal((await inv.get('/api/me')).status, 200);
  assert.equal((await ana.get('/api/investor/overview')).status, 403);
  // No es parte de la operación: no se le asignan tareas ni aparece en la carga de trabajo.
  assert.equal((await ana.post('/api/tasks', { title: 'Revisar', assignee_id: invId })).data.field, 'assignee_id');
  assert.ok(!(await ana.get('/api/people')).data.people.some((p) => p.id === invId));
  assert.ok((await admin.get('/api/users')).data.users.some((u) => u.id === invId && u.role === 'inversionista'));

  // Socios abren la inversión: la inversionista NO recibe el aviso general.
  const investment = (await ana.post('/api/investments', { name: 'BarberXCR · crecimiento', category: 'producto_propio', currency: 'CRC' })).data.investment;
  const other = (await ana.post('/api/investments', { name: 'Pauta interna', category: 'marketing', currency: 'CRC' })).data.investment;
  assert.equal((await admin.call('PUT', `/api/investments/${investment.id}/access`, { allowed_investor_ids: [invId] })).status, 200);
  assert.ok(!(await inv.get('/api/investor/notifications')).data.notifications.some((n) => n.kind === 'investment'));

  // Ana registra el aporte de la inversionista: no lo aprueba ni otro socio ni ella; lo aprueba el admin.
  const mov = (await ana.post(`/api/investments/${investment.id}/movements`, { type: 'aporte', partner_id: invId, amount: 1_000_000_00, message: 'Aporte inicial de Ángel por SINPE' })).data.movement;
  assert.equal((await beto.post(`/api/movements/${mov.id}/confirm`, {})).data.error, 'not_your_confirmation');
  let overview = (await inv.get('/api/investor/overview')).data;
  assert.equal(overview.to_confirm, undefined, 'la inversionista ya no tiene nada que confirmar');
  const pendingMine = overview.recent.find((m) => m.id === mov.id);
  assert.equal(pendingMine.awaiting, 'JC Analytics');
  assert.equal(pendingMine.can_resolve, undefined);
  assert.equal((await inv.post(`/api/investor/movements/${mov.id}/confirm`, {})).status, 404, 'la ruta de confirmar ya no existe');
  assert.equal((await inv.post(`/api/investor/movements/${mov.id}/object`, { message: 'No coincide' })).status, 404);
  assert.equal((await admin.post(`/api/movements/${mov.id}/confirm`, { message: 'Recibido ✓' })).status, 200);
  assert.ok((await inv.get('/api/investor/notifications')).data.notifications.some((n) => n.kind === 'movement' && n.title.includes('aprobó')));

  // Los socios aportan también; la inversionista no ve sus movimientos ni sus nombres.
  const anaMov = (await ana.post(`/api/investments/${investment.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 3_000_000_00, message: 'Aporte de Ana' })).data.movement;
  await admin.post(`/api/movements/${anaMov.id}/confirm`, {});
  overview = (await inv.get('/api/investor/overview')).data;
  assert.equal(overview.portfolio.contributed_crc, 1_000_000_00);
  const position = overview.investments.find((i) => i.id === investment.id);
  assert.equal(position.totals.contributed, 4_000_000_00);
  assert.equal(position.totals.holders, 2);
  assert.equal(position.mine.share, 0.25);
  assert.ok(overview.recent.every((m) => m.partner_id === invId));
  assert.ok(!JSON.stringify(overview).includes('Aporte de Ana'), 'no se filtran movimientos de otros socios');
  assert.ok(!overview.investments.some((i) => i.id === other.id), 'solo inversiones donde participa');
  assert.equal((await inv.get(`/api/investor/investments/${other.id}`)).status, 404);

  // Reparto pro-rata (lo registra el admin): le toca su 25 % y ya llega aprobado, con aviso.
  const dist = (await admin.post(`/api/investments/${investment.id}/distribute`, { amount: 400_000_00, message: 'Retorno de octubre' })).data;
  const mine = dist.movements.find((m) => m.partner_id === invId);
  assert.equal(mine.amount, 100_000_00);
  assert.equal(mine.status, 'confirmado');
  assert.ok((await inv.get('/api/investor/notifications')).data.notifications.some((n) => n.link.endsWith(`mov=${mine.id}`) && n.title.startsWith('Retorno registrado')));
  assert.equal((await inv.get('/api/investor/overview')).data.portfolio.returned_crc, 100_000_00);

  // Aviso de aporte propio: queda por aprobar; solo el admin lo ve en su bandeja.
  const own = await inv.post(`/api/investor/investments/${investment.id}/movements`, { amount: 500_000_00, message: 'Envié el segundo aporte', reference: 'SINPE 4455' });
  assert.equal(own.status, 200, JSON.stringify(own.data));
  assert.equal(own.data.movement.status, 'pendiente');
  assert.ok((await admin.get('/api/movements/pending')).data.to_confirm.some((m) => m.id === own.data.movement.id));
  assert.equal((await beto.get('/api/movements/pending')).data.to_confirm.length, 0, 'los socios no aprueban');
  assert.ok((await admin.get('/api/notifications')).data.notifications.some((n) => n.title.startsWith('Aprobá un aporte de Inversionista Ángel')));
  assert.equal((await inv.post(`/api/investor/investments/${investment.id}/movements`, { type: 'retorno', amount: 1, message: 'xxx' })).data.field, 'type');
  // Lo puede retirar mientras nadie lo confirme.
  assert.equal((await inv.post(`/api/investor/movements/${own.data.movement.id}/annul`, { message: 'Monto equivocado' })).data.movement.status, 'anulado');

  // Conversación sobre su movimiento y estado de cuenta en Excel.
  const msg = await inv.post(`/api/investor/movements/${mov.id}/messages`, { body: '¿Me confirman la fecha del próximo retorno?' });
  assert.ok(msg.data.messages.some((m) => m.mine === 1));
  const csv = await inv.get('/api/investor/statement.csv');
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  // fetch().text() quita el BOM al decodificar; lo importante es el encabezado con separador ;.
  assert.ok(csv.data.replace(/^\uFEFF/, '').startsWith('Fecha;Inversión;Tipo'));
  assert.ok(csv.data.includes('BarberXCR'));
  assert.ok(!csv.data.includes('Aporte de Ana'));

  // En la cartera del equipo, la inversionista aparece con su capital.
  const team = (await ana.get('/api/investments')).data;
  assert.ok(team.partners.some((p) => p.id === invId && p.contributed_crc === 1_000_000_00));
});
