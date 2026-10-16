// v7: enlaces de registro para todos los tipos de persona (docs/v7-contrato.md).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.mjs';

const servers = [];
after(() => Promise.all(servers.map((s) => s.close())));
async function boot() {
  const env = await startServer();
  servers.push(env);
  env.addUser('admin@jc.test', 'Admin JC', 'admin');
  env.addUser('socio@jc.test', 'Socia JC', 'socio');
  env.addUser('colab@jc.test', 'Colab JC', 'colaborador');
  const admin = env.client();
  await admin.login('admin@jc.test');
  return { ...env, admin };
}
const person = (n, extra = {}) => ({ name: `Persona ${n}`, email: `persona${n}@mail.test`, password: 'MiClaveFuerte88', phone: '8888-0000', ...extra });

test('enlace abierto de socios: cupo máximo, cada quien elige su clave y entra directo', async () => {
  const env = await boot();
  const made = await env.admin.post('/api/invites', { kind: 'team', role: 'socio', max_uses: 2, days: 7, label: 'Socios fundadores', message: 'Bienvenidos' });
  assert.equal(made.status, 200, JSON.stringify(made.data));
  const { token } = made.data.invite;
  assert.equal(made.data.invite.status, 'activo');
  assert.equal(made.data.invite.home, '/');

  // Lo que ve quien abre el enlace: sin token, sin datos de otros.
  const look = await env.client().post('/api/invites/lookup', { token });
  assert.equal(look.data.invite.role_label, 'Socio');
  assert.equal(look.data.invite.message, 'Bienvenidos');
  assert.equal(look.data.invite.token, undefined);
  assert.equal(look.data.invite.max_uses, undefined);

  const a = env.client();
  const ok = await a.post('/api/invites/accept', { token, ...person(1) });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.user.role, 'socio');
  assert.equal(ok.data.user.must_change_password, false);
  assert.equal((await a.get('/api/me')).data.user.email, 'persona1@mail.test', 'queda con la sesión iniciada');

  // Validaciones: correo repetido (equipo) y contraseña débil.
  assert.equal((await env.client().post('/api/invites/accept', { token, ...person(9, { email: 'socio@jc.test' }) })).data.field, 'email');
  assert.equal((await env.client().post('/api/invites/accept', { token, ...person(9, { password: 'password2026' }) })).data.field, 'password');

  assert.equal((await env.client().post('/api/invites/accept', { token, ...person(2) })).status, 200);
  const full = await env.client().post('/api/invites/accept', { token, ...person(3) });
  assert.equal(full.status, 410);
  assert.equal(full.data.status, 'agotado');
  assert.equal(env.db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'socio'").get().n, 3);

  // El admin ve quién se registró y recibe un aviso por cada alta.
  const list = await env.admin.get('/api/invites');
  assert.equal(list.data.invites[0].registrations.length, 2);
  assert.equal(list.data.invites[0].status, 'agotado');
  const inbox = await env.admin.get('/api/notifications');
  assert.equal(inbox.data.notifications.filter((n) => n.kind === 'registro').length, 2);
});

