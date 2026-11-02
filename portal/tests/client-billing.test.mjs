// Portal simple del cliente: actualizaciones que el cliente pide y el equipo cotiza,
// y su cuenta de pagos (docs/portal-cliente-simple.md).
// Foco: quién pone el monto, aislamiento entre clientes, cobro al aceptar,
// pendientes de cobros programados sin inventar deuda vieja y registro de pagos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.mjs';

let env;
let ids;
let api;
const C = {};
const P = {};
const NEW_PASSWORD = 'ClienteSeguro2026';
const DAY = 86_400_000;

before(async () => {
  env = await startServer(); // reloj: 2026-10-10 09:00 en Costa Rica
  ids = {
    admin: env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin'),
    ana: env.addUser('ana@jc.test', 'Ana', 'socio'),
    cata: env.addUser('cata@jc.test', 'Catalina', 'colaborador'),
  };
  api = { admin: await as('jeyrell@jc.test'), ana: await as('ana@jc.test'), cata: await as('cata@jc.test') };
  C.burrada = (await api.ana.post('/api/clients', { name: 'La Burrada', owner_id: ids.cata })).data.client.id;
  C.uniquex = (await api.ana.post('/api/clients', { name: 'Uniquex', owner_id: ids.ana })).data.client.id;
  const project = async (name, clientId, extra = {}) => (await api.ana.post('/api/projects', {
    name, client_id: clientId, kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: ids.cata, ...extra,
  })).data.project.id;
  P.burrada = await project('Pedidos en línea La Burrada', C.burrada);
  P.uniquex = await project('Landing Uniquex', C.uniquex, { owner_id: ids.ana });
});
after(() => env.close());

async function as(email) {
  const c = env.client();
  const r = await c.login(email);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return c;
}

async function clientAccount(clientId, email, extra = {}) {
  const created = await api.ana.post(`/api/clients/${clientId}/accounts`, { name: extra.name ?? 'Contacto', email, ...extra });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const http = env.client();
  assert.equal((await http.post('/api/client/auth/login', { email, password: created.data.temporary_password })).status, 200);
  assert.equal((await http.post('/api/client/me/password', { current_password: created.data.temporary_password, new_password: NEW_PASSWORD })).status, 200);
  return http;
}

