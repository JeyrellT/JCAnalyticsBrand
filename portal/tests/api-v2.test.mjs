// v2: clientes, líneas de servicio, personas y equipo por proyecto (docs/v2-contrato.md).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from './helpers.mjs';
import { MIGRATIONS, migrate } from '../server/schema.mjs';
import { SERVICES, SERVICE_DEFAULTS } from '../shared/catalog.js';

let env;
let ids;

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

const inbox = async (who) => (await who.get('/api/notifications')).data.notifications;
const nowIso = () => new Date(env.clock.t).toISOString();
const inDays = (d, hour = 15) => new Date(Date.UTC(2026, 9, 10 + d, hour)).toISOString();

test('clientes: alta, validación, nombre único y permisos', async () => {
  const ana = await as('ana@jc.test');
  const cata = await as('cata@jc.test');

  const created = await ana.post('/api/clients', { name: '  La Burrada Street Food ', sector: 'Restaurante', contact_name: 'Dueño', contact_phone: '+506 8888-0000', contact_email: 'Dueno@LaBurrada.cr' });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const c = created.data.client;
  assert.equal(c.name, 'La Burrada Street Food');
  assert.equal(c.status, 'activo');
  assert.equal(c.contact_email, 'dueno@laburrada.cr');
  assert.equal(c.owner_id, ids.ana, 'sin owner_id lleva la relación quien lo registra');
  assert.equal(c.owner_name, 'Ana');
  assert.ok(c.owner_color);
  for (const key of ['projects_active', 'projects_total', 'value_crc']) assert.equal(c[key], 0, key);
  assert.equal(c.last_contact_at, null);
  assert.equal(c.next_appointment_at, null);

  const dup = await ana.post('/api/clients', { name: 'la burrada street food' });
  assert.equal(dup.status, 400);
  assert.equal(dup.data.field, 'name');

  const cases = [
    [{ name: 'X' }, 'name'],
    [{ sector: 'Retail' }, 'name'],
    [{ name: 'Cliente Raro', status: 'vip' }, 'status'],
    [{ name: 'Cliente Raro', contact_email: 'sin-arroba' }, 'contact_email'],
    [{ name: 'Cliente Raro', owner_id: 9999 }, 'owner_id'],
  ];
  for (const [body, field] of cases) {
    const r = await ana.post('/api/clients', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.data.field, field);
  }

  // Cualquier persona autenticada (también colaboradores) registra prospectos.
  const prospect = await cata.post('/api/clients', { name: 'Ferretería El Roble', status: 'prospecto', owner_id: ids.ana, contact_email: '' });
  assert.equal(prospect.status, 200, JSON.stringify(prospect.data));
  assert.equal(prospect.data.client.owner_id, ids.ana);
  assert.equal(prospect.data.client.contact_email, null);
  const inactive = await ana.post('/api/clients', { name: 'Cliente Viejo', status: 'inactivo', owner_id: null });
  assert.equal(inactive.data.client.owner_id, null);

  const list = (await cata.get('/api/clients')).data.clients;
  const order = list.map((x) => x.status);
  assert.deepEqual(order, [...order].sort((a, b) => ['activo', 'prospecto', 'inactivo'].indexOf(a) - ['activo', 'prospecto', 'inactivo'].indexOf(b)));
  const prospects = (await cata.get('/api/clients?status=prospecto')).data.clients;
  assert.ok(prospects.length >= 1 && prospects.every((x) => x.status === 'prospecto'));
  assert.equal((await cata.get('/api/clients?status=raro')).status, 400);
  assert.equal((await env.client().get('/api/clients')).status, 401);
  assert.equal((await cata.get('/api/clients/9999')).status, 404);
  assert.equal((await cata.patch('/api/clients/9999', { notes: 'x' })).status, 404);

  const activity = (await ana.get('/api/activity?entity=client')).data.activity;
  assert.ok(activity.some((a) => a.entity_id === c.id && a.action === 'created'));
});

