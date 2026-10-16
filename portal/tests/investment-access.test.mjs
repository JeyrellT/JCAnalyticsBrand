// Admin grants control new investor contributions; ownership preserves the ledger.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from './helpers.mjs';
import { MIGRATIONS, migrate } from '../server/schema.mjs';
import { createDemoBackend } from '../demo/backend.js';

const servers = [];
after(() => Promise.all(servers.map((server) => server.close())));
async function world() {
  const env = await startServer();
  servers.push(env);
  const ids = {};
  const api = {};
  for (const [name, role] of [['admin', 'admin'], ['socio', 'socio'], ['otroSocio', 'socio'], ['angel', 'inversionista'], ['beatriz', 'inversionista'], ['colab', 'colaborador']]) {
    ids[name] = env.addUser(`${name}@access.test`, name, role);
    api[name] = env.client();
    assert.equal((await api[name].login(`${name}@access.test`)).status, 200);
  }
  const make = async (name = 'Capital compartido') => {
    const response = await api.admin.post('/api/investments', { name, category: 'producto_propio', currency: 'CRC', target_amount: 100_000 });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    return response.data.investment;
  };
  const grant = (investment, allowed) => api.admin.call('PUT', `/api/investments/${investment.id}/access`, { allowed_investor_ids: allowed });
  return { ...env, ids, api, make, grant };
}
const contribution = (partnerId, amount = 10_000) => ({ type: 'aporte', partner_id: partnerId, amount, message: 'Aporte registrado para revisión.' });

test('acceso: solo admin reemplaza permisos validados, de forma atómica e idempotente', async () => {
  const w = await world();
  const investment = await w.make();
  const path = `/api/investments/${investment.id}/access`;
  assert.equal((await w.client().get(path)).status, 401);
  for (const role of ['socio', 'colab', 'angel']) {
    assert.equal((await w.api[role].get(path)).status, 403, role);
    assert.equal((await w.api[role].call('PUT', path, { allowed_investor_ids: [w.ids.angel] })).status, 403, role);
  }
  const initial = await w.api.admin.get(path);
  assert.deepEqual(initial.data.allowed_investor_ids, []);
  assert.deepEqual(initial.data.investors.map((person) => person.id).sort((a, b) => a - b), [w.ids.angel, w.ids.beatriz]);
  assert.ok(initial.data.investors.every((person) => !('password_hash' in person)));
  let saved = await w.grant(investment, [w.ids.beatriz, w.ids.angel, w.ids.angel]);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.deepEqual(saved.data.allowed_investor_ids, [w.ids.angel, w.ids.beatriz]);
  assert.equal((await w.grant(investment, [w.ids.angel, w.ids.beatriz])).status, 200);
  assert.equal(w.db.prepare('SELECT COUNT(*) n FROM investment_access WHERE investment_id = ?').get(investment.id).n, 2);
  for (const invalid of [null, 'all', [0], [-1], [1.5], [String(w.ids.angel)], [999999], [w.ids.socio], [w.ids.angel, w.ids.colab]]) {
    const bad = await w.api.admin.call('PUT', path, { allowed_investor_ids: invalid });
    assert.equal(bad.status, 400, JSON.stringify(invalid));
    assert.equal(bad.data.field, 'allowed_investor_ids');
    assert.deepEqual((await w.api.admin.get(path)).data.allowed_investor_ids, [w.ids.angel, w.ids.beatriz], 'invalid replacement never partially revokes access');
  }
  assert.equal((await w.api.admin.call('PUT', path, {})).status, 400);
  await w.api.admin.patch(`/api/users/${w.ids.beatriz}`, { active: false });
  saved = await w.grant(investment, [w.ids.beatriz]);
  assert.equal(saved.status, 200, 'an inactive investor can retain a configured grant');
  assert.equal(Boolean(saved.data.investors.find((person) => person.id === w.ids.beatriz).active), false);
  assert.equal((await w.grant(investment, [])).status, 200);
  assert.deepEqual((await w.api.admin.get(path)).data.allowed_investor_ids, []);
  assert.equal((await w.api.admin.get('/api/investments/999999/access')).status, 404);
  assert.equal((await w.api.admin.call('PUT', '/api/investments/999999/access', { allowed_investor_ids: [] })).status, 404);
});

