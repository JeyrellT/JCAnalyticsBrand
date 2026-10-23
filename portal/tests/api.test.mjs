import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, PASSWORD } from './helpers.mjs';
import { openDatabase } from '../server/db.mjs';
import { createPortalServer } from '../server/app.mjs';

let env;
let ids;
const HOUR = 3_600_000;

before(async () => {
  env = await startServer();
  ids = {
    admin: env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin'),
    ana: env.addUser('ana@jc.test', 'Ana', 'socio'),
    beto: env.addUser('beto@jc.test', 'Beto', 'socio'),
    cata: env.addUser('cata@jc.test', 'Catalina', 'colaborador'),
  };
});
after(() => env.close());

async function as(email) {
  const c = env.client();
  const r = await c.login(email);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return c;
}

test('login: credenciales, cookie segura y CSRF', async () => {
  const c = env.client();
  assert.equal((await c.get('/api/me')).status, 401);
  assert.equal((await c.login('ana@jc.test', 'incorrecta123')).status, 401);
  assert.equal((await c.login('nadie@jc.test')).status, 401);
  const ok = await c.login('ANA@jc.test');
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.password_hash, undefined, 'nunca expone el hash');
  assert.match(ok.headers.get('set-cookie'), /HttpOnly; *|SameSite=Strict/);
  assert.equal((await c.get('/api/me')).data.user.email, 'ana@jc.test');

  // Sin el encabezado propio, cualquier escritura se bloquea.
  const blocked = await c.call('POST', '/api/tasks', { title: 'x' }, { headers: { 'x-portal-request': '0' } });
  assert.equal(blocked.status, 403);
  const foreign = await c.call('POST', '/api/tasks', { title: 'Tarea' }, { headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.status, 403);

  assert.equal((await c.post('/api/auth/logout')).status, 200);
  assert.equal((await c.get('/api/me')).status, 401);
});

test('login: bloquea fuerza bruta por correo', async () => {
  const c = env.client();
  for (let i = 0; i < 5; i += 1) assert.equal((await c.login('beto@jc.test', `mala${i}clave99`)).status, 401);
  assert.equal((await c.login('beto@jc.test')).status, 429, 'ni la clave correcta pasa durante el bloqueo');
  env.clock.t += 16 * 60_000;
  assert.equal((await c.login('beto@jc.test')).status, 200);
});

test('contraseña temporal obliga a cambiarla antes de usar el portal', async () => {
  const admin = await as('jeyrell@jc.test');
  const created = await admin.post('/api/users', { name: 'Hillary Porras', email: 'hillary@jc.test', role: 'colaborador' });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const temp = created.data.temporary_password;
  assert.match(temp, /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);

  const h = env.client();
  assert.equal((await h.login('hillary@jc.test', temp)).status, 200);
  assert.equal((await h.get('/api/dashboard')).data.error, 'password_change_required');
  const weak = await h.post('/api/me/password', { current_password: temp, new_password: 'corta' });
  assert.equal(weak.status, 400);
  assert.equal((await h.post('/api/me/password', { current_password: temp, new_password: 'NuevaClave2026' })).status, 200);
  assert.equal((await h.get('/api/dashboard')).status, 200);

  // Solo administradores gestionan personas.
  const ana = await as('ana@jc.test');
  assert.equal((await ana.post('/api/users', { name: 'X', email: 'x@jc.test', role: 'socio' })).status, 403);
  // Candado: no se puede quitar el último administrador.
  const self = await admin.patch(`/api/users/${ids.admin}`, { role: 'socio' });
  assert.equal(self.status, 400);
  assert.equal(self.data.field, 'role');
});

test('colaborador no ve inversiones ni movimientos en la bitácora', async () => {
  const cata = await as('cata@jc.test');
  assert.equal((await cata.get('/api/investments')).status, 403);
  assert.equal((await cata.post('/api/investments', { name: 'X', category: 'otro' })).status, 403);
  const dash = await cata.get('/api/dashboard');
  assert.equal(dash.data.investments, null);
  const activity = await cata.get('/api/activity');
  assert.ok(activity.data.activity.every((a) => !a.sensitive));
});

