// v5: portal de clientes y brief creativo (docs/v5-contrato.md).
// Foco: aislamiento entre identidades y entre clientes, flujo del brief con
// versiones y huella, entregables con aprobación y lo que el cliente NO debe ver.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startServer, PASSWORD } from './helpers.mjs';
import { createDemoBackend } from '../demo/backend.js';
import { normalizeBriefData, briefProblems, canonicalJson, leadTimeProblem, emptyBriefData } from '../shared/brief.js';

let env;
let ids;
let api;
const C = {};
const P = {};
const NEW_PASSWORD = 'ClienteSeguro2026';

before(async () => {
  env = await startServer(); // reloj: 2026-10-10 09:00 en Costa Rica
  ids = {
    admin: env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin'),
    ana: env.addUser('ana@jc.test', 'Ana', 'socio'),
    cata: env.addUser('cata@jc.test', 'Catalina', 'colaborador'),
    hil: env.addUser('hil@jc.test', 'Hillary', 'colaborador'),
  };
  api = { admin: await as('jeyrell@jc.test'), ana: await as('ana@jc.test'), cata: await as('cata@jc.test'), hil: await as('hil@jc.test') };
  // Dos clientes: Catalina (colaboradora) lleva La Burrada; Ana lleva Uniquex.
  C.burrada = (await api.ana.post('/api/clients', { name: 'La Burrada', owner_id: ids.cata })).data.client.id;
  C.uniquex = (await api.ana.post('/api/clients', { name: 'Uniquex', owner_id: ids.ana })).data.client.id;
  const project = async (name, clientId, extra = {}) => (await api.ana.post('/api/projects', {
    name, client_id: clientId, kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: ids.cata, value_amount: 46_350_000, currency: 'CRC', ...extra,
  })).data.project.id;
  P.burrada = await project('Pedidos en línea La Burrada', C.burrada);
  P.burradaProspect = await project('Fase 2 · panel de cocina', C.burrada, { status: 'prospecto' });
  P.uniquex = await project('Landing Uniquex', C.uniquex, { owner_id: ids.ana });
});
after(() => env.close());

async function as(email) {
  const c = env.client();
  const r = await c.login(email);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return c;
}

/** Crea un acceso de cliente, entra con la clave temporal y la cambia. Devuelve { http, account }. */
async function clientAccount(clientId, email, extra = {}, creator = api.ana) {
  const created = await creator.post(`/api/clients/${clientId}/accounts`, { name: extra.name ?? 'Contacto', email, ...extra });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const http = env.client();
  const login = await http.post('/api/client/auth/login', { email, password: created.data.temporary_password });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  const changed = await http.post('/api/client/me/password', { current_password: created.data.temporary_password, new_password: NEW_PASSWORD });
  assert.equal(changed.status, 200, JSON.stringify(changed.data));
  return { http, account: created.data.account, temp: created.data.temporary_password };
}

/** Datos completos y válidos del brief de ejemplo (formato CREATIVIDAD de La Burrada). */
const fullData = (overrides = {}) => ({
  brand: 'La Burrada',
  materials: ['email', 'redes_post'],
  objective: 'conversion',
  offer: 'Giveaway de tacos y descuentos',
  key_message: 'Desarrollar estrategia que comunique la promoción con introducción agresiva, urgencia y CTA fuerte a compra inmediata.',
  social_accounts: 'La Burrada - GIVEAWAY TACOS',
  database_segment: 'Segmentación con mayor alcance. Subject lines con hook de alto impacto.',
  links: [{ label: 'WhatsApp', url: 'https://wa.me/50688880000' }, { label: 'Facebook', url: 'https://facebook.com/laburrada' }],
  includes_creative: true,
  editable_format: 'template',
  send_setup: true,
  test_email: 'pruebas@laburrada.cr',
  send_start: '2026-10-20',
  send_end: '2026-10-30',
  is_contest: true,
  disclaimer: 'Válido del 20 al 30 de octubre o hasta agotar existencias. Aplican restricciones.',
  rights_confirmed: true,
  ...overrides,
});

// ── Reglas compartidas (sin servidor) ───────────────────────────────────────