test('actualización: el cliente pide, solo socios/admin ponen el monto y al aceptar nace el cobro', async () => {
  const owner = await clientAccount(C.burrada, 'dueno@burrada.cr', { name: 'Dueño' });
  const viewer = await clientAccount(C.burrada, 'mkt@burrada.cr', { name: 'Marketing', can_approve: false });
  const other = await clientAccount(C.uniquex, 'gerencia@uniquex.cr');

  // Pedido simple: título, detalle y proyecto (opcional). Un proyecto ajeno no se acepta.
  assert.equal((await owner.post('/api/client/requests', { title: 'Sección de combos', project_id: P.uniquex })).status, 400);
  const created = await owner.post('/api/client/requests', { title: 'Sección de combos', detail: 'Agregar combos familiares al menú.', project_id: P.burrada });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const req = created.data.request;
  assert.equal(req.status, 'pendiente');
  assert.equal(req.status_label, 'Esperando cotización');
  assert.equal(req.amount, null);
  assert.equal(req.quoted_by_name, undefined, 'el cliente no ve quién cotiza');

  // El equipo se entera (admin incluido) y lo ve en la ficha del cliente y en el inicio.
  const inbox = await api.admin.get('/api/notifications');
  assert.ok(inbox.data.notifications.some((n) => n.kind === 'request' && n.title.includes('La Burrada')), 'aviso al admin');
  const dash = await api.cata.get('/api/dashboard');
  assert.equal(dash.data.client_portal.requests_to_quote, 1);
  assert.ok(dash.data.alerts.some((a) => a.kind === 'request'));

  // Aislamiento: otro cliente no la ve ni la decide (404, no 403).
  assert.equal((await other.get('/api/client/requests')).data.requests.length, 0);
  assert.equal((await other.post(`/api/client/requests/${req.id}/decision`, { decision: 'aceptar' })).status, 404);

  // Sin monto todavía: no se puede aceptar.
  assert.equal((await owner.post(`/api/client/requests/${req.id}/decision`, { decision: 'aceptar' })).status, 409);

  // Una colaboradora no pone montos; una socia sí.
  assert.equal((await api.cata.post(`/api/client-requests/${req.id}/quote`, { amount: 6_500_000, currency: 'CRC' })).status, 403);
  assert.equal((await api.ana.post(`/api/client-requests/${req.id}/quote`, { amount: -1 })).status, 400);
  const quoted = await api.ana.post(`/api/client-requests/${req.id}/quote`, { amount: 6_500_000, currency: 'CRC', note: 'Incluye diseño y carga de 6 combos.' });
  assert.equal(quoted.status, 200, JSON.stringify(quoted.data));
  assert.equal(quoted.data.request.status, 'cotizada');
  assert.equal(quoted.data.request.quoted_by_name, 'Ana');

  // El cliente ve el monto y recibe el aviso.
  const list = (await owner.get('/api/client/requests')).data;
  assert.equal(list.requests[0].amount, 6_500_000);
  assert.equal(list.requests[0].status_label, 'Lista para aprobar');
  assert.ok((await owner.get('/api/client/notifications')).data.notifications.some((n) => n.kind === 'actualizacion' && n.title.startsWith('Cotización lista')));
  assert.equal((await owner.get('/api/client/counts')).data.quotes, 1);

  // Quien no puede aprobar no acepta; un monto distinto al que vio es una cotización vieja.
  assert.equal((await viewer.post(`/api/client/requests/${req.id}/decision`, { decision: 'aceptar' })).status, 403);
  const stale = await owner.post(`/api/client/requests/${req.id}/decision`, { decision: 'aceptar', amount: 5_000_000, currency: 'CRC' });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.error ?? stale.data.code ?? 'stale_quote', 'stale_quote');

  const accepted = await owner.post(`/api/client/requests/${req.id}/decision`, { decision: 'aceptar', amount: 6_500_000, currency: 'CRC' });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.request.status, 'en_proceso');
  assert.ok(accepted.data.request.payment_id, 'nace el cobro');
  // Una sola decisión.
  assert.equal((await owner.post(`/api/client/requests/${req.id}/decision`, { decision: 'rechazar' })).status, 409);

  // El cobro aparece "por pagar" en la cuenta del cliente, con el título de la actualización.
  const pay = (await owner.get('/api/client/payments')).data;
  assert.equal(pay.summary.pending_count, 1);
  assert.deepEqual(pay.summary.pending, { CRC: 6_500_000 });
  assert.equal(pay.payments[0].concept, 'Actualización: Sección de combos');
  assert.equal(pay.payments[0].source, 'actualizacion');
  assert.equal(pay.payments[0].due_date, '2026-10-10');
  assert.equal(pay.payments[0].void_reason, undefined, 'el cliente no ve campos internos');

  // El otro cliente no ve esa cuenta.
  assert.equal((await other.get('/api/client/payments')).data.payments.length, 0);

  // Registrar el pago: solo socios/admin; fecha futura no; el cliente recibe el aviso.
  const paymentId = pay.payments[0].id;
  assert.equal((await api.cata.post(`/api/client-payments/${paymentId}/pay`, {})).status, 403);
  assert.equal((await api.admin.post(`/api/client-payments/${paymentId}/pay`, { paid_date: '2026-12-01' })).status, 400);
  const paid = await api.admin.post(`/api/client-payments/${paymentId}/pay`, { paid_date: '2026-10-10', reference: 'SINPE 123456' });
  assert.equal(paid.status, 200, JSON.stringify(paid.data));
  assert.equal(paid.data.payment.status, 'pagado');
  const after = (await owner.get('/api/client/payments')).data;
  assert.equal(after.summary.pending_count, 0);
  assert.deepEqual(after.summary.paid_year, { CRC: 6_500_000 });
  assert.equal(after.payments[0].reference, 'SINPE 123456');
  assert.ok((await owner.get('/api/client/notifications')).data.notifications.some((n) => n.kind === 'pago' && n.title.includes('Recibimos tu pago')));
  // Un pago registrado no se paga dos veces ni se anula.
  assert.equal((await api.admin.post(`/api/client-payments/${paymentId}/pay`, {})).status, 409);
  assert.equal((await api.admin.post(`/api/client-payments/${paymentId}/void`, { reason: 'Error de prueba' })).status, 409);

  // Lista: el equipo la cierra y el cliente lo ve.
  const done = await api.cata.post(`/api/client-requests/${req.id}/status`, { to: 'lista', note: 'Ya está publicada.' });
  assert.equal(done.status, 200, JSON.stringify(done.data));
  assert.equal((await owner.get('/api/client/requests')).data.requests[0].status, 'lista');
});

