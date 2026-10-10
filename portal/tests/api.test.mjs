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

test('inversiones: aporte, mensaje de vuelta y doble control', async () => {
  const ana = await as('ana@jc.test');
  const beto = await as('beto@jc.test');
  const admin = await as('jeyrell@jc.test');
  const inv = (await ana.post('/api/investments', { name: 'Pauta Meta Ads BarberXCR', category: 'marketing', currency: 'CRC', target_amount: 30_000_000 })).data.investment;
  assert.ok(inv.id);

  // Ana registra su propio aporte: ella no puede confirmarlo, Beto sí.
  const mov = await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 15_000_000, date: '2026-10-01', message: 'Transferí por SINPE para la pauta de octubre.', reference: 'SINPE 4471' });
  assert.equal(mov.status, 200, JSON.stringify(mov.data));
  const m1 = mov.data.movement;
  assert.equal(m1.status, 'pendiente');
  assert.equal((await ana.post(`/api/movements/${m1.id}/confirm`, {})).status, 403);
  const betoInbox = (await beto.get('/api/notifications')).data.notifications;
  assert.ok(betoInbox.some((n) => n.link.includes(`mov=${m1.id}`)), 'Beto recibe el aviso para confirmar');
  assert.ok((await beto.get('/api/me')).data.pending_confirmations >= 1);

  const conf = await beto.post(`/api/movements/${m1.id}/confirm`, { message: 'Recibido en la cuenta del proyecto, gracias.' });
  assert.equal(conf.data.movement.status, 'confirmado');
  const adminInbox = (await admin.get('/api/notifications')).data.notifications.filter((n) => n.link.endsWith(`mov=${m1.id}`) && n.title.startsWith('Confirmá'));
  assert.ok(adminInbox.length && adminInbox.every((n) => n.read_at), 'el pedido de confirmación deja de estar pendiente para los demás socios');
  assert.equal((await beto.post(`/api/movements/${m1.id}/confirm`, {})).status, 409, 'no se confirma dos veces');
  const anaInbox = (await ana.get('/api/notifications')).data.notifications;
  assert.ok(anaInbox.some((n) => n.title.includes('confirmó') && n.body.includes('Recibido en la cuenta')), 'Ana recibe el mensaje de vuelta');

  // El admin registra un aporte a nombre de Beto: solo Beto puede confirmarlo.
  const m2 = (await admin.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.beto, amount: 10_000_000, date: '2026-10-02', message: 'Aporte de Beto recibido en efectivo.' })).data.movement;
  assert.equal((await ana.post(`/api/movements/${m2.id}/confirm`, {})).status, 403);
  assert.equal((await beto.post(`/api/movements/${m2.id}/confirm`, {})).data.movement.status, 'confirmado');

  // Validaciones: fecha futura, monto inválido, mensaje obligatorio, socio sin rol.
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 100, date: '2030-01-01', message: 'Futuro' })).status, 400);
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 1.5, message: 'Decimal' })).status, 400);
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.ana, amount: 100 })).status, 400);
  assert.equal((await ana.post(`/api/investments/${inv.id}/movements`, { type: 'aporte', partner_id: ids.cata, amount: 100, message: 'Colaboradora' })).status, 400);

  // Retorno repartido según el capital: 60 % Ana / 40 % Beto, la suma es exacta.
  const dist = await admin.post(`/api/investments/${inv.id}/distribute`, { amount: 3_333_333, date: '2026-10-09', message: 'Primer retorno: 14 barberías suscritas.' });
  assert.equal(dist.status, 200, JSON.stringify(dist.data));
  const shares = dist.data.movements;
  assert.equal(shares.length, 2);
  assert.equal(shares.reduce((a, m) => a + m.amount, 0), 3_333_333);
  const anaShare = shares.find((m) => m.partner_id === ids.ana);
  assert.equal(anaShare.amount, 2_000_000);
  assert.match(anaShare.message, /Tu parte: 60,0 %/);

  // Ana objeta su parte; el admin la anula; Beto confirma la suya.
  assert.equal((await ana.post(`/api/movements/${anaShare.id}/object`, {})).status, 400, 'objetar exige motivo');
  assert.equal((await ana.post(`/api/movements/${anaShare.id}/object`, { message: 'Me llegó ₡19.500, no ₡20.000.' })).data.movement.status, 'objetado');
  assert.equal((await admin.post(`/api/movements/${anaShare.id}/annul`, { message: 'Se corrige con el monto real.' })).data.movement.status, 'anulado');
  const betoShare = shares.find((m) => m.partner_id === ids.beto);
  assert.equal((await beto.post(`/api/movements/${betoShare.id}/confirm`, {})).data.movement.status, 'confirmado');

  const detail = (await ana.get(`/api/investments/${inv.id}`)).data;
  assert.equal(detail.metrics.contributed, 25_000_000);
  assert.equal(detail.metrics.returned, betoShare.amount);
  assert.equal(detail.metrics.partners.find((p) => p.partner_id === ids.ana).share, 0.6);
  const thread = detail.movements.find((m) => m.id === m1.id).messages;
  assert.deepEqual(thread.map((x) => x.kind), ['registro', 'confirmacion']);
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
  await beto.post(`/api/movements/${m.id}/confirm`, { message: 'Ok' });
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