test('acceso: catálogo habilitado sin historial mantiene capital cero y privacidad entre inversionistas', async () => {
  const w = await world();
  const first = await w.make('Idea de Ángel');
  const second = await w.make('Idea privada de Beatriz');
  await w.grant(first, [w.ids.angel]);
  await w.grant(second, [w.ids.beatriz]);
  const overview = (await w.api.angel.get('/api/investor/overview')).data;
  assert.deepEqual(overview.investments, []);
  assert.deepEqual(overview.available_investments.map((investment) => investment.id), [first.id]);
  assert.equal(overview.portfolio.contributed_crc, 0);
  assert.equal(overview.portfolio.returned_crc, 0);
  const detail = (await w.api.angel.get(`/api/investor/investments/${first.id}`)).data;
  assert.equal(detail.investment.access_granted, true);
  assert.equal(detail.investment.can_contribute, true);
  assert.equal(detail.investment.mine.contributed, 0);
  assert.equal(detail.investment.mine.share, 0);
  assert.deepEqual(detail.movements, []);
  assert.equal((await w.api.beatriz.get(`/api/investor/investments/${first.id}`)).status, 404);
  assert.equal((await w.api.angel.get(`/api/investor/investments/${second.id}`)).status, 404);
  assert.ok(!JSON.stringify(overview).includes(second.name));
  await w.grant(first, []);
  assert.deepEqual((await w.api.angel.get('/api/investor/overview')).data.available_investments, []);
  assert.equal((await w.api.angel.get(`/api/investor/investments/${first.id}`)).status, 404, 'revoked catalog entry with no history becomes private again');
});

test('acceso: revocar bloquea aportes propios y del equipo pero conserva acciones y cifras históricas', async () => {
  const w = await world();
  const investment = await w.make();
  const ownPath = `/api/investor/investments/${investment.id}/movements`;
  const staffPath = `/api/investments/${investment.id}/movements`;
  const ownBody = { amount: 5_000, message: 'Aviso propio pendiente.' };
  assert.equal((await w.api.angel.post(ownPath, ownBody)).status, 404, 'an unknown investment does not reveal that it exists');
  const blockedStaff = await w.api.socio.post(staffPath, contribution(w.ids.angel));
  assert.equal(blockedStaff.status, 403);
  assert.equal(blockedStaff.data.error, 'investment_not_allowed');
  await w.grant(investment, [w.ids.angel]);
  const external = await w.api.admin.post(staffPath, contribution(w.ids.angel));
  const own = await w.api.angel.post(ownPath, ownBody);
  assert.equal(external.status, 200);
  assert.equal(own.status, 200);
  assert.equal(own.data.movement.can_resolve, false);
  assert.equal((await w.api.angel.post(`/api/investor/movements/${own.data.movement.id}/confirm`)).data.error, 'not_your_confirmation');
  const snapshot = JSON.stringify(w.db.prepare('SELECT * FROM movements ORDER BY id').all());
  await w.grant(investment, []);
  assert.equal(JSON.stringify(w.db.prepare('SELECT * FROM movements ORDER BY id').all()), snapshot, 'revocation never edits the money ledger');
  for (const response of [await w.api.angel.post(ownPath, ownBody), await w.api.admin.post(staffPath, contribution(w.ids.angel)), await w.api.socio.post(staffPath, contribution(w.ids.angel))]) {
    assert.equal(response.status, 403);
    assert.equal(response.data.error, 'investment_not_allowed');
  }
  const detail = (await w.api.angel.get(`/api/investor/investments/${investment.id}`)).data;
  assert.equal(detail.investment.access_granted, false);
  assert.equal(detail.investment.can_contribute, false);
  assert.equal(detail.movements.length, 2);
  assert.equal((await w.api.angel.post(`/api/investor/movements/${external.data.movement.id}/confirm`)).status, 200);
  assert.equal((await w.api.angel.post(`/api/investor/movements/${own.data.movement.id}/annul`, { message: 'Retiro el aviso pendiente.' })).status, 200);
  assert.equal((await w.api.angel.post(`/api/investor/movements/${external.data.movement.id}/messages`, { body: 'Mi historial sigue disponible.' })).status, 200);
  const returned = await w.api.socio.post(staffPath, { type: 'retorno', partner_id: w.ids.angel, amount: 2_000, message: 'Retorno del capital histórico.' });
  assert.equal(returned.status, 200, JSON.stringify(returned.data));
  assert.equal((await w.api.angel.post(`/api/investor/movements/${returned.data.movement.id}/confirm`)).status, 200);
  let overview = (await w.api.angel.get('/api/investor/overview')).data;
  assert.equal(overview.portfolio.contributed_crc, 10_000);
  assert.equal(overview.portfolio.returned_crc, 2_000);
  assert.equal(overview.portfolio.net_crc, -8_000);
  assert.deepEqual(overview.investments.map((item) => item.id), [investment.id]);
  assert.deepEqual(overview.available_investments, []);
  const distribution = await w.api.socio.post(`/api/investments/${investment.id}/distribute`, { amount: 1_000, message: 'Reparto a titulares históricos.' });
  assert.equal(distribution.status, 200);
  assert.equal(distribution.data.movements[0].partner_id, w.ids.angel);
  assert.equal((await w.api.beatriz.post(`/api/investor/movements/${external.data.movement.id}/confirm`)).status, 404);
  const csv = await w.api.angel.get('/api/investor/statement.csv');
  assert.equal(csv.status, 200);
  assert.ok(csv.data.includes(investment.name));
  await w.grant(investment, [w.ids.angel]);
  overview = (await w.api.angel.get('/api/investor/overview')).data;
  assert.equal(overview.investments[0].can_contribute, true);
  assert.deepEqual(overview.available_investments, [], 'regrant does not duplicate a historical position in the catalog');
});