test('proyecto de cliente: semáforo del avance cada 72 h', async () => {
  const ana = await as('ana@jc.test');
  const created = await ana.post('/api/projects', { name: 'Sitio La Burrada', client: 'La Burrada', kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: ids.ana, value_amount: 46_350_000 });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const p = created.data.project;
  assert.equal(p.sla_state, 'ok');

  env.clock.t += 80 * HOUR;
  assert.equal((await ana.get('/api/me')).status, 401, 'la sesión expira tras 12 h sin uso');
  await ana.login('ana@jc.test');
  const late = (await ana.get(`/api/projects/${p.id}`)).data.project;
  assert.equal(late.sla_state, 'late');
  const dash = await ana.get('/api/dashboard');
  assert.ok(dash.data.alerts.some((a) => a.kind === 'sla' && a.tone === 'red'));

  const upd = await ana.post(`/api/projects/${p.id}/updates`, { channel: 'whatsapp', note: 'Enviamos el menú en staging para revisión.' });
  assert.equal(upd.data.project.sla_state, 'ok');

  const delivered = await ana.patch(`/api/projects/${p.id}`, { status: 'entregado' });
  assert.equal(delivered.data.project.sla_state, null);
  assert.ok(delivered.data.project.support_ends, 'arranca el soporte de 30 días');

  const bad = await ana.patch(`/api/projects/${p.id}`, { start_date: '2026-10-20', due_date: '2026-10-01' });
  assert.equal(bad.status, 400);
});

test('tablero: crear, mover, vencidas y comentarios notifican', async () => {
  const ana = await as('ana@jc.test');
  const cata = await as('cata@jc.test');
  const t = (await ana.post('/api/tasks', { title: 'Configurar dominio', assignee_id: ids.cata, due_date: '2026-10-01', priority: 'alta' })).data.task;
  assert.equal(t.status, 'por_hacer');
  const dash = await cata.get('/api/dashboard');
  assert.ok(dash.data.kpis.overdue_tasks >= 1);
  assert.ok(dash.data.my_tasks.some((x) => x.id === t.id));

  const moved = await cata.patch(`/api/tasks/${t.id}`, { status: 'hecho', position: 10 });
  assert.equal(moved.data.task.status, 'hecho');
  assert.ok(moved.data.task.completed_at);
  const notes = (await ana.get('/api/notifications')).data.notifications;
  assert.ok(notes.some((n) => n.title.includes('Tarea terminada')));

  assert.equal((await cata.post(`/api/tasks/${t.id}/comments`, { body: 'Listo, propagado.' })).status, 200);
  assert.equal((await ana.get(`/api/tasks/${t.id}/comments`)).data.comments.length, 1);
  assert.equal((await ana.patch(`/api/tasks/${t.id}`, { status: 'inventado' })).status, 400);
  assert.equal((await ana.del(`/api/tasks/${t.id}`)).status, 200);
  assert.equal((await ana.get(`/api/tasks/${t.id}/comments`)).status, 404);
});

test('agenda: valida horario y detecta choques por persona', async () => {
  const ana = await as('ana@jc.test');
  const base = { kind: 'alcance', attendees: [ids.ana, ids.beto] };
  const a1 = await ana.post('/api/appointments', { ...base, title: 'Alcance Uniquex', starts_at: '2026-10-20T15:00:00Z', ends_at: '2026-10-20T16:00:00Z' });
  assert.equal(a1.status, 200, JSON.stringify(a1.data));
  assert.deepEqual(a1.data.conflicts, []);
  assert.equal(a1.data.appointment.attendees.length, 2);

  const a2 = await ana.post('/api/appointments', { ...base, title: 'Demo Taller Ticos', starts_at: '2026-10-20T15:30:00Z', ends_at: '2026-10-20T16:30:00Z' });
  assert.equal(a2.data.conflicts.length, 2, 'choca para Ana y para Beto');

  const backwards = await ana.post('/api/appointments', { ...base, title: 'Mal', starts_at: '2026-10-20T16:00:00Z', ends_at: '2026-10-20T15:00:00Z' });
  assert.equal(backwards.status, 400);

  const cancelled = await ana.patch(`/api/appointments/${a1.data.appointment.id}`, { status: 'cancelada' });
  assert.equal(cancelled.data.appointment.status, 'cancelada');
  const check = await ana.post('/api/appointments/check', { starts_at: '2026-10-20T15:00:00Z', ends_at: '2026-10-20T15:20:00Z', attendees: [ids.ana] });
  assert.deepEqual(check.data.conflicts, [], 'una cita cancelada no bloquea');
  const range = await ana.get('/api/appointments?from=2026-10-19T00:00:00Z&to=2026-10-22T00:00:00Z');
  assert.equal(range.data.appointments.length, 2);
});