test('clientes: campos calculados, ficha y renombrar actualiza proyectos', async () => {
  const ana = await as('ana@jc.test');
  const c = (await ana.post('/api/clients', { name: 'Uniquex', sector: 'Domótica', contact_name: 'Gerencia', contact_phone: '+506 7000-0000' })).data.client;

  const mk = (body) => ana.post('/api/projects', { kind: 'cliente', client_id: c.id, ...body });
  const p1 = (await mk({ name: 'Landing Uniquex', status: 'en_curso', value_amount: 1_000_000, currency: 'CRC' })).data.project;
  await mk({ name: 'Soporte domótica', status: 'prospecto', value_amount: 100_00, currency: 'USD' });
  await mk({ name: 'Proyecto viejo', status: 'cerrado', value_amount: 9_999_999, currency: 'CRC' });
  assert.equal(p1.client, 'Uniquex', 'copia el nombre de la ficha');
  assert.equal(p1.client_id, c.id);

  await ana.post(`/api/projects/${p1.id}/updates`, { channel: 'whatsapp', note: 'Enviamos el primer borrador.' });
  const past = await ana.post('/api/appointments', { title: 'Alcance Uniquex', kind: 'alcance', client_id: c.id, starts_at: inDays(-3), ends_at: inDays(-3, 16) });
  assert.equal(past.status, 200, JSON.stringify(past.data));
  await ana.post('/api/appointments', { title: 'Cancelada', kind: 'demo', status: 'cancelada', client_id: c.id, starts_at: inDays(1), ends_at: inDays(1, 16) });
  const next = (await ana.post('/api/appointments', { title: 'Entrega Uniquex', kind: 'entrega', project_id: p1.id, starts_at: inDays(4), ends_at: inDays(4, 16) })).data.appointment;
  assert.equal(next.client_id, c.id, 'la cita hereda el cliente del proyecto');

  const row = (await ana.get('/api/clients')).data.clients.find((x) => x.id === c.id);
  assert.equal(row.projects_active, 1);
  assert.equal(row.projects_total, 3);
  assert.equal(row.value_crc, 1_000_000 + 100_00 * 515, 'USD a CRC con fx_usd_crc; sin los cerrados');
  assert.equal(row.last_contact_at, nowIso(), 'el avance es más reciente que la cita pasada');
  assert.equal(row.next_appointment_at, inDays(4), 'ignora la cita cancelada');

  const detail = (await ana.get(`/api/clients/${c.id}`)).data;
  // v5 agrega `portal` (accesos, briefs, entregables y documentos del cliente).
  assert.deepEqual(Object.keys(detail).sort(), ['appointments', 'client', 'portal', 'projects', 'updates']);
  assert.equal(detail.client.value_crc, row.value_crc);
  assert.equal(detail.projects.length, 3);
  assert.ok(detail.projects.every((p) => Array.isArray(p.members) && 'tasks_total' in p && 'sla_state' in p));
  assert.equal(detail.appointments.length, 3);
  assert.ok(detail.appointments.every((a) => Array.isArray(a.attendees) && a.client_name === 'Uniquex'));
  assert.equal(detail.updates.length, 1);
  assert.equal(detail.updates[0].user_name, 'Ana');

  const renamed = await ana.patch(`/api/clients/${c.id}`, { name: 'Uniquex Costa Rica', status: 'inactivo' });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
  assert.equal(renamed.data.client.status, 'inactivo');
  assert.equal(renamed.data.client.sector, 'Domótica', 'PATCH parcial conserva lo demás');
  assert.equal((await ana.get(`/api/projects/${p1.id}`)).data.project.client, 'Uniquex Costa Rica');
  assert.equal((await ana.get(`/api/clients/${c.id}`)).data.appointments[0].client_name, 'Uniquex Costa Rica');
  const dup = await ana.patch(`/api/clients/${c.id}`, { name: 'LA BURRADA STREET FOOD' });
  assert.equal(dup.status, 400);
  assert.equal(dup.data.field, 'name');
  assert.equal((await ana.patch(`/api/clients/${c.id}`, { name: 'uniquex costa rica' })).status, 200, 'cambiar mayúsculas del propio nombre no choca');
});