test('brief compartido: limpieza de forma, reglas para enviar y huella canónica', () => {
  const { data, errors } = normalizeBriefData({ ...fullData(), hack: '<script>', materials: ['redes_post', 'email', 'email'] });
  assert.deepEqual(errors, []);
  assert.equal(data.hack, undefined, 'las claves desconocidas se descartan');
  assert.deepEqual(data.materials, ['email', 'redes_post'], 'orden canónico y sin duplicados');
  assert.deepEqual(Object.keys(data).sort(), Object.keys(emptyBriefData()).sort());

  const bad = normalizeBriefData({ links: [{ label: 'x', url: 'javascript:alert(1)' }], test_email: 'no-es-correo', materials: ['email'], objective: 'robar' });
  assert.ok(bad.errors.some((e) => e.field === 'links.0'), 'javascript: no es un enlace válido');
  assert.ok(bad.errors.some((e) => e.field === 'objective'));
  assert.ok(bad.errors.some((e) => e.field === 'test_email'));

  // Los campos que no aplican quedan vacíos (no se guardan datos huérfanos).
  assert.equal(normalizeBriefData({ materials: ['redes_post'], test_email: 'a@b.cr' }).data.test_email, null);

  const problems = briefProblems(normalizeBriefData({ materials: ['email', 'otro'], send_setup: true, objective: 'conversion', is_contest: true }).data, { title: '' });
  const fields = problems.map((p) => p.field);
  for (const f of ['title', 'brand', 'offer', 'key_message', 'send_start', 'materials_other', 'test_email', 'links', 'promo_rules_url', 'rights_confirmed']) {
    assert.ok(fields.includes(f), `falta la regla de ${f}`);
  }
  assert.deepEqual(briefProblems(normalizeBriefData(fullData()).data, { title: 'Giveaway' }), []);

  assert.equal(canonicalJson({ b: 1, a: [{ d: 2, c: 1 }] }), canonicalJson({ a: [{ c: 1, d: 2 }], b: 1 }));
  assert.match(leadTimeProblem({ send_start: '2026-10-11' }, { today: '2026-10-10', leadDays: 3 }), /2026-10-13/);
  assert.equal(leadTimeProblem({ send_start: '2026-10-11' }, { today: '2026-10-10', leadDays: 3, urgent: true }), null);
  assert.match(leadTimeProblem({ send_start: '2026-10-09' }, { today: '2026-10-10', leadDays: 3, urgent: true }), /ya pasó/);
});

// ── Accesos y aislamiento ───────────────────────────────────────────────────