test('actualización: monto 0 arranca sin cobro; retirar, rechazar y aceptar por WhatsApp', async () => {
  const owner = await clientAccount(C.uniquex, 'duena@uniquex.cr');
  const free = (await owner.post('/api/client/requests', { title: 'Cambiar el teléfono del pie' })).data.request;
  const zero = await api.admin.post(`/api/client-requests/${free.id}/quote`, { amount: 0 });
  assert.equal(zero.status, 200, JSON.stringify(zero.data));
  assert.equal(zero.data.request.status, 'en_proceso');
  assert.equal(zero.data.request.payment_id, null, 'sin costo: sin cobro');

  // El cliente retira lo que aún no tiene monto; lo cotizado se rechaza.
  const retire = (await owner.post('/api/client/requests', { title: 'Idea que ya no va' })).data.request;
  assert.equal((await owner.post(`/api/client/requests/${retire.id}/cancel`)).data.request.status, 'cancelada');
  const decline = (await owner.post('/api/client/requests', { title: 'Chat en vivo' })).data.request;
  await api.ana.post(`/api/client-requests/${decline.id}/quote`, { amount: 25_000_00, currency: 'USD' });
  assert.equal((await owner.post(`/api/client/requests/${decline.id}/cancel`)).status, 409);
  const declined = await owner.post(`/api/client/requests/${decline.id}/decision`, { decision: 'rechazar', note: 'Por ahora no.' });
  assert.equal(declined.data.request.status, 'rechazada');
  assert.equal(declined.data.request.payment_id, null);

  // El equipo registra un pedido que llegó por WhatsApp, con monto, y la aceptación del cliente.
  const viaTeam = await api.ana.post(`/api/clients/${C.uniquex}/requests`, { title: 'Video del recorrido', amount: 150_00, currency: 'USD', project_id: P.uniquex });
  assert.equal(viaTeam.status, 200, JSON.stringify(viaTeam.data));
  assert.equal(viaTeam.data.request.status, 'cotizada');
  assert.equal((await api.cata.post(`/api/clients/${C.uniquex}/requests`, { title: 'Con monto', amount: 100 })).status, 403);
  assert.equal((await api.cata.post(`/api/client-requests/${viaTeam.data.request.id}/status`, { to: 'en_proceso' })).status, 403);
  const onBehalf = await api.ana.post(`/api/client-requests/${viaTeam.data.request.id}/status`, { to: 'en_proceso' });
  assert.equal(onBehalf.status, 200, JSON.stringify(onBehalf.data));
  assert.ok(onBehalf.data.request.payment_id);
  const account = (await owner.get('/api/client/payments')).data;
  assert.deepEqual(account.summary.pending, { USD: 150_00 });

  // Rechazar desde el equipo exige motivo.
  const other = (await owner.post('/api/client/requests', { title: 'Tienda completa' })).data.request;
  assert.equal((await api.cata.post(`/api/client-requests/${other.id}/status`, { to: 'rechazada' })).status, 400);
  assert.equal((await api.cata.post(`/api/client-requests/${other.id}/status`, { to: 'rechazada', note: 'Fuera del alcance del plan.' })).data.request.status, 'rechazada');
});