test('inversiones: aporte y aprobación de la administración', async () => {
  const ana = await as('ana@jc.test');
  const beto = await as('beto@jc.test');
  const admin = await as('jeyrell@jc.test');
  const inv = (await ana.post('/api/investments', { name: 'Pauta Meta Ads BarberXCR', category: 'marketing', currency: 'CRC', target_amount: 30_000_000 })).data.investment;
  assert.ok(inv.id);

  // Ana (socia) registra su propio aporte: queda por aprobar y solo el admin lo aprueba.
  const mov = await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 15_000_000, date: '2026-10-01', message: 'Transferí por SINPE para la pauta de octubre.', reference: 'SINPE 4471' });
  assert.equal(mov.status, 200, JSON.stringify(mov.data));
  const m1 = mov.data.movement;
  assert.equal(m1.status, 'pendiente');
  assert.equal((await ana.post(`/api/movements/${m1.id}/confirm`, {})).status, 403);
  assert.equal((await beto.post(`/api/movements/${m1.id}/confirm`, {})).status, 403, 'otro socio ya no aprueba');
  const betoInbox = (await beto.get('/api/notifications')).data.notifications;
  assert.ok(!betoInbox.some((n) => n.link.includes(`mov=${m1.id}`)), 'a Beto no se le pide nada');
  assert.equal((await beto.get('/api/me')).data.pending_confirmations, 0);
  assert.ok((await admin.get('/api/me')).data.pending_confirmations >= 1);
  const detailBefore = (await ana.get(`/api/investments/${inv.id}`)).data.movements.find((m) => m.id === m1.id);
  assert.equal(detailBefore.awaiting, 'Jeyrell', 'espera al único admin, por su nombre');
  assert.equal(detailBefore.can_resolve, false);

  const conf = await admin.post(`/api/movements/${m1.id}/confirm`, { message: 'Recibido en la cuenta del proyecto, gracias.' });
  assert.equal(conf.data.movement.status, 'confirmado');
  const adminInbox = (await admin.get('/api/notifications')).data.notifications.filter((n) => n.link.endsWith(`mov=${m1.id}`) && n.title.startsWith('Aprobá'));
  assert.ok(adminInbox.length && adminInbox.every((n) => n.read_at), 'el pedido de aprobación deja de estar pendiente');
  assert.equal((await admin.post(`/api/movements/${m1.id}/confirm`, {})).status, 409, 'no se aprueba dos veces');
  const anaInbox = (await ana.get('/api/notifications')).data.notifications;
  assert.ok(anaInbox.some((n) => n.title.includes('aprobó') && n.body.includes('Recibido en la cuenta')), 'Ana recibe el mensaje de vuelta');

  // El admin registra un aporte a nombre de Beto: queda aprobado de una vez y Beto solo recibe el aviso.
  const m2 = (await admin.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.beto, amount: 10_000_000, date: '2026-10-02', message: 'Aporte de Beto recibido en efectivo.' })).data.movement;
  assert.equal(m2.status, 'confirmado');
  assert.equal(m2.resolved_by, ids.admin);
  assert.equal((await beto.post(`/api/movements/${m2.id}/confirm`, {})).status, 409);
  assert.ok((await beto.get('/api/notifications')).data.notifications.some((n) => n.link.endsWith(`mov=${m2.id}`) && n.title.startsWith('Aporte registrado')));

  // Validaciones: fecha futura, monto inválido, mensaje obligatorio, socio sin rol.
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 100, date: '2030-01-01', message: 'Futuro' })).status, 400);
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 1.5, message: 'Decimal' })).status, 400);
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 100 })).status, 400);
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.cata, amount: 100, message: 'Colaboradora' })).status, 400);

  // Retorno repartido (lo registra Ana, queda por aprobar) según el capital: 60 % Ana / 40 % Beto, la suma es exacta.
  const dist = await ana.post(`/api/investments/${inv.id}/distribute`, { amount: 3_333_333, date: '2026-10-09', message: 'Primer retorno: 14 barberías suscritas.' });
  assert.equal(dist.status, 200, JSON.stringify(dist.data));
  const shares = dist.data.movements;
  assert.equal(shares.length, 2);
  assert.equal(shares.reduce((a, m) => a + m.amount, 0), 3_333_333);
  const anaShare = shares.find((m) => m.partner_id === ids.ana);
  assert.equal(anaShare.amount, 2_000_000);
  assert.match(anaShare.message, /Tu parte: 60,0 %/);

  // El admin rechaza la parte de Ana (con motivo) y la anula; aprueba la de Beto.
  assert.ok(shares.every((m) => m.status === 'pendiente'));
  assert.equal((await ana.post(`/api/movements/${anaShare.id}/object`, { message: 'No me corresponde rechazar.' })).status, 403);
  assert.equal((await admin.post(`/api/movements/${anaShare.id}/object`, {})).status, 400, 'rechazar exige motivo');
  assert.equal((await admin.post(`/api/movements/${anaShare.id}/object`, { message: 'Salieron ₡19.500, no ₡20.000.' })).data.movement.status, 'objetado');
  assert.ok((await ana.get('/api/notifications')).data.notifications.some((n) => n.title.includes('rechazó')));
  assert.equal((await admin.post(`/api/movements/${anaShare.id}/annul`, { message: 'Se corrige con el monto real.' })).data.movement.status, 'anulado');
  const betoShare = shares.find((m) => m.partner_id === ids.beto);
  assert.equal((await admin.post(`/api/movements/${betoShare.id}/confirm`, {})).data.movement.status, 'confirmado');

  const detail = (await ana.get(`/api/investments/${inv.id}`)).data;
  assert.equal(detail.metrics.contributed, 25_000_000);
  assert.equal(detail.metrics.returned, betoShare.amount);
  assert.equal(detail.metrics.partners.find((p) => p.partner_id === ids.ana).share, 0.6);
  const thread = detail.movements.find((m) => m.id === m1.id).messages;
  assert.deepEqual(thread.map((x) => x.kind), ['registro', 'confirmacion']);
  assert.deepEqual(detail.movements.find((m) => m.id === m2.id).messages.map((x) => x.kind), ['registro', 'confirmacion'], 'la aprobación al registrar queda en el hilo');
  assert.equal(detail.metrics.target_progress, 25_000_000 / 30_000_000);

  // Solo el admin puede anular algo confirmado.
  assert.equal((await ana.post(`/api/movements/${m1.id}/annul`, { message: 'Error' })).status, 403);
});