test('accesos: alta con clave temporal, permisos, correo único y cambio obligatorio', async () => {
  // Hillary (colaboradora, no lleva la cuenta) no puede dar accesos; Catalina (responsable) sí.
  const denied = await api.hil.post(`/api/clients/${C.burrada}/accounts`, { name: 'Dueño', email: 'dueno@laburrada.cr' });
  assert.equal(denied.status, 403);
  const created = await api.cata.post(`/api/clients/${C.burrada}/accounts`, { name: 'Dueño La Burrada', email: 'Dueno@LaBurrada.cr', title: 'Gerente' });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  assert.match(created.data.temporary_password, /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4}){3}$/);
  assert.equal(created.data.account.email, 'dueno@laburrada.cr');
  assert.equal(created.data.account.must_change_password, true);
  assert.equal(created.data.account.password_hash, undefined, 'el hash nunca sale por la API');

  // Un correo = una persona en todo el portal.
  assert.equal((await api.ana.post(`/api/clients/${C.uniquex}/accounts`, { name: 'Otro', email: 'dueno@laburrada.cr' })).status, 400);
  assert.equal((await api.ana.post(`/api/clients/${C.uniquex}/accounts`, { name: 'Otro', email: 'ana@jc.test' })).data.field, 'email');
  assert.equal((await api.admin.post('/api/users', { name: 'Dueño', email: 'dueno@laburrada.cr', role: 'colaborador' })).data.field, 'email');

  // La clave del cliente no abre el portal del equipo (y no revela que existe).
  const team = env.client();
  assert.equal((await team.login('dueno@laburrada.cr', created.data.temporary_password)).status, 401);

  const http = env.client();
  assert.equal((await http.post('/api/client/auth/login', { email: 'dueno@laburrada.cr', password: 'incorrecta123' })).status, 401);
  const login = await http.post('/api/client/auth/login', { email: 'dueno@laburrada.cr', password: created.data.temporary_password });
  assert.equal(login.status, 200);
  assert.match(http.cookie, /^jcc_session=/, 'cookie propia del portal de clientes');
  assert.equal(login.data.account.client_name, 'La Burrada');

  // Con clave temporal: solo perfil, cambio de clave y salida.
  assert.equal((await http.get('/api/client/overview')).status, 403);
  assert.equal((await http.get('/api/client/me')).data.account.must_change_password, true);
  assert.equal((await http.post('/api/client/me/password', { current_password: created.data.temporary_password, new_password: 'corta' })).data.field, 'new_password');
  // Contraseñas de diccionario: rechazadas aunque cumplan el largo.
  for (const weak of ['Password2026x', 'JCAnalytics2026', 'aaaaaa123456', 'Contraseña2026']) {
    assert.equal((await http.post('/api/client/me/password', { current_password: created.data.temporary_password, new_password: weak })).data.field, 'new_password', weak);
  }
  assert.equal((await http.post('/api/client/me/password', { current_password: created.data.temporary_password, new_password: NEW_PASSWORD })).status, 200);
  const me = (await http.get('/api/client/me')).data;
  assert.equal(me.account.must_change_password, false);
  assert.equal(me.contact.name, 'Catalina', 'el ejecutivo de cuenta es quien lleva al cliente');
  assert.equal((await http.get('/api/client/overview')).status, 200);
  // Bienvenida en sus avisos.
  assert.ok((await http.get('/api/client/notifications')).data.notifications.some((n) => n.kind === 'cuenta'));
});