test('pagos: cobro manual, pago recibido directo, deshacer y "Cómo pagar"', async () => {
  const owner = await clientAccount(C.uniquex, 'cobros@uniquex.cr');
  assert.equal((await api.cata.post(`/api/clients/${C.uniquex}/payments`, { concept: 'Hosting anual', amount: 100 })).status, 403);
  assert.equal((await api.ana.post(`/api/clients/${C.uniquex}/payments`, { concept: 'Hosting anual', amount: 100, project_id: P.burrada })).status, 400, 'proyecto de otro cliente');
  const manual = await api.ana.post(`/api/clients/${C.uniquex}/payments`, { concept: 'Hosting anual', amount: 60_000_00, due_date: '2026-11-30', project_id: P.uniquex });
  assert.equal(manual.status, 200, JSON.stringify(manual.data));
  assert.equal(manual.data.payment.status, 'pendiente');
  const received = await api.ana.post(`/api/clients/${C.uniquex}/payments`, { concept: 'Anticipo 50 %', amount: 309_000_00, paid_date: '2026-10-09', reference: 'SINPE 77' });
  assert.equal(received.data.payment.status, 'pagado');

  // Deshacer un pago registrado por error exige motivo y lo devuelve a "por pagar".
  assert.equal((await api.ana.post(`/api/client-payments/${received.data.payment.id}/reopen`, {})).status, 400);
  const reopened = await api.ana.post(`/api/client-payments/${received.data.payment.id}/reopen`, { reason: 'Era de otro cliente' });
  assert.equal(reopened.data.payment.status, 'pendiente');
  assert.equal(reopened.data.payment.reference, null);

  // "Cómo pagar": lo define el admin y lo ve el cliente.
  assert.equal((await api.ana.patch('/api/settings', { payment_info: 'SINPE' })).status, 403);
  assert.equal((await api.admin.patch('/api/settings', { payment_info: 'SINPE Móvil 8888-0000 a nombre de JC Analytics' })).status, 200);
  const account = (await owner.get('/api/client/payments')).data;
  assert.equal(account.payment_info, 'SINPE Móvil 8888-0000 a nombre de JC Analytics');

  // La ficha del cliente trae todo para el equipo (con permiso de cobro solo para socios/admin).
  const sheet = await api.cata.get(`/api/clients/${C.uniquex}`);
  assert.equal(sheet.data.portal.can_bill, false);
  assert.ok(sheet.data.portal.requests.length >= 1);
  assert.ok(sheet.data.portal.billing.payments.length >= 2);
  assert.equal((await api.ana.get(`/api/clients/${C.uniquex}`)).data.portal.can_bill, true);

  // Una cuenta de cliente no entra a las rutas del equipo.
  assert.equal((await owner.get(`/api/clients/${C.uniquex}/payments`)).status, 401);
  assert.equal((await owner.post(`/api/client-payments/${manual.data.payment.id}/pay`, {})).status, 401);
});

test('inicio del cliente: resume actualizaciones abiertas y pagos', async () => {
  const owner = await clientAccount(C.burrada, 'inicio@burrada.cr');
  const overview = (await owner.get('/api/client/overview')).data;
  assert.ok('quotes_to_decide' in overview.kpis);
  assert.ok('payments_pending' in overview.kpis);
  assert.ok(Array.isArray(overview.requests));
  assert.equal(typeof overview.payments.pending_count, 'number');
});