test('inversiones en dólares guardan el tipo de cambio y exportan a Excel', async () => {
  const admin = await as('jeyrell@jc.test');
  const beto = await as('beto@jc.test');
  const inv = (await admin.post('/api/investments', { name: 'Servidor y dominios', category: 'equipo', currency: 'USD' })).data.investment;
  const m = (await admin.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.admin, amount: 12_050, fx_rate: 508.25, date: '2026-10-05', message: '=HYPERLINK("http://x")' })).data.movement;
  assert.equal(m.fx_rate, 508.25);
  assert.equal(m.status, 'confirmado', 'lo que registra el admin ya cuenta');
  const list = (await beto.get('/api/investments')).data;
  const row = list.investments.find((i) => i.id === inv.id);
  assert.equal(row.metrics.contributed_crc, Math.round(12_050 * 508.25));
  assert.ok(list.portfolio.contributed_crc >= row.metrics.contributed_crc);

  const csv = await beto.get(`/api/investments/export.csv?investment_id=${inv.id}`);
  assert.equal(csv.status, 200);
  assert.ok(csv.data.startsWith('Fecha;Inversión;Tipo'), 'fetch().text() descarta el BOM');
  const raw = Buffer.from(await (await fetch(`${env.base}/api/investments/export.csv`, { headers: { cookie: beto.cookie } })).arrayBuffer());
  assert.deepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'BOM para que Excel lea tildes y ₡');
  assert.match(csv.data, /;120,50;USD;508,25;/);
  assert.match(csv.data, /'=HYPERLINK/, 'neutraliza fórmulas');
});