test('aislamiento: identidades separadas y cada cliente solo ve lo suyo', async () => {
  const burrada = await clientAccount(C.burrada, 'marketing@laburrada.cr', { name: 'Marketing Burrada' });
  const uniquex = await clientAccount(C.uniquex, 'gerencia@uniquex.cr', { name: 'Gerencia Uniquex' });

  // La cookie del cliente no abre NINGUNA ruta del equipo…
  for (const path of ['/api/me', '/api/projects', '/api/clients', '/api/briefs', '/api/dashboard', '/api/activity', `/api/projects/${P.burrada}`]) {
    assert.equal((await burrada.http.get(path)).status, 401, path);
  }
  assert.equal((await burrada.http.post('/api/tasks', { title: 'x' })).status, 401);
  // …y la del equipo no abre el portal de clientes.
  for (const path of ['/api/client/me', '/api/client/overview', '/api/client/projects', '/api/client/briefs']) {
    assert.equal((await api.admin.get(path)).status, 401, path);
  }
  // Sin el encabezado propio, las escrituras se bloquean (CSRF), también para clientes.
  const forged = await burrada.http.call('POST', '/api/client/briefs', { title: 'CSRF' }, { headers: { 'x-portal-request': '0' } });
  assert.equal(forged.status, 403);

  // Proyectos: solo los suyos, sin prospectos, sin montos ni tareas.
  const list = (await burrada.http.get('/api/client/projects')).data.projects;
  assert.deepEqual(list.map((p) => p.id), [P.burrada]);
  const p = list[0];
  for (const hidden of ['value_amount', 'currency', 'contact_phone', 'contact_name', 'tasks_total', 'sla_state', 'members']) assert.equal(p[hidden], undefined, hidden);
  assert.equal(p.status_label, 'En desarrollo');
  assert.equal((await burrada.http.get(`/api/client/projects/${P.burradaProspect}`)).status, 404, 'un prospecto es pipeline interno');
  assert.equal((await burrada.http.get(`/api/client/projects/${P.uniquex}`)).status, 404, 'proyecto de otro cliente: 404, no 403');
  assert.equal((await uniquex.http.get(`/api/client/projects/${P.burrada}`)).status, 404);

  // Citas: ve las suyas con cliente, nunca las internas ni las notas.
  await api.cata.post('/api/appointments', { title: 'Demo del menú', kind: 'demo', starts_at: '2026-10-14T16:00:00Z', ends_at: '2026-10-14T17:00:00Z', project_id: P.burrada, notes: 'Ojo: negociar precio fase 2', attendees: [ids.cata] });
  await api.cata.post('/api/appointments', { title: 'Interna: precio', kind: 'interna', starts_at: '2026-10-14T18:00:00Z', ends_at: '2026-10-14T18:30:00Z', project_id: P.burrada, attendees: [ids.cata] });
  const detail = (await burrada.http.get(`/api/client/projects/${P.burrada}`)).data;
  assert.deepEqual(detail.meetings.map((m) => m.title), ['Demo del menú']);
  assert.equal(detail.meetings[0].notes, undefined);
  assert.equal(detail.tasks, undefined);

  // Avance registrado por el equipo → visible y avisado en el portal del cliente.
  await api.cata.post(`/api/projects/${P.burrada}/updates`, { channel: 'whatsapp', note: 'Menú digital listo para revisión.' });
  assert.equal((await burrada.http.get(`/api/client/projects/${P.burrada}`)).data.updates[0].note, 'Menú digital listo para revisión.');
  assert.ok((await burrada.http.get('/api/client/notifications')).data.notifications.some((n) => n.kind === 'avance' && n.link === `/cliente/proyectos/${P.burrada}`));
  assert.equal((await uniquex.http.get('/api/client/notifications')).data.notifications.filter((n) => n.kind === 'avance').length, 0);

  // Un brief de La Burrada no existe para Uniquex (ni leer, ni editar, ni comentar, ni cancelar).
  const brief = (await burrada.http.post('/api/client/briefs', { title: 'Giveaway tacos' })).data.brief;
  for (const [method, path, body] of [
    ['GET', `/api/client/briefs/${brief.id}`], ['PATCH', `/api/client/briefs/${brief.id}`, { title: 'Hackeado' }],
    ['POST', `/api/client/briefs/${brief.id}/comments`, { body: 'hola' }], ['POST', `/api/client/briefs/${brief.id}/cancel`, {}],
    ['POST', `/api/client/briefs/${brief.id}/submit`, {}],
  ]) {
    assert.equal((await uniquex.http.call(method, path, body)).status, 404, `${method} ${path}`);
  }
  assert.deepEqual((await uniquex.http.get('/api/client/briefs')).data.briefs, []);
  // Tampoco puede ligar su brief a un proyecto ajeno.
  assert.equal((await uniquex.http.post('/api/client/briefs', { title: 'Mío', project_id: P.burrada })).data.field, 'project_id');

  // Quitar el acceso cierra la sesión al instante.
  const off = await api.cata.patch(`/api/client-accounts/${burrada.account.id}`, { active: false });
  assert.equal(off.status, 200);
  assert.equal((await burrada.http.get('/api/client/me')).status, 401);
  assert.equal((await env.client().post('/api/client/auth/login', { email: 'marketing@laburrada.cr', password: NEW_PASSWORD })).status, 401);
  await api.cata.patch(`/api/client-accounts/${burrada.account.id}`, { active: true });
});

// ── Brief: flujo completo ───────────────────────────────────────────────────

