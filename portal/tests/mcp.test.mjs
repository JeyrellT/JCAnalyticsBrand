// Conexión con Claude por MCP (/mcp): tokens personales, protocolo JSON-RPC y
// herramientas que reutilizan las rutas y permisos del portal.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.mjs';

let env;
let ids;
let token;

before(async () => {
  env = await startServer();
  ids = {
    admin: env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin'),
    cata: env.addUser('cata@jc.test', 'Catalina', 'colaborador'),
    inv: env.addUser('ivan@jc.test', 'Iván', 'inversionista'),
  };
});
after(() => env.close());

async function as(email) {
  const c = env.client();
  assert.equal((await c.login(email)).status, 200);
  return c;
}

/** Llamada JSON-RPC a /mcp con el token en el encabezado (o en la ruta). */
async function rpc(method, params, { auth = token, inPath = false, id = 1 } = {}) {
  const res = await fetch(`${env.base}/mcp${inPath ? `/${auth}` : ''}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json', accept: 'application/json, text/event-stream',
      ...(auth && !inPath ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null, headers: res.headers };
}

const toolData = (r) => JSON.parse(r.data.result.content[0].text);
const callTool = (name, args, opts) => rpc('tools/call', { name, arguments: args }, opts);

test('tokens: se crean desde el perfil, se muestran una vez y solo se guarda el hash', async () => {
  const c = await as('cata@jc.test');
  const r = await c.post('/api/me/mcp-tokens', { name: 'Claude Code' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  token = r.data.token;
  assert.match(token, /^jcp_[A-Za-z0-9_-]{40,}$/);
  assert.equal(r.data.tokens.length, 1);
  assert.equal(r.data.tokens[0].token_hash, undefined);
  const stored = env.db.prepare('SELECT token_hash FROM mcp_tokens WHERE id = ?').get(r.data.id).token_hash;
  assert.notEqual(stored, token);
  // Otra persona no ve ni revoca tokens ajenos.
  const admin = await as('jeyrell@jc.test');
  assert.equal((await admin.get('/api/me/mcp-tokens')).data.tokens.length, 0);
  assert.equal((await admin.del(`/api/me/mcp-tokens/${r.data.id}`)).status, 404);
  // Un inversionista no opera proyectos: no puede crear conexiones.
  assert.equal((await (await as('ivan@jc.test')).post('/api/me/mcp-tokens', {})).status, 403);
});

test('protocolo: initialize, tools/list, notificaciones y errores', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.status, 200);
  assert.equal(init.data.result.protocolVersion, '2025-06-18');
  assert.ok(init.data.result.capabilities.tools);
  assert.match(init.data.result.instructions, /portal_contexto/);

  const unknownVersion = await rpc('initialize', { protocolVersion: '1999-01-01' });
  assert.equal(unknownVersion.data.result.protocolVersion, '2025-11-25');

  const notif = await fetch(`${env.base}/mcp`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
  assert.equal(notif.status, 202);

  const list = await rpc('tools/list');
  const names = list.data.result.tools.map((t) => t.name);
  assert.deepEqual(names, ['portal_contexto', 'listar_proyectos', 'ver_proyecto', 'crear_proyecto', 'actualizar_proyecto', 'registrar_avance', 'crear_tarea', 'crear_cliente']);
  for (const t of list.data.result.tools) assert.equal(t.inputSchema.type, 'object');

  assert.equal((await rpc('nada/raro')).data.error.code, -32601);
  assert.equal((await callTool('borrar_todo', {})).data.error.code, -32602);
  const get = await fetch(`${env.base}/mcp`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(get.status, 405);
});

test('autenticación: sin token, token falso, origen ajeno y token en la ruta', async () => {
  const none = await rpc('tools/list', null, { auth: null });
  assert.equal(none.status, 401);
  assert.match(none.headers.get('www-authenticate'), /Bearer/);
  assert.equal((await rpc('tools/list', null, { auth: 'jcp_falso' })).status, 401);
  assert.equal((await rpc('tools/list', null, { auth: 'otra-cosa' })).status, 401);

  const foreign = await fetch(`${env.base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, origin: 'https://evil.example' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  assert.equal(foreign.status, 403);

  const viaPath = await rpc('tools/list', null, { inPath: true });
  assert.equal(viaPath.status, 200);
  assert.ok(viaPath.data.result.tools.length > 0);
});

test('herramientas: crear cliente, proyecto, tarea y avance con los permisos del dueño', async () => {
  const ctxData = toolData(await callTool('portal_contexto', {}));
  assert.equal(ctxData.you.name, 'Catalina');
  assert.ok(ctxData.people.some((p) => p.id === ids.admin));
  assert.ok(!ctxData.people.some((p) => p.id === ids.inv), 'los inversionistas no son parte de la operación');
  assert.ok(ctxData.catalogs.services.power_bi);

  const client = toolData(await callTool('crear_cliente', { name: 'Uniquex', status: 'activo', contact_name: 'Laura' }));
  assert.ok(client.client.id);

  const created = await callTool('crear_proyecto', {
    name: 'Dashboard de ventas', kind: 'cliente', status: 'en_curso', service: 'power_bi', client_id: client.client.id,
    value: 420, currency: 'USD', due_date: '2026-11-30', members: [{ user_id: ids.admin, role: 'datos' }],
  });
  assert.equal(created.data.result.isError, undefined, created.data.result.content[0].text);
  const project = toolData(created).project;
  assert.equal(project.value, 420);
  assert.equal(project.client, 'Uniquex');
  assert.equal(project.owner, 'Catalina', 'por defecto, responsable es quien conecta a Claude');
  assert.match(project.link, /\/proyectos\/\d+$/);
  const row = env.db.prepare('SELECT value_amount, created_by FROM projects WHERE id = ?').get(project.id);
  assert.equal(row.value_amount, 42000, 'se guarda en unidades menores como el portal');
  assert.equal(row.created_by, ids.cata);

  // Bitácora y avisos muestran que la acción fue vía Claude.
  const log = env.db.prepare("SELECT summary FROM activity WHERE entity = 'project' AND entity_id = ?").get(project.id);
  assert.match(log.summary, /Catalina \(vía Claude\) creó el proyecto/);
  const notice = env.db.prepare("SELECT body FROM notifications WHERE user_id = ? AND kind = 'project'").get(ids.admin);
  assert.match(notice.body, /vía Claude/);

  const task = toolData(await callTool('crear_tarea', { title: 'Modelo de datos', project_id: project.id, assignee_id: ids.admin, priority: 'alta' }));
  assert.equal(task.task.project_id, project.id);

  const update = toolData(await callTool('registrar_avance', { project_id: project.id, channel: 'whatsapp', note: 'Se compartió el primer borrador.' }));
  assert.equal(update.registered, true);

  const detail = toolData(await callTool('ver_proyecto', { id: project.id }));
  assert.equal(detail.tasks.length, 1);
  assert.equal(detail.updates[0].note, 'Se compartió el primer borrador.');

  const changed = toolData(await callTool('actualizar_proyecto', { id: project.id, status: 'en_revision', value: 450.5 }));
  assert.equal(changed.project.status, 'en_revision');
  assert.equal(changed.project.value, 450.5);

  const listed = toolData(await callTool('listar_proyectos', { search: 'ventas' }));
  assert.equal(listed.count, 1);
  assert.equal(toolData(await callTool('listar_proyectos', { status: 'prospecto' })).count, 0);
});

test('herramientas: los errores de validación vuelven legibles, sin romper la sesión MCP', async () => {
  const bad = await callTool('crear_proyecto', { name: 'X', kind: 'cliente', status: 'en_curso' });
  assert.equal(bad.status, 200);
  assert.equal(bad.data.result.isError, true);
  assert.match(bad.data.result.content[0].text, /name/);

  const dates = await callTool('crear_proyecto', { name: 'Fechas', kind: 'interno', status: 'en_curso', start_date: '2026-12-01', due_date: '2026-11-01' });
  assert.match(dates.data.result.content[0].text, /due_date/);

  const missing = await callTool('ver_proyecto', { id: 9999 });
  assert.match(missing.data.result.content[0].text, /No existe/);
});

test('tokens: revocar corta el acceso; una persona desactivada tampoco entra', async () => {
  const c = await as('cata@jc.test');
  const [first] = (await c.get('/api/me/mcp-tokens')).data.tokens;
  assert.ok(first.last_used_at, 'registra el último uso');
  assert.equal((await c.del(`/api/me/mcp-tokens/${first.id}`)).status, 200);
  assert.equal((await rpc('tools/list')).status, 401);

  const fresh = (await c.post('/api/me/mcp-tokens', { name: 'Desktop' })).data.token;
  assert.equal((await rpc('tools/list', null, { auth: fresh })).status, 200);
  env.db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(ids.cata);
  assert.equal((await rpc('tools/list', null, { auth: fresh })).status, 401);
  env.db.prepare('UPDATE users SET active = 1 WHERE id = ?').run(ids.cata);
});