test('el último cupo no se reparte dos veces aunque lleguen a la vez', async () => {
  const env = await boot();
  const { token } = (await env.admin.post('/api/invites', { kind: 'team', role: 'colaborador', max_uses: 1 })).data.invite;
  const [x, y] = await Promise.all([
    env.client().post('/api/invites/accept', { token, ...person(1) }),
    env.client().post('/api/invites/accept', { token, ...person(2) }),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [200, 410]);
  assert.equal(env.db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'colaborador'").get().n, 2);
});

test('enlace personal "solo con el nombre": un uso, nombre precargado; inversionista entra a su portal', async () => {
  const env = await boot();
  const made = await env.admin.post('/api/invites', { kind: 'team', role: 'inversionista', name: 'Ángel Mora', max_uses: 50 });
  assert.equal(made.data.invite.max_uses, 1, 'un enlace personal sirve una sola vez');
  assert.equal(made.data.invite.personal, true);
  const { token } = made.data.invite;
  assert.equal((await env.client().post('/api/invites/lookup', { token })).data.invite.name, 'Ángel Mora');
  const c = env.client();
  const ok = await c.post('/api/invites/accept', { token, ...person(1, { name: 'Ángel Mora Solís' }) });
  assert.equal(ok.data.home, '/inversionista');
  assert.equal((await c.get('/api/investor/overview')).status, 200);
  assert.equal((await c.get('/api/projects')).status, 403, 'el inversionista no ve la operación');
});

test('enlace de cliente: crea un acceso al portal de ESE cliente con sesión de cliente', async () => {
  const env = await boot();
  const clientId = Number(env.db.prepare("INSERT INTO clients (name, status, created_at, updated_at) VALUES ('La Burrada', 'activo', ?, ?)")
    .run(env.ctx.nowIso(), env.ctx.nowIso()).lastInsertRowid);
  const made = await env.admin.post('/api/invites', { kind: 'client', client_id: clientId, max_uses: 3, can_approve: false });
  assert.equal(made.status, 200, JSON.stringify(made.data));
  const look = await env.client().post('/api/invites/lookup', { token: made.data.invite.token });
  assert.equal(look.data.invite.client_name, 'La Burrada');
  const c = env.client();
  const ok = await c.post('/api/invites/accept', { token: made.data.invite.token, ...person(1, { title: 'Gerente de marketing' }) });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.home, '/cliente');
  const acc = env.db.prepare('SELECT * FROM client_accounts WHERE email = ?').get('persona1@mail.test');
  assert.equal(acc.client_id, clientId);
  assert.equal(acc.can_approve, 0);
  assert.equal(acc.must_change_password, 0);
  assert.equal((await c.get('/api/client/me')).status, 200);
  // Filtrado por cliente para la ficha.
  assert.equal((await env.admin.get(`/api/invites?client_id=${clientId}`)).data.invites.length, 1);
});

test('permisos y blindaje: solo el admin crea enlaces de equipo; admin siempre personal y corto', async () => {
  const env = await boot();
  const socio = env.client();
  await socio.login('socio@jc.test');
  const colab = env.client();
  await colab.login('colab@jc.test');
  assert.equal((await socio.post('/api/invites', { kind: 'team', role: 'socio', max_uses: 5 })).status, 403);
  assert.equal((await colab.post('/api/invites', { kind: 'team', role: 'colaborador' })).status, 403);
  assert.equal((await socio.get('/api/invites')).data.invites.length, 0);

  assert.equal((await env.admin.post('/api/invites', { kind: 'team', role: 'admin', max_uses: 5 })).data.field, 'name');
  assert.equal((await env.admin.post('/api/invites', { kind: 'team', role: 'admin', name: 'Otra Admin', days: 30 })).data.field, 'days');
  assert.equal((await env.admin.post('/api/invites', { kind: 'team', role: 'socio', max_uses: 500 })).data.field, 'max_uses');

  // Tokens inválidos: 404 y freno por IP.
  const anon = env.client();
  assert.equal((await anon.post('/api/invites/lookup', { token: 'x'.repeat(43) })).status, 404);
  assert.equal((await anon.post('/api/invites/lookup', { token: '../../etc' })).status, 404);
});

test('vencer, desactivar, reactivar y borrar', async () => {
  const env = await boot();
  const made = (await env.admin.post('/api/invites', { kind: 'team', role: 'colaborador', max_uses: 3, days: 1 })).data.invite;
  env.clock.t += 2 * 86_400_000;
  const expired = await env.client().post('/api/invites/lookup', { token: made.token });
  assert.equal(expired.status, 410);
  assert.equal(expired.data.status, 'vencido');
  await env.admin.login('admin@jc.test'); // la sesión del admin también venció por inactividad

  const extended = await env.admin.patch(`/api/invites/${made.id}`, { days: 7, max_uses: 10 });
  assert.equal(extended.data.invite.status, 'activo');
  assert.equal(extended.data.invite.max_uses, 10);
  await env.admin.patch(`/api/invites/${made.id}`, { active: false });
  assert.equal((await env.client().post('/api/invites/lookup', { token: made.token })).data.status, 'revocado');
  await env.admin.patch(`/api/invites/${made.id}`, { active: true });
  assert.equal((await env.client().post('/api/invites/accept', { token: made.token, ...person(1) })).status, 200);

  // Usado: no se borra (queda como registro); sin usar, sí.
  assert.equal((await env.admin.del(`/api/invites/${made.id}`)).status, 409);
  assert.equal((await env.admin.patch(`/api/invites/${made.id}`, { max_uses: 0 })).data.field, 'max_uses');
  const unused = (await env.admin.post('/api/invites', { kind: 'team', role: 'socio' })).data.invite;
  assert.equal((await env.admin.del(`/api/invites/${unused.id}`)).status, 200);
});