test('brief: borrador → envío con versión y huella → ajustes → reenvío → aprobación', async () => {
  const { http } = await clientAccount(C.burrada, 'promo@laburrada.cr', { name: 'Promo Burrada' });

  const created = await http.post('/api/client/briefs', { title: 'Giveaway tacos octubre', project_id: P.burrada, data: { materials: ['email'], hack: 1 } });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const b = created.data.brief;
  assert.match(b.code, /^BRF-2026-\d{4}$/);
  assert.equal(b.status, 'borrador');
  assert.equal(b.data.brand, 'La Burrada', 'la marca arranca con el nombre del cliente');
  assert.equal(b.data.hack, undefined);
  assert.equal(b.owner_name, 'Catalina', 'responsable: el del proyecto');
  assert.equal(b.urgent_reason, undefined, 'el cliente no ve notas internas de urgencia');

  // Incompleto: no se envía, y la respuesta dice qué falta.
  const incomplete = await http.post(`/api/client/briefs/${b.id}/submit`, {});
  assert.equal(incomplete.status, 400);
  assert.ok(incomplete.data.problems.length >= 4);

  // Fecha demasiado próxima (plazo mínimo de 3 días): no se envía.
  await http.patch(`/api/client/briefs/${b.id}`, { data: fullData({ send_start: '2026-10-11', send_end: '2026-10-12' }) });
  const soon = await http.post(`/api/client/briefs/${b.id}/submit`, {});
  assert.equal(soon.data.field, 'send_start');
  assert.match(soon.data.message, /2026-10-13/);

  // Bloqueo optimista: un guardado con una versión vieja de la pantalla no pisa cambios.
  const stale = await http.patch(`/api/client/briefs/${b.id}`, { data: fullData(), if_updated_at: '2020-01-01T00:00:00.000Z' });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.error, 'conflict');

  const saved = await http.patch(`/api/client/briefs/${b.id}`, { data: fullData() });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.brief.completeness.pct, 100);
  const sent = await http.post(`/api/client/briefs/${b.id}/submit`, { if_updated_at: saved.data.brief.updated_at });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal(sent.data.brief.status, 'enviado');
  assert.equal(sent.data.version, 1);
  assert.match(sent.data.hash, /^[0-9a-f]{64}$/);

  // Enviado = congelado: ni el cliente ni el equipo editan el contenido.
  assert.equal((await http.patch(`/api/client/briefs/${b.id}`, { title: 'Otro' })).status, 409);
  assert.equal((await api.cata.patch(`/api/briefs/${b.id}`, { data: fullData({ offer: 'otra' }) })).data.error, 'brief_locked');

  // El equipo recibió el aviso (responsable del brief / proyecto / cliente).
  const inbox = (await api.cata.get('/api/notifications')).data.notifications;
  assert.ok(inbox.some((n) => n.kind === 'brief' && n.link === `/briefs/${b.id}`));
  // Y aparece como excepción en el centro de operaciones.
  const dash = (await api.cata.get('/api/dashboard')).data;
  assert.equal(dash.client_portal.briefs_to_review, 1);
  assert.ok(dash.alerts.some((a) => a.kind === 'brief'));

  // Pedir ajustes exige motivo; las notas internas nunca llegan al cliente.
  assert.equal((await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'observado' })).data.field, 'note');
  assert.equal((await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'cerrado' })).status, 409, 'no se salta etapas');
  await api.cata.post(`/api/briefs/${b.id}/comments`, { body: 'Ojo: el cliente debe ₡300 000 de la fase 1', internal: true });
  const observed = await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'observado', note: 'Falta el reglamento del giveaway.' });
  assert.equal(observed.data.brief.status, 'observado');
  const seen = (await http.get(`/api/client/briefs/${b.id}`)).data;
  assert.equal(seen.brief.status, 'observado');
  assert.ok(seen.events.some((e) => e.body === 'Falta el reglamento del giveaway.'));
  assert.ok(!seen.events.some((e) => e.kind === 'nota_interna' || /300 000/.test(e.body ?? '')), 'la nota interna no se filtra');
  assert.ok((await http.get('/api/client/notifications')).data.notifications.some((n) => n.link === `/cliente/solicitudes/${b.id}` && /ajustes/.test(n.title)));

  // El cliente corrige y reenvía: versión 2 con su propia huella.
  await http.patch(`/api/client/briefs/${b.id}`, { data: fullData({ promo_rules_url: 'https://laburrada.cr/reglamento' }) });
  await http.post(`/api/client/briefs/${b.id}/comments`, { body: 'Listo, agregamos el reglamento.' });
  const resent = await http.post(`/api/client/briefs/${b.id}/submit`, {});
  assert.equal(resent.data.version, 2);
  assert.notEqual(resent.data.hash, sent.data.hash);

  const approved = await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'aprobado' });
  assert.equal(approved.data.brief.approved_version, 2);
  assert.equal((await http.post(`/api/client/briefs/${b.id}/cancel`, { note: 'ya no' })).status, 409, 'aprobado: el cliente ya no lo cancela solo');

  // Versiones: verificables por huella; una alteración directa en la base se detecta.
  const v1 = (await http.get(`/api/client/briefs/${b.id}/versions/1`)).data.version;
  assert.equal(v1.hash_ok, true);
  assert.equal(v1.data.promo_rules_url, null);
  env.db.prepare("UPDATE brief_versions SET data = REPLACE(data, 'Giveaway', 'Rifa') WHERE brief_id = ? AND version = 1").run(b.id);
  assert.equal((await api.cata.get(`/api/briefs/${b.id}/versions/1`)).data.version.hash_ok, false);
  assert.equal((await http.get(`/api/client/briefs/${b.id}/versions/9`)).status, 404);

  // Bitácora del equipo completa (incluida la nota interna).
  const teamView = (await api.cata.get(`/api/briefs/${b.id}`)).data;
  assert.deepEqual(teamView.versions.map((v) => v.version), [2, 1]);
  assert.ok(teamView.events.some((e) => e.kind === 'nota_interna'));
  assert.deepEqual(teamView.events.filter((e) => e.kind === 'enviado').map((e) => e.version), [1, 2]);

  // Producción → entrega → cierre (reabrir producción exige motivo).
  await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'en_produccion' });
  await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'entregado' });
  assert.equal((await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'en_produccion' })).data.field, 'note');
  const closed = await api.cata.post(`/api/briefs/${b.id}/transition`, { to: 'cerrado' });
  assert.equal(closed.data.brief.status, 'cerrado');
  assert.equal((await http.post(`/api/client/briefs/${b.id}/comments`, { body: 'gracias' })).status, 409, 'cerrado: sin más cambios');
});