test('proyectos: cliente del directorio y equipo con roles', async () => {
  const ana = await as('ana@jc.test');
  const beto = await as('beto@jc.test');
  const cata = await as('cata@jc.test');
  const client = (await ana.post('/api/clients', { name: 'Freight VIP', sector: 'Logística' })).data.client;

  const bad = [
    [{ members: [{ user_id: ids.beto, role: 'jefe' }] }, 'members'],
    [{ members: [{ user_id: 9999, role: 'equipo' }] }, 'members'],
    [{ members: 'beto' }, 'members'],
    [{ client_id: 9999 }, 'client_id'],
  ];
  for (const [body, field] of bad) {
    const r = await ana.post('/api/projects', { name: 'Cotizador VIP', kind: 'cliente', status: 'en_curso', ...body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.data.field, field);
  }

  const created = await ana.post('/api/projects', {
    name: 'Cotizador VIP', kind: 'cliente', status: 'en_curso', client: 'texto ignorado', client_id: client.id, owner_id: ids.ana,
    members: [{ user_id: ids.beto, role: 'responsable' }, { user_id: ids.ana, role: 'datos' }, { user_id: ids.cata }],
  });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const p = created.data.project;
  assert.equal(p.client, 'Freight VIP');
  assert.equal(p.client_id, client.id);
  assert.deepEqual(p.members.map((m) => [m.id, m.role]), [[ids.ana, 'responsable'], [ids.beto, 'equipo'], [ids.cata, 'equipo']], 'solo el owner es responsable');
  assert.ok(p.members.every((m) => m.name && m.color));

  const betoNotes = (await inbox(beto)).filter((n) => n.link === `/proyectos/${p.id}`);
  assert.equal(betoNotes.length, 1);
  assert.equal(betoNotes[0].kind, 'project');
  assert.match(betoNotes[0].title, /Te sumaron a Cotizador VIP/);
  assert.match(betoNotes[0].body, /Equipo/);
  const roleChange = (await ana.patch(`/api/projects/${p.id}`, { members: [{ user_id: ids.beto, role: 'desarrollo' }, { user_id: ids.cata }] })).data.project;
  assert.deepEqual(roleChange.members.map((m) => [m.id, m.role]), [[ids.ana, 'responsable'], [ids.beto, 'desarrollo'], [ids.cata, 'equipo']]);
  assert.equal((await inbox(beto)).filter((n) => n.link === `/proyectos/${p.id}`).length, 1, 'cambiar el rol no vuelve a avisar');
  assert.ok(!(await inbox(ana)).some((n) => n.link === `/proyectos/${p.id}`), 'nunca se avisa a quien hizo el cambio');

  // members reemplaza el equipo; el responsable queda aunque no venga en la lista.
  const replaced = await ana.patch(`/api/projects/${p.id}`, { members: [{ user_id: ids.cata, role: 'contenido' }] });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  assert.deepEqual(replaced.data.project.members.map((m) => [m.id, m.role]), [[ids.ana, 'responsable'], [ids.cata, 'contenido']]);
  assert.equal((await inbox(cata)).filter((n) => n.link === `/proyectos/${p.id}`).length, 1, 'quien ya era miembro no recibe otro aviso');

  // Cambiar responsable sin enviar equipo: el anterior pasa a "equipo".
  const reassigned = (await ana.patch(`/api/projects/${p.id}`, { owner_id: ids.beto })).data.project;
  assert.deepEqual(reassigned.members.map((m) => [m.id, m.role]), [[ids.beto, 'responsable'], [ids.ana, 'equipo'], [ids.cata, 'contenido']]);
  assert.ok((await inbox(beto)).some((n) => n.title.startsWith('Sos responsable de Cotizador VIP')));

  // Una persona desactivada puede seguir en el equipo, pero no sumarse.
  const lalo = env.addUser('lalo@jc.test', 'Lalo', 'colaborador');
  await ana.patch(`/api/projects/${p.id}`, { members: [{ user_id: ids.cata, role: 'contenido' }, { user_id: lalo, role: 'soporte' }] });
  const admin = await as('jeyrell@jc.test');
  await admin.patch(`/api/users/${lalo}`, { active: false });
  const keep = await ana.patch(`/api/projects/${p.id}`, { members: [{ user_id: lalo, role: 'diseno' }] });
  assert.equal(keep.status, 200, JSON.stringify(keep.data));
  const q = (await ana.post('/api/projects', { name: 'Otro', kind: 'interno', status: 'en_curso', members: [{ user_id: lalo, role: 'equipo' }] }));
  assert.equal(q.status, 400);
  assert.equal(q.data.field, 'members');

  // Texto libre sin client_id que ya no coincide con la ficha: se desenlaza.
  const unlinked = (await ana.patch(`/api/projects/${p.id}`, { client: 'Otra empresa' })).data.project;
  assert.equal(unlinked.client, 'Otra empresa');
  assert.equal(unlinked.client_id, null);
  const relinked = (await ana.patch(`/api/projects/${p.id}`, { client_id: client.id })).data.project;
  assert.equal(relinked.client, 'Freight VIP');
  assert.equal((await ana.patch(`/api/projects/${p.id}`, { client: 'freight vip' })).data.project.client_id, client.id);

  // Lista y detalle.
  const list = (await cata.get('/api/projects')).data.projects;
  assert.ok(list.every((x) => 'client_id' in x && 'client' in x && Array.isArray(x.members)));
  const detail = (await cata.get(`/api/projects/${p.id}`)).data;
  assert.equal(detail.client.id, client.id);
  assert.equal(detail.client.name, 'Freight VIP');
  assert.ok('value_crc' in detail.client);
  assert.ok(detail.project.members.length >= 2);
  const internal = (await cata.post('/api/projects', { name: 'Marca', kind: 'interno', status: 'en_curso' })).data.project;
  assert.deepEqual(internal.members.map((m) => [m.id, m.role]), [[ids.cata, 'responsable']], 'quien crea queda como responsable');
  assert.equal((await cata.get(`/api/projects/${internal.id}`)).data.client, null);
});

test('agenda: client_id completa el contacto y responde client_name', async () => {
  const ana = await as('ana@jc.test');
  const client = (await ana.post('/api/clients', { name: 'Ferretería Central', contact_name: 'Doña Rosa', contact_phone: '+506 8111-2222' })).data.client;
  const other = (await ana.post('/api/clients', { name: 'Clínica Sonrisa', contact_name: 'Recepción', contact_phone: '+506 8333-4444' })).data.client;

  const base = { kind: 'alcance', starts_at: inDays(6), ends_at: inDays(6, 16) };
  const a1 = await ana.post('/api/appointments', { ...base, title: 'Alcance ferretería', client_id: client.id });
  assert.equal(a1.status, 200, JSON.stringify(a1.data));
  assert.equal(a1.data.appointment.client_id, client.id);
  assert.equal(a1.data.appointment.client_name, 'Ferretería Central');
  assert.equal(a1.data.appointment.contact_name, 'Doña Rosa');
  assert.equal(a1.data.appointment.contact_phone, '+506 8111-2222');

  const a2 = (await ana.post('/api/appointments', { ...base, title: 'Alcance 2', client_id: client.id, contact_name: 'Hijo de Rosa', starts_at: inDays(7), ends_at: inDays(7, 16) })).data.appointment;
  assert.equal(a2.contact_name, 'Hijo de Rosa', 'lo enviado se respeta');
  assert.equal(a2.contact_phone, '+506 8111-2222');

  const moved = (await ana.patch(`/api/appointments/${a2.id}`, { client_id: other.id, contact_name: null, contact_phone: null })).data.appointment;
  assert.equal(moved.client_name, 'Clínica Sonrisa');
  assert.equal(moved.contact_name, 'Recepción');
  assert.equal(moved.contact_phone, '+506 8333-4444');
  const kept = (await ana.patch(`/api/appointments/${a2.id}`, { title: 'Alcance clínica' })).data.appointment;
  assert.equal(kept.client_id, other.id);

  const bad = await ana.post('/api/appointments', { ...base, title: 'Mal', client_id: 9999 });
  assert.equal(bad.status, 400);
  assert.equal(bad.data.field, 'client_id');

  const list = (await ana.get(`/api/appointments?from=${inDays(5)}&to=${inDays(9)}`)).data.appointments;
  const found = list.find((a) => a.id === a1.data.appointment.id);
  assert.equal(found.client_name, 'Ferretería Central');
  assert.ok(list.every((a) => 'client_id' in a && 'client_name' in a));
  const dash = (await ana.get('/api/dashboard')).data;
  assert.ok(dash.agenda.every((a) => 'client_name' in a));
});

test('servicios: catálogo con métricas y edición solo del admin', async () => {
  const admin = await as('jeyrell@jc.test');
  const ana = await as('ana@jc.test');
  const beto = await as('beto@jc.test');
  const cata = await as('cata@jc.test');

  const list = (await cata.get('/api/services')).data.services;
  assert.deepEqual(list.map((s) => s.key), Object.keys(SERVICES));
  const cm = list.find((s) => s.key === 'community_manager');
  assert.equal(cm.name, SERVICES.community_manager);
  assert.equal(cm.group, 'marketing');
  assert.equal(cm.group_label, 'Marketing y contenido');
  assert.equal(cm.price_from_usd, SERVICE_DEFAULTS.community_manager.price_from_usd);
  assert.equal(cm.unit, 'mes');
  assert.equal(cm.active, true);
  assert.equal(cm.lead_id, null);
  assert.deepEqual(cm.members, []);
  for (const k of ['lead_name', 'lead_color', 'description', 'projects_active', 'projects_total', 'value_crc_active', 'open_tasks']) assert.ok(k in cm, k);

  // Métricas: proyectos activos (no archivados), valor en CRC y tareas abiertas.
  const p1 = (await ana.post('/api/projects', { name: 'Flujo KNIME', kind: 'cliente', service: 'alteryx_knime', status: 'en_curso', value_amount: 50_00, currency: 'USD', members: [{ user_id: ids.cata, role: 'datos' }] })).data.project;
  await ana.post('/api/projects', { name: 'KNIME pausado', kind: 'cliente', service: 'alteryx_knime', status: 'pausado', value_amount: 1_000, currency: 'CRC' });
  const p3 = (await ana.post('/api/projects', { name: 'KNIME archivado', kind: 'cliente', service: 'alteryx_knime', status: 'soporte' })).data.project;
  await ana.patch(`/api/projects/${p3.id}`, { archived: true });
  await ana.post('/api/tasks', { title: 'Nodo de limpieza', project_id: p1.id });
  await ana.post('/api/tasks', { title: 'Ya hecha', project_id: p1.id, status: 'hecho' });
  await ana.post('/api/tasks', { title: 'Del archivado', project_id: p3.id });
  const knime = (await cata.get('/api/services')).data.services.find((s) => s.key === 'alteryx_knime');
  assert.equal(knime.projects_active, 1);
  assert.equal(knime.projects_total, 3);
  assert.equal(knime.value_crc_active, 50_00 * 515);
  assert.equal(knime.open_tasks, 1);

  // Permisos y validación.
  assert.equal((await ana.patch('/api/services/alteryx_knime', { lead_id: ids.ana })).status, 403, 'socio no edita');
  assert.equal((await cata.patch('/api/services/alteryx_knime', { lead_id: ids.ana })).status, 403);
  assert.equal((await admin.patch('/api/services/no_existe', { active: false })).status, 404);
  assert.equal((await cata.get('/api/services/no_existe')).status, 404);
  for (const [body, field] of [[{ price_from_usd: -1 }, 'price_from_usd'], [{ price_from_usd: 9.5 }, 'price_from_usd'], [{ unit: 'hora' }, 'unit'], [{ lead_id: 9999 }, 'lead_id'], [{ members: [9999] }, 'members'], [{ members: 3 }, 'members']]) {
    const r = await admin.patch('/api/services/alteryx_knime', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.data.field, field);
  }

  const upd = await admin.patch('/api/services/alteryx_knime', { lead_id: ids.ana, members: [ids.beto, ids.cata, ids.beto], price_from_usd: 70, unit: 'mes', description: 'Flujos de datos sin código.' });
  assert.equal(upd.status, 200, JSON.stringify(upd.data));
  const s = upd.data.service;
  assert.equal(s.lead_id, ids.ana);
  assert.equal(s.lead_name, 'Ana');
  assert.deepEqual(s.members.map((m) => m.id).sort(), [ids.beto, ids.cata].sort());
  assert.equal(s.price_from_usd, 70);
  assert.equal(s.unit, 'mes');
  assert.equal(s.description, 'Flujos de datos sin código.');
  assert.equal(s.projects_active, 1, 'la respuesta trae las métricas');

  const link = '/servicios/alteryx_knime';
  const anaNotes = (await inbox(ana)).filter((n) => n.link === link);
  assert.equal(anaNotes.length, 1);
  assert.equal(anaNotes[0].kind, 'service');
  assert.match(anaNotes[0].title, /líder/);
  assert.equal((await inbox(beto)).filter((n) => n.link === link).length, 1);
  assert.equal((await inbox(cata)).filter((n) => n.link === link).length, 1);
  assert.ok(!(await inbox(admin)).some((n) => n.link === link), 'el admin no se avisa a sí mismo');

  // Reemplazo del equipo: solo se avisa a quien entra o sale.
  const again = (await admin.patch('/api/services/alteryx_knime', { members: [ids.cata], price_from_usd: null, unit: null })).data.service;
  assert.deepEqual(again.members.map((m) => m.id), [ids.cata]);
  assert.equal(again.price_from_usd, null);
  assert.equal(again.lead_id, ids.ana, 'PATCH parcial conserva el líder');
  assert.equal((await inbox(beto)).filter((n) => n.link === link).length, 2, 'Beto recibe el aviso de salida');
  assert.equal((await inbox(cata)).filter((n) => n.link === link).length, 1, 'Catalina ya estaba');
  assert.equal((await inbox(ana)).filter((n) => n.link === link).length, 1);
  const paused = (await admin.patch('/api/services/alteryx_knime', { active: false })).data.service;
  assert.equal(paused.active, false);
  assert.ok((await admin.get('/api/activity?entity=service')).data.activity.some((a) => a.summary.includes(SERVICES.alteryx_knime)));

  // Detalle: proyectos sin archivar y personas por rol.
  const detail = (await cata.get('/api/services/alteryx_knime')).data;
  assert.equal(detail.service.key, 'alteryx_knime');
  assert.deepEqual(detail.projects.map((p) => p.name).sort(), ['Flujo KNIME', 'KNIME pausado']);
  assert.ok(detail.projects.every((p) => Array.isArray(p.members)));
  const roles = Object.fromEntries(detail.people.map((p) => [p.id, p.role]));
  assert.equal(roles[ids.ana], 'lider');
  assert.equal(roles[ids.cata], 'equipo', 'equipo fijo gana sobre miembro de proyecto');
  assert.equal(detail.people.filter((p) => p.id === ids.ana).length, 1, 'sin duplicados');
  await admin.patch('/api/services/alteryx_knime', { members: [] });
  const after = (await cata.get('/api/services/alteryx_knime')).data;
  assert.equal(after.people.find((p) => p.id === ids.cata).role, 'proyecto');
});

test('personas: carga de trabajo y perfil sin acciones sensibles para colaboradores', async () => {
  const admin = await as('jeyrell@jc.test');
  const ana = await as('ana@jc.test');
  const cata = await as('cata@jc.test');
  const mia = env.addUser('mia@jc.test', 'Mia', 'colaborador');

  const people = (await cata.get('/api/people')).data.people;
  assert.ok(people.every((p) => p.active), 'solo personas activas');
  assert.ok(!people.some((p) => p.email === 'lalo@jc.test'));
  const fresh = people.find((p) => p.id === mia);
  assert.equal(fresh.password_hash, undefined);
  assert.deepEqual([fresh.projects_active, fresh.open_tasks, fresh.overdue_tasks, fresh.week_appointments, fresh.load], [0, 0, 0, 0, 'baja']);
  assert.deepEqual(fresh.services_lead, []);

  // score = abiertas + 2·vencidas + 2·proyectos activos → 4 + 2·2 + 2·1 = 10 (media)
  const proj = (await ana.post('/api/projects', { name: 'Pipeline Mia', kind: 'interno', status: 'en_curso', service: 'python_pipeline', members: [{ user_id: mia, role: 'datos' }] })).data.project;
  for (const due of ['2026-10-01', '2026-10-05', '2026-12-01', null]) await ana.post('/api/tasks', { title: `Tarea ${due}`, assignee_id: mia, due_date: due, project_id: proj.id });
  await ana.post('/api/tasks', { title: 'Hecha', assignee_id: mia, status: 'hecho' });
  await ana.post('/api/appointments', { title: 'Revisión pipeline', kind: 'interna', starts_at: inDays(2), ends_at: inDays(2, 16), attendees: [mia, ids.ana] });
  await ana.post('/api/appointments', { title: 'Muy lejos', kind: 'interna', starts_at: inDays(20), ends_at: inDays(20, 16), attendees: [mia] });
  await admin.patch('/api/services/python_pipeline', { lead_id: mia, members: [ids.cata] });
  await admin.patch('/api/services/excel_vba', { members: [mia] });

  let me = (await cata.get('/api/people')).data.people.find((p) => p.id === mia);
  assert.deepEqual([me.projects_active, me.open_tasks, me.overdue_tasks, me.week_appointments, me.load], [1, 4, 2, 1, 'media']);
  assert.deepEqual(me.services_lead, ['python_pipeline']);
  assert.deepEqual(me.services_member, ['excel_vba']);
  await ana.post('/api/projects', { name: 'Segundo de Mia', kind: 'interno', status: 'en_revision', owner_id: mia });
  me = (await cata.get('/api/people')).data.people.find((p) => p.id === mia);
  assert.equal(me.load, 'alta', '4 + 4 + 2·2 = 12');

  const profile = (await cata.get(`/api/people/${mia}`)).data;
  assert.deepEqual(Object.keys(profile).sort(), ['activity', 'appointments', 'person', 'projects', 'services', 'tasks']);
  assert.equal(profile.person.load, 'alta');
  assert.deepEqual(profile.services, [{ key: 'python_pipeline', name: SERVICES.python_pipeline, role: 'lider' }, { key: 'excel_vba', name: SERVICES.excel_vba, role: 'equipo' }]);
  const roles = Object.fromEntries(profile.projects.map((p) => [p.name, p.role]));
  assert.deepEqual(roles, { 'Pipeline Mia': 'datos', 'Segundo de Mia': 'responsable' });
  assert.ok(profile.projects.every((p) => ['id', 'name', 'client', 'status', 'kind', 'sla_state', 'hours_since_update', 'role'].every((k) => k in p)));
  assert.equal(profile.tasks.length, 4);
  assert.equal(profile.tasks[0].due_date, '2026-10-01', 'primero lo más urgente');
  assert.equal(profile.tasks[0].project_name, 'Pipeline Mia');
  assert.deepEqual(profile.appointments.map((a) => a.title), ['Revisión pipeline'], 'solo los próximos 14 días');
  assert.ok(Array.isArray(profile.appointments[0].attendees));
  assert.equal((await cata.get('/api/people/9999')).status, 404);

  // Las acciones con dinero solo las ven socios y admin.
  await admin.post('/api/investments', { name: 'Fondo confidencial', category: 'otro' });
  const asCollaborator = (await cata.get(`/api/people/${ids.admin}`)).data.activity;
  assert.ok(asCollaborator.length > 0);
  assert.ok(asCollaborator.every((a) => !a.sensitive));
  assert.ok(asCollaborator.every((a) => !['login', 'login_failed'].includes(a.action)));
  const asPartner = (await ana.get(`/api/people/${ids.admin}`)).data.activity;
  assert.ok(asPartner.some((a) => a.sensitive && a.summary.includes('Fondo confidencial')));
  assert.ok(asPartner.length <= 30);
});

test('migración 3: rellena clientes, equipo de proyecto y líneas de servicio', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(MIGRATIONS[0]);
  db.exec(MIGRATIONS[1]);
  db.exec('PRAGMA user_version = 2');
  const at = '2026-09-01T12:00:00.000Z';
  const user = (email, name) => Number(db.prepare(`INSERT INTO users (email, name, role, password_hash, created_at) VALUES (?, ?, 'socio', 'x', ?)`).run(email, name, at).lastInsertRowid);
  const ana = user('ana@jc.test', 'Ana');
  const beto = user('beto@jc.test', 'Beto');
  const project = (name, client, status, owner, extra = {}) => Number(db.prepare(`INSERT INTO projects (name, client, kind, status, owner_id, contact_name, contact_phone, created_by, created_at, updated_at)
    VALUES (?, ?, 'cliente', ?, ?, ?, ?, ?, ?, ?)`).run(name, client, status, owner, extra.contact_name ?? null, extra.contact_phone ?? null, owner, extra.created_at ?? at, extra.updated_at ?? at).lastInsertRowid);
  const p1 = project('Sitio', 'La Burrada', 'en_curso', ana, { contact_name: 'Dueño', contact_phone: '+506 8888-0000', created_at: '2026-08-01T00:00:00.000Z' });
  const p2 = project('Panel cocina', '  la burrada ', 'prospecto', beto, { updated_at: '2026-09-20T00:00:00.000Z' });
  const p3 = project('Dashboard', 'Ferretería El Roble', 'prospecto', beto);
  const p4 = project('Viejo', 'Cliente Cerrado', 'cerrado', null);
  const p5 = project('Interno', '', 'en_curso', ana);
  const p6 = project('Sin cliente', null, 'en_curso', null);
  db.prepare(`INSERT INTO appointments (title, kind, starts_at, ends_at, project_id, created_at, updated_at) VALUES ('Demo', 'demo', ?, ?, ?, ?, ?)`).run(at, at, p2, at, at);

  migrate(db);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, MIGRATIONS.length);
  const clients = db.prepare('SELECT * FROM clients ORDER BY id').all();
  assert.equal(clients.length, 3, 'uno por nombre distinto, sin vacíos');
  const byName = Object.fromEntries(clients.map((c) => [c.name.toLowerCase(), c]));
  const burrada = byName['la burrada'];
  assert.ok(burrada);
  assert.equal(burrada.status, 'activo');
  assert.equal(burrada.owner_id, beto, 'responsable del proyecto más reciente');
  assert.equal(burrada.contact_name, 'Dueño');
  assert.equal(burrada.contact_phone, '+506 8888-0000');
  assert.equal(burrada.created_at, '2026-08-01T00:00:00.000Z');
  assert.equal(byName['ferretería el roble'].status, 'prospecto');
  assert.equal(byName['cliente cerrado'].status, 'inactivo');

  const link = Object.fromEntries(db.prepare('SELECT id, client_id FROM projects').all().map((r) => [r.id, r.client_id]));
  assert.equal(link[p1], burrada.id);
  assert.equal(link[p2], burrada.id);
  assert.equal(link[p3], byName['ferretería el roble'].id);
  assert.equal(link[p4], byName['cliente cerrado'].id);
  assert.equal(link[p5], null);
  assert.equal(link[p6], null);
  assert.equal(db.prepare('SELECT client_id FROM appointments').get().client_id, burrada.id, 'la cita hereda el cliente de su proyecto');

  const members = db.prepare('SELECT project_id, user_id, role FROM project_members ORDER BY project_id').all().map((r) => [r.project_id, r.user_id, r.role]);
  assert.deepEqual(members, [[p1, ana, 'responsable'], [p2, beto, 'responsable'], [p3, beto, 'responsable'], [p5, ana, 'responsable']]);

  const lines = db.prepare('SELECT * FROM service_lines').all();
  assert.equal(lines.length, Object.keys(SERVICE_DEFAULTS).length);
  assert.equal(lines.find((l) => l.key === 'power_bi').price_from_usd, SERVICE_DEFAULTS.power_bi.price_from_usd);
  assert.equal(lines.find((l) => l.key === 'video_edicion').unit, 'pieza');

  // Volver a migrar no duplica nada ni pisa lo editado.
  db.prepare("UPDATE service_lines SET price_from_usd = 999 WHERE key = 'power_bi'").run();
  migrate(db);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM clients').get().n, 3);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM project_members').get().n, 4);
  assert.equal(db.prepare("SELECT price_from_usd p FROM service_lines WHERE key = 'power_bi'").get().p, 999);
  db.close();
});