// Va al final: adelanta el reloj un mes.
test('pagos: los cobros programados generan pendientes desde que se registran, sin deuda vieja', async () => {
  let owner = await clientAccount(C.burrada, 'pagos@burrada.cr');
  // Mensualidad que "empezó" hace dos meses: lo anterior a hoy no se le cobra en el portal.
  const created = await api.ana.post(`/api/projects/${P.burrada}/charges`, { concept: 'Mantenimiento y hosting', amount: 45_000_00, frequency: 'mensual', start_date: '2026-08-10' });
  assert.equal(created.status, 200, JSON.stringify(created.data));
  const chargeId = created.data.charge.id;
  let account = (await owner.get('/api/client/payments')).data;
  const scheduled = () => account.payments.filter((p) => p.source === 'programado');
  assert.equal(scheduled().length, 1, 'solo la fecha de hoy (10 oct) entra; agosto y septiembre no');
  assert.equal(scheduled()[0].due_date, '2026-10-10');
  assert.equal(account.upcoming[0].date, '2026-11-10', 'el próximo cobro se anuncia');

  // Pasa un mes: aparece noviembre, una sola vez aunque se consulte varias veces.
  // (Las sesiones vencen por inactividad: se vuelve a entrar.)
  env.clock.t += 31 * DAY; // 10 de noviembre
  api = { admin: await as('jeyrell@jc.test'), ana: await as('ana@jc.test'), cata: await as('cata@jc.test') };
  owner = env.client();
  assert.equal((await owner.post('/api/client/auth/login', { email: 'pagos@burrada.cr', password: NEW_PASSWORD })).status, 200);
  await owner.get('/api/client/payments');
  account = (await owner.get('/api/client/payments')).data;
  assert.deepEqual(scheduled().map((p) => p.due_date).sort(), ['2026-10-10', '2026-11-10']);
  assert.equal(account.summary.overdue_count, 1, 'octubre ya venció');
  assert.equal((await owner.get('/api/client/counts')).data.payments_overdue, 1);

  // El equipo ve el vencido en su inicio.
  const dash = await api.admin.get('/api/dashboard');
  assert.ok(dash.data.alerts.some((a) => a.kind === 'billing' && a.link.includes('portal=pagos')));

  // Se paga octubre; se edita el cobro (nuevo monto): lo pendiente sigue al calendario nuevo, lo pagado no cambia.
  const oct = scheduled().find((p) => p.due_date === '2026-10-10');
  assert.equal((await api.ana.post(`/api/client-payments/${oct.id}/pay`, { reference: 'SINPE 9' })).status, 200);
  const nov = scheduled().find((p) => p.due_date === '2026-11-10');
  assert.equal((await api.ana.patch(`/api/client-payments/${nov.id}`, { due_date: '2026-11-15' })).status, 400, 'la fecha de un programado sale del cobro');
  await api.ana.patch(`/api/charges/${chargeId}`, { amount: 50_000_00 });
  account = (await owner.get('/api/client/payments')).data;
  const byDate = Object.fromEntries(scheduled().map((p) => [p.due_date, p]));
  assert.equal(byDate['2026-10-10'].amount, 45_000_00);
  assert.equal(byDate['2026-10-10'].status, 'pagado');
  assert.equal(byDate['2026-11-10'].amount, 50_000_00);
  assert.equal(byDate['2026-11-10'].status, 'pendiente');

  // Anular exige motivo y el cliente deja de verlo; no reaparece al volver a consultar.
  assert.equal((await api.ana.post(`/api/client-payments/${byDate['2026-11-10'].id}/void`, {})).status, 400);
  assert.equal((await api.ana.post(`/api/client-payments/${byDate['2026-11-10'].id}/void`, { reason: 'Se le regaló noviembre' })).status, 200);
  account = (await owner.get('/api/client/payments')).data;
  assert.equal(scheduled().filter((p) => p.due_date === '2026-11-10').length, 0);
  const team = (await api.cata.get(`/api/clients/${C.burrada}/payments`)).data;
  assert.equal(team.payments.find((p) => p.due_date === '2026-11-10' && p.charge_id === chargeId).status, 'anulado', 'el equipo sí ve el anulado');

  // Borrar el cobro programado: lo pagado queda como historial.
  assert.equal((await api.ana.del(`/api/charges/${chargeId}`)).status, 200);
  account = (await owner.get('/api/client/payments')).data;
  assert.ok(account.payments.some((p) => p.reference === 'SINPE 9' && p.status === 'pagado'));
  assert.equal(account.upcoming.length, 0);
});