test('brief del equipo: alta para un cliente, urgencia con motivo y numeración correlativa', async () => {
  const first = (await api.ana.post('/api/briefs', { client_id: C.uniquex, title: 'Lanzamiento domótica', project_id: P.uniquex })).data.brief;
  const second = (await api.ana.post('/api/briefs', { client_id: C.uniquex, title: 'Campaña navidad' })).data.brief;
  assert.equal(Number(second.code.slice(-4)), Number(first.code.slice(-4)) + 1);
  assert.equal(first.owner_name, 'Ana');
  // Proyecto de otro cliente: rechazado.
  assert.equal((await api.ana.post('/api/briefs', { client_id: C.uniquex, title: 'Cruzado', project_id: P.burrada })).data.field, 'project_id');

  await api.ana.patch(`/api/briefs/${first.id}`, { data: fullData({ brand: 'Uniquex', send_start: '2026-10-11', send_end: '2026-10-12' }) });
  assert.equal((await api.ana.post(`/api/briefs/${first.id}/submit`, {})).data.field, 'send_start');
  assert.equal((await api.ana.patch(`/api/briefs/${first.id}`, { urgent: true })).data.field, 'urgent_reason');
  const urgent = await api.ana.patch(`/api/briefs/${first.id}`, { urgent: true, urgent_reason: 'Feria del fin de semana confirmada hoy.' });
  assert.equal(urgent.data.brief.urgent_reason, 'Feria del fin de semana confirmada hoy.');
  const sent = await api.ana.post(`/api/briefs/${first.id}/submit`, {});
  assert.equal(sent.status, 200, JSON.stringify(sent.data));

  const list = (await api.cata.get('/api/briefs?status=enviado')).data;
  assert.ok(list.briefs.every((x) => x.status === 'enviado' && x.data === undefined));
  assert.ok(list.counts.enviado >= 1);
});

// ── Entregables, etapas y documentos ────────────────────────────────────────