test('acceso: socios mantienen todas las inversiones y un permiso no abre inversiones terminadas', async () => {
  const w = await world();
  const first = await w.make('Abierta sin permisos externos');
  const second = await w.make('Terminada');
  assert.deepEqual((await w.api.socio.get('/api/investments')).data.investments.map((investment) => investment.id).sort(), [first.id, second.id]);
  for (const investment of [first, second]) {
    const detail = await w.api.socio.get(`/api/investments/${investment.id}`);
    assert.equal(detail.status, 200);
    assert.deepEqual(detail.data.allowed_investor_ids, []);
    assert.equal((await w.api.socio.post(`/api/investments/${investment.id}/movements`, contribution(w.ids.socio))).status, 200);
  }
  assert.equal((await w.api.colab.get(`/api/investments/${first.id}`)).status, 403);
  await w.grant(second, [w.ids.angel]);
  for (const status of ['cerrada', 'perdida']) {
    assert.equal((await w.api.admin.patch(`/api/investments/${second.id}`, { status })).status, 200);
    const detail = (await w.api.angel.get(`/api/investor/investments/${second.id}`)).data;
    assert.equal(detail.investment.access_granted, true);
    assert.equal(detail.investment.can_contribute, false);
    assert.equal((await w.api.angel.post(`/api/investor/investments/${second.id}/movements`, { amount: 1_000, message: 'No debe aceptarse.' })).status, 409);
    const staffAttempt = await w.api.socio.post(`/api/investments/${second.id}/movements`, contribution(w.ids.angel));
    assert.equal(staffAttempt.status, 409, `staff must respect the investor's closed ${status} position`);
    assert.equal(staffAttempt.data.error, 'investment_closed');
  }
});

test('acceso: cambios de rol aplican permisos actuales y nunca permiten al socio administrarlos', async () => {
  const w = await world();
  const own = await w.make('Habilitada');
  const other = await w.make('Otra idea');
  await w.grant(own, [w.ids.angel]);
  await w.api.admin.patch(`/api/users/${w.ids.angel}`, { role: 'socio' });
  assert.equal((await w.api.angel.get(`/api/investments/${other.id}`)).status, 200);
  assert.equal((await w.api.angel.post(`/api/investments/${other.id}/movements`, contribution(w.ids.angel))).status, 200);
  assert.equal((await w.api.angel.call('PUT', `/api/investments/${other.id}/access`, { allowed_investor_ids: [w.ids.beatriz] })).status, 403);
  await w.api.admin.patch(`/api/users/${w.ids.angel}`, { role: 'colaborador' });
  assert.equal((await w.api.angel.get(`/api/investments/${other.id}`)).status, 403);
  await w.api.admin.patch(`/api/users/${w.ids.angel}`, { role: 'inversionista' });
  assert.equal((await w.api.angel.get(`/api/investments/${own.id}`)).status, 403);
  const historical = (await w.api.angel.get(`/api/investor/investments/${other.id}`)).data;
  assert.equal(historical.investment.access_granted, false);
  assert.equal(historical.investment.can_contribute, false);
});