test('estáticos: SPA con fallback y sin path traversal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'portal-static-'));
  await writeFile(join(dir, 'index.html'), '<!doctype html><title>Portal</title>');
  const db = openDatabase(':memory:');
  const server = createPortalServer({ db, env: {}, staticDir: dir, logger: { error() {}, info() {} } });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(`${base}/proyectos/4`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Portal/);
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal((await fetch(`${base}/..%2f..%2fetc%2fpasswd`)).status, 403);
    assert.equal((await fetch(`${base}/missing.js`)).status, 404);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/nada`)).status, 404);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});

test('respaldo solo para administradores', async () => {
  const ana = await as('ana@jc.test');
  assert.equal((await ana.get('/api/admin/backup')).status, 403);
  const admin = await as('jeyrell@jc.test');
  const res = await fetch(`${env.base}/api/admin/backup`, { headers: { cookie: admin.cookie } });
  assert.equal(res.status, 200);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3');
  assert.ok(PASSWORD);
});

// ── Regresiones de la revisión de código ───────────────────────────────────
test('cerrar sesión y restablecer contraseña funcionan sin cuerpo JSON', async () => {
  const ana = await as('ana@jc.test');
  const out = await ana.call('POST', '/api/auth/logout');
  assert.equal(out.status, 200);
  assert.equal((await ana.get('/api/me')).status, 401, 'la cookie quedó revocada en el servidor');
  const admin = await as('jeyrell@jc.test');
  const extra = env.addUser('reset@jc.test', 'Reset', 'colaborador');
  const reset = await admin.call('POST', `/api/users/${extra}/reset-password`);
  assert.equal(reset.status, 200, JSON.stringify(reset.data));
  assert.ok(reset.data.temporary_password);
});

test('el límite de intentos no se esquiva con peticiones en paralelo', async () => {
  env.addUser('paralelo@jc.test', 'Paralelo', 'socio');
  const c = env.client();
  const results = await Promise.all(Array.from({ length: 15 }, (_, i) => c.login('paralelo@jc.test', `incorrecta${i}x`)));
  const evaluated = results.filter((r) => r.status === 401).length;
  assert.ok(evaluated <= 5, `se evaluaron ${evaluated} contraseñas`);
  assert.ok(results.some((r) => r.status === 429));
  env.clock.t += 16 * 60_000;
});

test('un socio degradado a colaborador deja de recibir y ver avisos de dinero', async () => {
  const admin = await as('jeyrell@jc.test');
  const dora = env.addUser('dora@jc.test', 'Dora', 'socio');
  const inv = (await admin.post('/api/investments', { name: 'Fondo Dora', category: 'otro' })).data.investment;
  const doraClient = await as('dora@jc.test');
  assert.ok((await doraClient.get('/api/notifications')).data.notifications.some((n) => n.kind === 'investment'));
  await admin.patch(`/api/users/${dora}`, { role: 'colaborador' });
  const m = (await admin.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.admin, amount: 1000, message: 'Detalle confidencial' })).data.movement;
  await admin.post(`/api/movements/${m.id}/messages`, { body: 'Otro dato confidencial' });
  const list = (await doraClient.get('/api/notifications')).data.notifications;
  assert.ok(list.every((n) => !['movement', 'investment', 'message'].includes(n.kind)), JSON.stringify(list.map((n) => n.title)));
});

test('repartir retorno funciona aunque un socio con capital esté inactivo', async () => {
  const admin = await as('jeyrell@jc.test');
  const eli = env.addUser('eli@jc.test', 'Eli', 'socio');
  const beto = await as('beto@jc.test');
  const eliClient = await as('eli@jc.test');
  const inv = (await admin.post('/api/investments', { name: 'Fondo Eli', category: 'otro' })).data.investment;
  await admin.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.admin, amount: 30_000, message: 'Aporte admin' });
  const m2 = (await eliClient.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: eli, amount: 10_000, message: 'Aporte Eli' })).data.movement;
  await admin.post(`/api/movements/${m2.id}/confirm`, {});
  await admin.patch(`/api/users/${eli}`, { active: false });
  // Lo reparte un socio: la parte de Eli igual se registra y la aprueba el admin.
  const dist = await beto.post(`/api/investments/${inv.id}/distribute`, { amount: 4_000, message: 'Retorno con socio inactivo' });
  assert.equal(dist.status, 200, JSON.stringify(dist.data));
  const eliShare = dist.data.movements.find((x) => x.partner_id === eli);
  assert.equal(eliShare.amount, 1_000);
  assert.equal((await beto.post(`/api/movements/${eliShare.id}/confirm`, {})).status, 403, 'un socio no aprueba');
  const conf = await admin.post(`/api/movements/${eliShare.id}/confirm`, { message: 'Aprobado: la parte de Eli queda registrada' });
  assert.equal(conf.data.movement.status, 'confirmado', 'el admin aprueba la parte del socio inactivo');
});

test('editar con una persona ya asignada y luego desactivada no falla', async () => {
  const admin = await as('jeyrell@jc.test');
  const fer = env.addUser('fer@jc.test', 'Fer', 'colaborador');
  const p = (await admin.post('/api/projects', { name: 'Proyecto Fer', kind: 'interno', status: 'en_curso', owner_id: fer })).data.project;
  const t = (await admin.post('/api/tasks', { title: 'Tarea Fer', assignee_id: fer })).data.task;
  const a = (await admin.post('/api/appointments', { title: 'Cita Fer', kind: 'interna', starts_at: '2026-12-01T15:00:00Z', ends_at: '2026-12-01T16:00:00Z', attendees: [fer, ids.admin] })).data.appointment;
  await admin.patch(`/api/users/${fer}`, { active: false });
  assert.equal((await admin.patch(`/api/projects/${p.id}`, { name: 'Proyecto Fer v2', owner_id: fer })).status, 200);
  assert.equal((await admin.patch(`/api/tasks/${t.id}`, { title: 'Tarea Fer v2', assignee_id: fer })).status, 200);
  assert.equal((await admin.patch(`/api/appointments/${a.id}`, { title: 'Cita Fer v2', attendees: [fer, ids.admin] })).status, 200);
  assert.equal((await admin.patch(`/api/tasks/${t.id}`, { assignee_id: ids.cata })).status, 200);
  assert.equal((await admin.patch(`/api/tasks/${t.id}`, { assignee_id: fer })).status, 400, 'reasignar a alguien inactivo sí se rechaza');
});

test('el reloj de 72 h arranca al pasar a "en curso" y el límite de la bitácora se sanea', async () => {
  const admin = await as('jeyrell@jc.test');
  const p = (await admin.post('/api/projects', { name: 'Prospecto viejo', client: 'Cliente X', kind: 'cliente', status: 'prospecto' })).data.project;
  env.clock.t += 10 * 24 * HOUR;
  const admin2 = await as('jeyrell@jc.test');
  const moved = (await admin2.patch(`/api/projects/${p.id}`, { status: 'en_curso' })).data.project;
  assert.equal(moved.sla_state, 'ok');
  assert.equal(moved.hours_since_update, 0);
  assert.equal((await admin2.get('/api/activity?limit=1.5')).status, 200);
  assert.equal((await admin2.get('/api/activity?limit=-1')).data.activity.length, 1);
});