test('entregables: aprobación por versión, permiso de aprobar y registro inborrable', async () => {
  const approver = await clientAccount(C.burrada, 'aprueba@laburrada.cr', { name: 'Aprobador' });
  const viewer = await clientAccount(C.burrada, 'mira@laburrada.cr', { name: 'Solo lectura', can_approve: false });

  // Un entregable no se puede colgar de un proyecto de otro cliente.
  assert.equal((await api.cata.post('/api/deliverables', { client_id: C.burrada, project_id: P.uniquex, title: 'Cruzado' })).data.field, 'project_id');
  assert.equal((await api.cata.post('/api/deliverables', { client_id: C.burrada, title: 'Malo', url: 'javascript:alert(1)' })).data.field, 'url');

  const shared = await api.cata.post('/api/deliverables', { client_id: C.burrada, project_id: P.burrada, title: 'Piezas giveaway', url: 'https://drive.example/v1' });
  assert.equal(shared.status, 200, JSON.stringify(shared.data));
  const d = shared.data.deliverable;
  assert.equal(d.status, 'en_revision');
  assert.ok((await approver.http.get('/api/client/notifications')).data.notifications.some((n) => n.link === `/cliente/entregables/${d.id}`));

  assert.equal((await viewer.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'aprobado' })).data.error, 'approval_not_allowed');
  assert.equal((await approver.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'cambios' })).data.field, 'note');
  assert.equal((await approver.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'aprobado', version: 7 })).data.error, 'stale_version');
  const changes = await approver.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'cambios', note: 'Más grande el logo, por favor.', version: 1 });
  assert.equal(changes.data.deliverable.status, 'cambios');
  assert.equal((await approver.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'aprobado' })).status, 409, 'ya decidido');
  assert.equal((await api.cata.get('/api/dashboard')).data.client_portal.changes_requested, 1);
  assert.ok((await api.cata.get('/api/notifications')).data.notifications.some((n) => n.kind === 'deliverable'));

  // Cambiar el enlace = versión nueva (lo decidido nunca cambia en silencio).
  const v2 = await api.cata.patch(`/api/deliverables/${d.id}`, { url: 'https://drive.example/v2', note: 'Logo más grande.' });
  assert.equal(v2.data.deliverable.version, 2);
  assert.equal(v2.data.deliverable.status, 'en_revision');
  assert.equal(v2.data.deliverable.decision_note, null);
  const ok = await approver.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'aprobado', version: 2 });
  assert.equal(ok.data.deliverable.status, 'aprobado');
  assert.deepEqual(ok.data.events.map((e) => e.kind), ['compartido', 'cambios', 'nueva_version', 'aprobado']);
  assert.equal((await api.cata.del(`/api/deliverables/${d.id}`)).data.error, 'deliverable_locked');

  // Otro cliente no lo ve ni lo decide.
  const other = await clientAccount(C.uniquex, 'otro@uniquex.cr');
  assert.equal((await other.http.get(`/api/client/deliverables/${d.id}`)).status, 404);
  assert.equal((await other.http.post(`/api/client/deliverables/${d.id}/decision`, { decision: 'aprobado' })).status, 404);
});

test('etapas y documentos: avance por etapas, aviso al completar y enlaces seguros', async () => {
  const { http } = await clientAccount(C.burrada, 'etapas@laburrada.cr');
  const add = (title, status) => api.cata.post(`/api/projects/${P.burrada}/milestones`, { title, status, due_date: '2026-10-20' });
  await add('Alcance y diseño', 'completado');
  await add('Desarrollo', 'en_curso');
  const third = (await add('Publicación', 'pendiente')).data.milestones.at(-1);
  let project = (await http.get(`/api/client/projects/${P.burrada}`)).data.project;
  assert.equal(project.milestones_total, 3);
  assert.equal(project.milestones_done, 1);
  assert.equal(project.next_milestone.title, 'Desarrollo');

  const done = await api.cata.patch(`/api/milestones/${third.id}`, { status: 'completado' });
  assert.ok(done.data.milestones.find((m) => m.id === third.id).completed_at);
  project = (await http.get(`/api/client/projects/${P.burrada}`)).data.project;
  assert.equal(project.milestones_done, 2);
  assert.ok((await http.get('/api/client/notifications')).data.notifications.some((n) => n.title === 'Etapa completada: Publicación'));

  // Documentos: solo http(s), ligados a proyectos del mismo cliente.
  assert.equal((await api.cata.post(`/api/clients/${C.burrada}/documents`, { title: 'Contrato', url: 'javascript:alert(1)' })).data.field, 'url');
  assert.equal((await api.cata.post(`/api/clients/${C.burrada}/documents`, { title: 'Contrato', url: 'https://drive.example/c', project_id: P.uniquex })).data.field, 'project_id');
  const doc = await api.cata.post(`/api/clients/${C.burrada}/documents`, { title: 'Contrato firmado', url: 'https://drive.example/c', category: 'contrato' });
  assert.equal(doc.status, 200);
  assert.deepEqual((await http.get('/api/client/documents')).data.documents.map((x) => x.title), ['Contrato firmado']);
  const other = await clientAccount(C.uniquex, 'docs@uniquex.cr');
  assert.deepEqual((await other.http.get('/api/client/documents')).data.documents, []);

  // Ficha interna del cliente: resumen del portal.
  const portal = (await api.cata.get(`/api/clients/${C.burrada}`)).data.portal;
  assert.ok(portal.accounts.length >= 1);
  assert.equal(portal.can_manage, true);
  assert.equal(portal.documents.length, 1);
  assert.equal((await api.hil.get(`/api/clients/${C.burrada}`)).data.portal.can_manage, false);
});