test('acceso: migración conserva capital histórico y no vuelve a conceder permisos revocados', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    for (const [index, migration] of MIGRATIONS.slice(0, 7).entries()) {
      const step = typeof migration === 'string' ? { sql: migration } : migration;
      if (step.foreignKeysOff) db.exec('PRAGMA foreign_keys = OFF');
      db.exec(step.sql);
      db.exec(`PRAGMA user_version = ${index + 1}`);
      if (step.foreignKeysOff) db.exec('PRAGMA foreign_keys = ON');
    }
    const at = '2026-10-01T00:00:00.000Z';
    const user = (name, role) => Number(db.prepare('INSERT INTO users (email, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(`${name}@migration.test`, name, role, 'hash', at).lastInsertRowid);
    const admin = user('Admin', 'admin');
    const investor = user('Inversionista', 'inversionista');
    const socio = user('Socio', 'socio');
    const unused = user('SinCapital', 'inversionista');
    const investment = Number(db.prepare('INSERT INTO investments (name, category, currency, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('Histórica', 'otro', 'CRC', admin, at, at).lastInsertRowid);
    const insert = db.prepare('INSERT INTO movements (investment_id, partner_id, type, amount, currency, date, message, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const [partner, status, amount] of [[investor, 'confirmado', 10_000], [investor, 'pendiente', 1_000], [socio, 'anulado', 500]]) insert.run(investment, partner, 'aporte', amount, 'CRC', '2026-10-01', 'Registro anterior a permisos.', status, admin, at);
    const beforeRows = db.prepare('SELECT * FROM movements ORDER BY id').all();
    const originalColumns = Object.keys(beforeRows[0]);
    const before = JSON.stringify(beforeRows);
    migrate(db);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, MIGRATIONS.length);
    assert.deepEqual(db.prepare('SELECT investment_id, investor_id FROM investment_access').all().map((row) => ({ ...row })), [{ investment_id: investment, investor_id: investor }]);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM investment_access WHERE investor_id = ?').get(unused).n, 0);
    const afterRows = db.prepare('SELECT * FROM movements ORDER BY id').all();
    assert.equal(JSON.stringify(afterRows.map((row) => Object.fromEntries(originalColumns.map((key) => [key, row[key]])))), before, 'later additive migrations preserve every historical field');
    assert.ok(afterRows.every((row) => row.return_kind === 'unclassified' && row.return_capital_amount == null && row.return_profit_amount == null), 'new classification never invents a historical principal/profit split');
    db.prepare('DELETE FROM investment_access WHERE investment_id = ? AND investor_id = ?').run(investment, investor);
    migrate(db);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM investment_access').get().n, 0, 'restart never restores a revoked legacy grant');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.throws(() => db.prepare('INSERT INTO investment_access (investment_id, investor_id, granted_at) VALUES (?, ?, ?)').run(999999, investor, at), /FOREIGN KEY/);
  } finally { db.close(); }
});

test('acceso: la demo comparte reglas y siembra permisos explícitos para el inversionista', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    const backend = createDemoBackend({ db, now: () => Date.parse('2026-10-15T18:00:00Z') });
    await backend.seed();
    const investor = db.prepare("SELECT id FROM users WHERE role = 'inversionista' AND email = 'angel@demo.jcanalytic.local'").get();
    const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
    const overview = await backend.as(investor.id, (api) => api('GET', '/api/investor/overview'));
    assert.ok(overview.investments.length > 0);
    assert.ok(overview.investments.every((investment) => investment.access_granted));
    const investment = overview.investments[0];
    await backend.as(admin.id, (api) => api('PUT', `/api/investments/${investment.id}/access`, { allowed_investor_ids: [] }));
    const detail = await backend.as(investor.id, (api) => api('GET', `/api/investor/investments/${investment.id}`));
    assert.equal(detail.investment.can_contribute, false);
    assert.equal(detail.investment.mine.contributed, investment.mine.contributed);
  } finally { db.close(); }
});