test('freno y reinicio de clave: clave nueva cierra sesiones y vuelve a exigir cambio', async () => {
  const { http, account } = await clientAccount(C.uniquex, 'reset@uniquex.cr');
  assert.equal((await api.hil.post(`/api/client-accounts/${account.id}/reset-password`)).status, 403);
  const reset = await api.ana.post(`/api/client-accounts/${account.id}/reset-password`);
  assert.equal(reset.status, 200);
  assert.equal((await http.get('/api/client/me')).status, 401, 'las sesiones abiertas se cierran');
  const again = env.client();
  assert.equal((await again.post('/api/client/auth/login', { email: 'reset@uniquex.cr', password: NEW_PASSWORD })).status, 401);
  assert.equal((await again.post('/api/client/auth/login', { email: 'reset@uniquex.cr', password: reset.data.temporary_password })).status, 200);
  assert.equal((await again.get('/api/client/briefs')).status, 403, 'clave temporal: hay que cambiarla');
  // Cookie basura o malformada: 401 limpio, nunca 500.
  const junk = await env.client().call('GET', '/api/client/me', undefined, { headers: { cookie: 'jcc_session=%E0%A4%A' } });
  assert.equal(junk.status, 401);
  // El límite de intentos de login aplica también al portal de clientes.
  const brute = env.client();
  let last;
  for (let i = 0; i < 7; i += 1) last = await brute.post('/api/client/auth/login', { email: 'reset@uniquex.cr', password: `mala-${i}-clave` });
  assert.equal(last.status, 429);
});

test('encabezados de seguridad del portal', async () => {
  const res = await fetch(`${env.base}/api/client/me`);
  assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.match(res.headers.get('content-security-policy'), /object-src 'none'/);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
});

test('demo del navegador: las cuentas de cliente usan sesiones aparte', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  const demo = createDemoBackend({ db, now: () => Date.parse('2026-10-10T15:00:00Z'), onError: (e) => { throw e; } });
  const at = '2026-10-01T00:00:00.000Z';
  const { hashPassword } = await import('../server/auth.mjs');
  const hash = await hashPassword(PASSWORD);
  const userId = Number(db.prepare(`INSERT INTO users (email, name, role, password_hash, must_change_password, created_at) VALUES ('a@jc.test', 'Admin', 'admin', ?, 0, ?)`).run(hash, at).lastInsertRowid);
  const clientId = Number(db.prepare("INSERT INTO clients (name, created_at, updated_at) VALUES ('Cliente Demo', ?, ?)").run(at, at).lastInsertRowid);
  db.prepare(`INSERT INTO client_accounts (client_id, email, name, password_hash, must_change_password, created_by, created_at) VALUES (?, 'c@demo.cr', 'Contacto', ?, 0, ?, ?)`).run(clientId, hash, userId, at);

  assert.equal((await demo.dispatch('/api/client/auth/login', { method: 'POST', body: { email: 'c@demo.cr', password: PASSWORD } }, 'tab')).status, 200);
  assert.equal((await demo.dispatch('/api/client/me', {}, 'tab')).data.client.name, 'Cliente Demo');
  assert.equal((await demo.dispatch('/api/me', {}, 'tab')).status, 401, 'la sesión de cliente no abre rutas del equipo');
  assert.deepEqual(demo.clientPersonas().map((p) => p.email), ['c@demo.cr']);
  const brief = await demo.asClient(1, (call) => call('POST', '/api/client/briefs', { title: 'Brief demo' }));
  assert.match(brief.brief.code, /^BRF-2026-0001$/);
});
