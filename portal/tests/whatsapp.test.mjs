// WhatsApp (docs/whatsapp.md): motor de conversación, lectura y firma del
// webhook, vínculo opt-in con código, cola de avisos (horario, ventana de 24 h,
// reintentos, permiso), humano en el bucle y aislamiento entre clientes.
// Todo sin red: el transporte de Meta es un doble que registra cada envío.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { startServer, PASSWORD } from './helpers.mjs';
import { hashPassword } from '../server/auth.mjs';
import {
  normalize, respond, readState, parseLinkCode, optIntent, groupBubbles, typingDelay, BUTTONS_CLIENT,
} from '../server/whatsapp/bot.mjs';
import { parseWebhook } from '../server/whatsapp/webhook.mjs';
import { signatureValid, verifyToken, createWhatsAppTransport, missingConfig } from '../server/whatsapp/meta.mjs';
import { normalizeWaPhone, formatWaPhone } from '../shared/whatsapp.js';

const SECRET = 'secreto-de-la-app-de-meta-para-pruebas-0123456789';
const HOUR = 3_600_000;

/** Transporte falso con la misma forma que server/whatsapp/meta.mjs. */
function fakeWhatsApp({ outbound = true } = {}) {
  const sent = [];
  let n = 0;
  let failNext = null;
  const record = (kind, to, payload) => {
    if (failNext) { const e = failNext; failNext = null; return Promise.reject(e); }
    sent.push({ kind, to, ...payload });
    n += 1;
    return Promise.resolve({ id: `wamid.out${n}` });
  };
  return {
    outbound, lang: 'es', displayNumber: '50670330596', secret: SECRET, verifyToken: 'token-de-verificacion-de-pruebas-123',
    sent,
    failWith(error) { failNext = error; },
    sendText: (to, body) => record('text', to, { body }),
    sendOptions: (to, body, options) => record('options', to, { body, options }),
    sendTemplate: (to, name, variables) => record('template', to, { name, variables }),
    markRead: () => Promise.resolve(),
    phoneStatus: () => Promise.resolve({ ok: true, can_send: true, display_phone_number: '+506 7033 0596' }),
  };
}

const facts = (extra = {}) => ({
  linked: true, name: 'Laura Mora', clientName: 'La Burrada', ownerName: 'Catalina Rojas', canApprove: true,
  projects: [{ name: 'Pedidos en línea', status_label: 'En curso', milestones_total: 4, milestones_done: 2, next_milestone: 'Pruebas en celulares' }],
  toApprove: [{ title: 'Menú digital v2', project_name: 'Pedidos en línea' }],
  meetings: [{ title: 'Demo de pedidos', starts_at: '2026-10-14T16:00:00.000Z', meeting_url: 'https://meet.example/x' }],
  ...extra,
});
const NOON = Date.parse('2026-10-10T18:00:00Z'); // 12:00 en Costa Rica
const say = (state, text, f = facts(), now = NOON) => respond(state, { text }, { now, facts: f, rand: () => 0 });

// ── Motor ───────────────────────────────────────────────────────────────────

test('normaliza abreviaturas y faltas sin cambiar palabras protegidas', () => {
  assert.equal(normalize('Ola, q tal? como va mi proyecto'), ' hola que tal como va mi proyecto ');
  assert.match(normalize('quiero ver mis entregbles'), / entregables /);
  assert.match(normalize('las personas del equipo'), / personas /);
  assert.equal(normalize('¡¡¡'), ' ');
});

test('saluda según la hora con el menú y no contesta un simple "ok"', () => {
  const first = say({}, 'hola');
  assert.match(first.replies[0].text, /^Buenas tardes, Laura\. Soy el asistente de JC Analytics para La Burrada\./);
  assert.deepEqual(first.replies.at(-1).buttons, BUTTONS_CLIENT);
  assert.ok(BUTTONS_CLIENT.every((b) => b.length <= 20));
  assert.match(say({}, 'buenas', facts(), Date.parse('2026-10-10T13:00:00Z')).replies[0].text, /^Buenos días/);
  assert.equal(say(first.state, 'ok').replies.length, 0);
  assert.equal(say(first.state, 'Listo').replies.length, 0);
});

test('cuenta proyectos, entregables y reuniones con datos del portal', () => {
  const s = say({}, 'hola').state;
  const projects = say(s, 'como va mi proyecto?');
  assert.match(projects.replies[0].text, /Pedidos en línea: En curso, 2 de 4 etapas\. Sigue: Pruebas en celulares\./);
  assert.match(say(s, 'que tengo por aprobar').replies[0].text, /1 entregable espera tu revisión:\n• Menú digital v2 \(Pedidos en línea\)/);
  assert.match(say(s, 'cuando es la reu').replies[0].text, /Tu próxima reunión:\n• Demo de pedidos: miércoles, 14 de octubre, 10:00 a\. m\. \(en línea\)$/);
  assert.match(say(s, 'reuniones', facts({ meetings: [] })).replies[0].text, /No hay reuniones agendadas/);
});

test('un número sin vincular no recibe datos de proyectos', () => {
  const r = say({ greeted: true }, 'estado de mi proyecto', { linked: false, name: 'Desconocido' });
  assert.match(r.replies[0].text, /Activalo desde tu portal de clientes/);
  assert.ok(!r.replies.some((x) => /Pedidos/.test(x.text)));
});

test('pedir una persona: pregunta el motivo de uno en uno y pasa el caso', () => {
  const s = say({}, 'hola').state;
  const ask = say(s, 'quiero hablar con alguien');
  assert.equal(ask.state.step, 'motivo');
  assert.equal(ask.handoff, undefined);
  assert.match(ask.replies[0].text, /Catalina/);
  const ok = say(ask.state, 'ok');
  assert.equal(ok.handoff, undefined, '"ok" no es el motivo');
  const done = say(ask.state, 'Necesito cambiar el logo del menú');
  assert.equal(done.handoff.reason, 'persona');
  assert.equal(done.handoff.summary, 'Necesito cambiar el logo del menú');
  assert.equal(done.state.step, null);
  // Con el motivo en el mismo mensaje, pasa directo.
  assert.equal(say(s, 'necesito hablar con alguien sobre el cambio de horario del local').handoff.reason, 'persona');
});

test('urgencias, quejas, pagos y adjuntos van al equipo; la negación no es urgencia', () => {
  const s = { greeted: true };
  const urgent = say(s, 'URGENTE la página se cayó');
  assert.equal(urgent.handoff.urgent, true);
  assert.equal(urgent.handoff.reason, 'urgente');
  assert.equal(say(s, 'no tengo ningún problema, todo bien').handoff, undefined);
  assert.equal(say(s, 'pésimo servicio, nadie me responde').handoff.reason, 'queja');
  assert.equal(say(s, 'ya hice el sinpe de la factura').handoff.reason, 'pagos');
  const photo = respond(s, { text: 'este es el logo', media: { type: 'IMAGEN' } }, { now: NOON, facts: facts(), rand: () => 0 });
  assert.equal(photo.handoff.reason, 'adjunto');
  assert.match(photo.handoff.summary, /una foto: este es el logo/);
});

test('es honesto si le preguntan si es un bot, y a la segunda vez sin entender pasa a una persona', () => {
  const s = { greeted: true };
  assert.match(say(s, '¿sos un bot?').replies[0].text, /Soy el asistente automático/);
  const first = say(s, 'xyzzy plugh');
  assert.equal(first.notUnderstood, true);
  assert.equal(first.handoff, undefined);
  const second = say(first.state, 'qwerty asdf');
  assert.equal(second.handoff.reason, 'no_entendio');
});

test('estado guardado validado campo por campo; máximo dos burbujas; tiempos acotados', () => {
  const st = readState('{"step":"hackeo","fails":99,"greeted":true,"last":{"__proto__":"x","cierre":"hola","MAL":"y"}}');
  assert.equal(st.step, null);
  assert.equal(st.fails, 0);
  assert.deepEqual(Object.keys(st.last), ['cierre']);
  assert.deepEqual(readState('no es json'), { step: null, fails: 0, greeted: false, last: {} });
  const grouped = groupBubbles([{ text: 'a' }, { text: 'b  c' }, { text: 'd', buttons: ['x'] }]);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].text, 'a\n\nb c');
  assert.deepEqual(grouped[1].buttons, ['x']);
  assert.ok(typingDelay('x'.repeat(5000), () => 1) <= 8000);
  assert.ok(typingDelay('', () => 0) >= 2000);
});

test('reconoce el código de activación y los pedidos de avisos', () => {
  assert.equal(parseLinkCode('ACTIVAR k7q4m2'), 'K7Q4M2');
  assert.equal(parseLinkCode('activar K7Q4M'), null);
  assert.equal(parseLinkCode('quiero activar los avisos'), null);
  assert.equal(optIntent('AVISOS NO'), 'out');
  assert.equal(optIntent('avisos sí'), 'in');
  assert.equal(optIntent('no quiero avisos'), 'out');
  assert.equal(optIntent('no sé'), null);
});

// ── Webhook y Graph API ─────────────────────────────────────────────────────

const waPayload = (messages, { contacts = [], statuses } = {}) => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: { contacts, messages, ...(statuses ? { statuses } : {}) } }] }],
});

test('lee texto, botones, listas, adjuntos y estados; ignora sistema y JSON raro', () => {
  const parsed = parseWebhook(waPayload([
    { from: '50688887777', id: 'wamid.1', type: 'text', text: { body: 'hola' } },
    { from: '50688887777', id: 'wamid.2', type: 'interactive', interactive: { button_reply: { title: 'Mis proyectos' } } },
    { from: '50688887777', id: 'wamid.3', type: 'interactive', interactive: { list_reply: { title: 'Reuniones' } } },
    { from: '50688887777', id: 'wamid.4', type: 'image', image: { id: '123456', mime_type: 'image/jpeg', caption: 'logo' } },
    { from: '16505551111', id: 'wamid.5', type: 'text', text: { body: 'aviso de WhatsApp' } },
    { from: '50688887777', id: 'wamid.6', type: 'system', system: {} },
    { from: '50688887777', id: 'wamid.7', type: 'reaction', reaction: {} },
    { from: 'evil', id: 'wamid.8', type: 'text', text: { body: 'x' } },
  ], { contacts: [{ wa_id: '50688887777', profile: { name: 'Laura' } }], statuses: [{ id: 'wamid.out1', status: 'failed', errors: [{ code: 131026, title: 'Undeliverable' }] }] }));
  assert.deepEqual(parsed.messages.map((m) => m.text), ['hola', 'Mis proyectos', 'Reuniones', 'logo']);
  assert.equal(parsed.messages[0].name, 'Laura');
  assert.deepEqual(parsed.messages[3].media, { type: 'IMAGEN', id: '123456', mime: 'image/jpeg', filename: null });
  assert.deepEqual(parsed.statuses, [{ externalId: 'wamid.out1', status: 'failed', error: '131026 Undeliverable' }]);
  for (const junk of [null, 'x', [], { object: 'page' }, { object: 'whatsapp_business_account', entry: 'x' }, { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { messages: [null, 5] } }] }] }]) {
    assert.deepEqual(parseWebhook(junk), { messages: [], statuses: [] });
  }
});

test('firma HMAC, token de verificación derivado y variables faltantes', () => {
  const body = Buffer.from('{"a":1}');
  const good = `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;
  assert.equal(signatureValid(body, good, SECRET), true);
  assert.equal(signatureValid(body, good.toUpperCase().replace('SHA256', 'sha256'), SECRET), true);
  assert.equal(signatureValid(Buffer.from('{"a":2}'), good, SECRET), false);
  assert.equal(signatureValid(body, 'sha256=abc', SECRET), false);
  assert.equal(signatureValid(body, null, SECRET), false);
  const env = { META_APP_SECRET: SECRET };
  assert.equal(verifyToken(env), verifyToken(env));
  assert.equal(verifyToken(env).length, 40);
  assert.equal(verifyToken({ META_APP_SECRET: 'corto' }), null);
  assert.equal(verifyToken({ ...env, META_VERIFY_TOKEN: 'propio-de-al-menos-24-caracteres' }), 'propio-de-al-menos-24-caracteres');
  assert.deepEqual(missingConfig({}), ['META_APP_SECRET', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']);
  assert.equal(createWhatsAppTransport({ env: {} }), null);
});

test('el transporte arma los mensajes de Meta y limpia secretos y números de los errores', async () => {
  const calls = [];
  const token = 'EAAG-token-permanente-secreto';
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : null, auth: init.headers.authorization });
    if (url.includes('fail')) return new Response(JSON.stringify({ error: { code: 131030, message: `Recipient 50688887777 not allowed for ${token}` } }), { status: 400 });
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.ok' }] }), { status: 200 });
  };
  const t = createWhatsAppTransport({ env: { META_APP_SECRET: SECRET, WHATSAPP_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: '1234567890', WHATSAPP_AVISOS: 'activos' }, fetchImpl });
  assert.equal(t.outbound, true);
  assert.deepEqual(await t.sendText('50688887777', 'hola'), { id: 'wamid.ok' });
  await t.sendOptions('50688887777', 'Elegí', ['Uno', 'Dos']);
  await t.sendOptions('50688887777', 'Elegí', BUTTONS_CLIENT);
  await t.sendTemplate('50688887777', 'jc_aviso_portal', ['Laura', 'Nuevo avance']);
  assert.equal(calls[0].auth, `Bearer ${token}`);
  assert.match(calls[0].url, /\/v23\.0\/1234567890\/messages$/);
  assert.equal(calls[1].body.interactive.type, 'button');
  assert.equal(calls[2].body.interactive.type, 'list');
  assert.deepEqual(calls[3].body.template, { name: 'jc_aviso_portal', language: { code: 'es' }, components: [{ type: 'body', parameters: [{ type: 'text', text: 'Laura' }, { type: 'text', text: 'Nuevo avance' }] }] });
  const bad = createWhatsAppTransport({ env: { META_APP_SECRET: SECRET, WHATSAPP_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: 'fail' }, fetchImpl });
  await assert.rejects(bad.sendText('50688887777', 'x'), (error) => {
    assert.equal(error.transient, false);
    assert.ok(!error.message.includes(token) && !error.message.includes('50688887777'), error.message);
    return true;
  });
});

test('teléfonos: formato wa_id de Costa Rica', () => {
  assert.equal(normalizeWaPhone('8888-7777'), '50688887777');
  assert.equal(normalizeWaPhone('+506 8888 7777'), '50688887777');
  assert.equal(normalizeWaPhone('123'), null);
  assert.equal(formatWaPhone('50688887777'), '+506 8888-7777');
});

// ── Integración con el portal ───────────────────────────────────────────────

let env;
let wa;
const ids = {};
const api = {};
const C = {};
const P = {};
const LAURA_WA = '50688887777';
const MARIO_WA = '50677776666';
let inbound = 0;

async function clientLogin(email) {
  const c = env.client();
  const r = await c.call('POST', '/api/client/auth/login', { email, password: PASSWORD });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return c;
}

const msg = (waId, text, extra = {}) => env.ctx.wa.handleInbound({ waId, externalId: `wamid.in${++inbound}`, name: null, text, media: null, ...extra });
const lastSent = () => wa.sent.at(-1);
const sentTo = (waId) => wa.sent.filter((s) => s.to === waId);

before(async () => {
  wa = fakeWhatsApp();
  env = await startServer({ whatsapp: wa }); // 2026-10-10 09:00 en Costa Rica
  ids.admin = env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin');
  ids.cata = env.addUser('cata@jc.test', 'Catalina Rojas', 'colaborador');
  ids.hil = env.addUser('hil@jc.test', 'Hillary', 'colaborador');
  for (const [k, email] of [['admin', 'jeyrell@jc.test'], ['cata', 'cata@jc.test'], ['hil', 'hil@jc.test']]) {
    api[k] = env.client();
    await api[k].login(email);
  }
  C.burrada = (await api.admin.post('/api/clients', { name: 'La Burrada', owner_id: ids.cata })).data.client.id;
  C.uniquex = (await api.admin.post('/api/clients', { name: 'Uniquex', owner_id: ids.admin })).data.client.id;
  P.burrada = (await api.admin.post('/api/projects', { name: 'Pedidos en línea', client_id: C.burrada, kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: ids.cata })).data.project.id;
  P.uniquex = (await api.admin.post('/api/projects', { name: 'Landing secreta Uniquex', client_id: C.uniquex, kind: 'cliente', service: 'pagina_web', status: 'en_curso', owner_id: ids.admin })).data.project.id;
  const hash = await hashPassword(PASSWORD);
  const account = (clientId, email, name) => Number(env.db.prepare(`INSERT INTO client_accounts (client_id, email, name, password_hash, must_change_password, active, created_at)
    VALUES (?, ?, ?, ?, 0, 1, ?)`).run(clientId, email, name, hash, new Date(env.clock.t).toISOString()).lastInsertRowid);
  ids.laura = account(C.burrada, 'laura@burrada.test', 'Laura Mora');
  ids.mario = account(C.uniquex, 'mario@uniquex.test', 'Mario Vargas');
  api.laura = await clientLogin('laura@burrada.test');
  api.mario = await clientLogin('mario@uniquex.test');
});
after(() => env.close());

async function link(c, waId) {
  const r = await c.post('/api/client/whatsapp/link');
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.match(r.data.link.link, /^https:\/\/wa\.me\/50670330596\?text=ACTIVAR%20[A-Z2-9]{6}$/);
  await msg(waId, r.data.link.text);
  return r.data.link.code;
}

test('vínculo opt-in: el cliente activa los avisos enviando el código desde su WhatsApp', async () => {
  const before = await api.laura.get('/api/client/whatsapp');
  assert.deepEqual({ ...before.data.whatsapp, linked_at: null }, { available: true, linked: false, opt_in: false, linked_at: null, phone: null, number: '+506 7033-0596' });

  // Un código inventado no vincula nada.
  await msg(LAURA_WA, 'ACTIVAR ZZZZZZ');
  assert.match(lastSent().body, /no coincide o ya venció/);
  assert.equal(env.db.prepare('SELECT wa_id FROM client_accounts WHERE id = ?').get(ids.laura).wa_id, null);

  await link(api.laura, LAURA_WA);
  assert.match(sentTo(LAURA_WA).at(-2).body, /^Listo, Laura\. Este número quedó vinculado a La Burrada/);
  const after = (await api.laura.get('/api/client/whatsapp')).data.whatsapp;
  assert.equal(after.linked, true);
  assert.equal(after.opt_in, true);
  assert.equal(after.phone, '•••• 7777');
  // El código es de un solo uso.
  const reused = env.db.prepare('SELECT wa_code_hash FROM client_accounts WHERE id = ?').get(ids.laura);
  assert.equal(reused.wa_code_hash, null);
  // El equipo ve el estado en la ficha, sin el número completo.
  const accounts = (await api.cata.get(`/api/clients/${C.burrada}/accounts`)).data.accounts;
  assert.equal(accounts[0].wa_opt_in, true);
  assert.ok(!JSON.stringify(accounts).includes(LAURA_WA));

  await link(api.mario, MARIO_WA);
});

test('el asistente contesta con los datos de SU empresa, nunca los de otro cliente', async () => {
  await msg(LAURA_WA, 'como van mis proyectos');
  const laura = sentTo(LAURA_WA).slice(-2).map((s) => s.body).join('\n');
  assert.match(laura, /Pedidos en línea: En desarrollo/);
  assert.ok(!laura.includes('Uniquex'));
  await msg(MARIO_WA, 'estado del proyecto');
  const mario = sentTo(MARIO_WA).slice(-2).map((s) => s.body).join('\n');
  assert.match(mario, /Landing secreta Uniquex/);
  assert.ok(!mario.includes('Pedidos en línea'));
  // Un número desconocido no ve proyectos.
  await msg('50611112222', 'hola');
  await msg('50611112222', 'mis proyectos');
  assert.match(sentTo('50611112222').at(-2).body, /necesito saber que este número es tuyo/);
});

test('un webhook reenviado por Meta no se contesta dos veces', async () => {
  const n = wa.sent.length;
  const m = { waId: LAURA_WA, externalId: 'wamid.repetido', name: null, text: 'reuniones', media: null };
  assert.equal(await env.ctx.wa.handleInbound(m), 'answered');
  const after = wa.sent.length;
  assert.ok(after > n);
  assert.equal(await env.ctx.wa.handleInbound(m), 'duplicate');
  assert.equal(wa.sent.length, after);
});

test('avisos del portal salen por WhatsApp: plantilla fuera de la ventana de 24 h, texto dentro', async () => {
  // Mario escribió hace un rato: ventana abierta → texto. Laura: se cierra su ventana adelantando el reloj.
  env.db.prepare('UPDATE wa_conversations SET last_client_at = ? WHERE wa_id = ?').run(new Date(env.clock.t - 30 * HOUR).toISOString(), LAURA_WA);
  const r = await api.cata.post(`/api/projects/${P.burrada}/updates`, { channel: 'whatsapp', note: 'Ya quedó el carrito en pruebas.' });
  assert.equal(r.status, 200);
  const row = env.db.prepare("SELECT * FROM wa_outbox WHERE account_id = ? AND kind = 'avance'").get(ids.laura);
  assert.equal(row.status, 'pendiente');
  assert.equal(row.template, 'jc_aviso_portal');
  assert.deepEqual(JSON.parse(row.variables), ['Laura', 'Nuevo avance en Pedidos en línea']);
  // La misma notificación no entra dos veces.
  env.ctx.wa.onClientNotifications([{ accountId: ids.laura, notificationId: row.ref_id, kind: 'avance', title: 'x' }]);
  assert.equal(env.db.prepare("SELECT COUNT(*) n FROM wa_outbox WHERE account_id = ? AND kind = 'avance'").get(ids.laura).n, 1);

  const result = await env.ctx.wa.dispatch();
  assert.equal(result.sent, 1);
  const tpl = lastSent();
  assert.deepEqual({ kind: tpl.kind, to: tpl.to, name: tpl.name }, { kind: 'template', to: LAURA_WA, name: 'jc_aviso_portal' });
  assert.equal(env.db.prepare('SELECT status FROM wa_outbox WHERE id = ?').get(row.id).status, 'enviado');

  // Con la ventana abierta, el aviso del equipo va como texto libre.
  const ann = await api.admin.post(`/api/clients/${C.uniquex}/announce`, { title: 'Cambio de fecha', text: 'Movimos la entrega al jueves.' });
  assert.deepEqual({ accounts: ann.data.accounts, whatsapp: ann.data.whatsapp }, { accounts: 1, whatsapp: 1 });
  await env.ctx.wa.dispatch();
  assert.deepEqual({ kind: lastSent().kind, to: lastSent().to }, { kind: 'text', to: MARIO_WA });
  assert.match(lastSent().body, /Movimos la entrega al jueves/);
  // El aviso también quedó en su portal.
  const notes = (await api.mario.get('/api/client/notifications')).data.notifications;
  assert.equal(notes[0].kind, 'aviso');
});

test('solo admin, socios o quien lleva la cuenta envían avisos a un cliente', async () => {
  const r = await api.hil.post(`/api/clients/${C.burrada}/announce`, { title: 'Hola', text: 'Prueba de permiso' });
  assert.equal(r.status, 403);
  assert.equal((await api.cata.post(`/api/clients/${C.burrada}/announce`, { title: 'x', text: 'corto' })).status, 400);
});

test('fuera del horario de 07:00–20:00 el aviso espera a la mañana (salvo urgente)', async () => {
  // Directo al servicio: adelantar el reloj 13 h vencería las sesiones de las demás pruebas.
  const saved = env.clock.t;
  try {
    env.clock.t = Date.parse('2026-10-11T04:00:00Z'); // 22:00 en Costa Rica
    assert.equal(env.ctx.wa.enqueue({ key: 'prueba:noche', kind: 'aviso', accountId: ids.laura, variables: ['Laura', 'x'], textBody: 'x' }), true);
    const row = env.db.prepare("SELECT * FROM wa_outbox WHERE dedupe_key = 'prueba:noche'").get();
    assert.equal(row.scheduled_for, '2026-10-11T13:00:00.000Z'); // 07:00 del día siguiente
    assert.equal((await env.ctx.wa.dispatch()).sent, 0);
    env.clock.t = Date.parse('2026-10-11T13:00:30Z');
    assert.equal((await env.ctx.wa.dispatch()).sent, 1);
    assert.equal(env.ctx.wa.scheduleFor(true, Date.parse('2026-10-11T04:00:00Z')), '2026-10-11T04:00:00.000Z');
    assert.equal(env.ctx.wa.scheduleFor(false, Date.parse('2026-10-11T12:59:00Z')), '2026-10-11T13:00:00.000Z');
  } finally {
    env.clock.t = saved;
  }
});

test('reintenta errores transitorios, marca fallidos los permanentes y permite reintentar desde el panel', async () => {
  const enqueue = (key) => env.ctx.wa.enqueue({ key, kind: 'aviso', accountId: ids.mario, variables: ['Mario', 'x'], textBody: 'Hola Mario' });
  assert.equal(enqueue('prueba:transitorio'), true);
  wa.failWith(Object.assign(new Error('Meta no respondió en 10 s'), { transient: true }));
  assert.equal((await env.ctx.wa.dispatch()).retried, 1);
  let row = env.db.prepare("SELECT * FROM wa_outbox WHERE dedupe_key = 'prueba:transitorio'").get();
  assert.deepEqual({ status: row.status, attempts: row.attempts }, { status: 'pendiente', attempts: 1 });
  assert.ok(row.scheduled_for > new Date(env.clock.t).toISOString());

  assert.equal(enqueue('prueba:permanente'), true);
  wa.failWith(Object.assign(new Error('(#131026) Message undeliverable'), { transient: false }));
  assert.equal((await env.ctx.wa.dispatch()).failed, 1);
  row = env.db.prepare("SELECT * FROM wa_outbox WHERE dedupe_key = 'prueba:permanente'").get();
  assert.equal(row.status, 'fallido');
  assert.match(row.reason, /undeliverable/);

  const list = await api.cata.get('/api/whatsapp/outbox?status=fallido');
  assert.equal(list.data.items[0].phone, '•••• 6666');
  assert.ok(!JSON.stringify(list.data).includes(MARIO_WA));
  assert.equal((await api.cata.post(`/api/whatsapp/outbox/${row.id}/retry`)).status, 200);
  assert.equal((await api.cata.post(`/api/whatsapp/outbox/${row.id}/retry`)).status, 409);
  assert.equal((await env.ctx.wa.dispatch()).sent, 1);
});

test('AVISOS NO pausa los avisos: lo que estaba en cola se omite al re-chequear el permiso', async () => {
  assert.equal(env.ctx.wa.enqueue({ key: 'prueba:optout', kind: 'aviso', accountId: ids.mario, variables: ['Mario', 'x'], textBody: 'x' }), true);
  await msg(MARIO_WA, 'AVISOS NO');
  assert.match(lastSent().body, /ya no te vamos a enviar avisos/);
  await env.ctx.wa.dispatch();
  const row = env.db.prepare("SELECT * FROM wa_outbox WHERE dedupe_key = 'prueba:optout'").get();
  assert.equal(row.status, 'omitido');
  assert.equal(env.ctx.wa.enqueue({ key: 'prueba:optout2', kind: 'aviso', accountId: ids.mario, variables: ['Mario', 'x'], textBody: 'x' }), false);
  // Desde su portal la vuelve a encender.
  const on = await api.mario.patch('/api/client/whatsapp', { opt_in: true });
  assert.equal(on.data.whatsapp.opt_in, true);
});

test('humano en el bucle: pasar a una persona avisa al equipo y el asistente se calla', async () => {
  await msg(LAURA_WA, 'quiero hablar con alguien');
  await msg(LAURA_WA, 'Necesito cambiar los precios del menú');
  const conv = env.db.prepare('SELECT * FROM wa_conversations WHERE wa_id = ?').get(LAURA_WA);
  assert.equal(conv.pending, 1);
  assert.equal(conv.reason, 'persona');
  assert.ok(Date.parse(conv.paused_until) > env.clock.t);
  // El aviso llega a quien lleva la cuenta (Catalina), con enlace a la conversación.
  const notif = env.db.prepare("SELECT * FROM notifications WHERE user_id = ? AND kind = 'whatsapp' ORDER BY id DESC").get(ids.cata);
  assert.match(notif.title, /Laura Mora \(La Burrada\)/);
  assert.equal(notif.link, `/whatsapp/${conv.id}`);

  // Mientras el caso está con el equipo, el asistente no contesta.
  const n = wa.sent.length;
  assert.equal(await msg(LAURA_WA, '¿hola?'), 'held');
  assert.equal(wa.sent.length, n);

  const tray = (await api.cata.get('/api/whatsapp/conversations?tray=atender')).data;
  assert.ok(tray.conversations.some((c) => c.id === conv.id && c.account.client_name === 'La Burrada'));
  const detail = (await api.cata.get(`/api/whatsapp/conversations/${conv.id}`)).data;
  assert.ok(detail.messages.some((m) => m.origin === 'aviso' && /precios del menú/.test(m.body)));

  // El equipo contesta desde el panel: sale como texto y la conversación queda atendida.
  const reply = await api.cata.post(`/api/whatsapp/conversations/${conv.id}/reply`, { text: 'Hola Laura, te ayudo con eso.' });
  assert.equal(reply.status, 200, JSON.stringify(reply.data));
  assert.deepEqual({ to: lastSent().to, body: lastSent().body }, { to: LAURA_WA, body: 'Hola Laura, te ayudo con eso.' });
  const after = env.db.prepare('SELECT pending, attended_at FROM wa_conversations WHERE id = ?').get(conv.id);
  assert.equal(after.pending, 0);
  assert.ok(after.attended_at);

  // Tomar el control: el asistente no contesta aunque venza la pausa; devolverlo lo reactiva.
  await api.cata.post(`/api/whatsapp/conversations/${conv.id}/control`, { mode: 'equipo' });
  env.clock.t += 2 * HOUR;
  assert.equal(await msg(LAURA_WA, 'mis proyectos'), 'held');
  await api.cata.post(`/api/whatsapp/conversations/${conv.id}/control`, { mode: 'asistente' });
  assert.equal(await msg(LAURA_WA, 'mis proyectos'), 'answered');
});

test('fuera de las 24 h el panel no deja escribir texto libre', async () => {
  const conv = env.db.prepare('SELECT id FROM wa_conversations WHERE wa_id = ?').get(MARIO_WA);
  env.db.prepare('UPDATE wa_conversations SET last_client_at = ? WHERE id = ?').run(new Date(env.clock.t - 25 * HOUR).toISOString(), conv.id);
  const r = await api.cata.post(`/api/whatsapp/conversations/${conv.id}/reply`, { text: 'Hola' });
  assert.equal(r.status, 409);
  assert.equal(r.data.error, 'whatsapp_session_closed');
});

test('recordatorio de reunión al cliente; si se cancela, no sale', async () => {
  const startsAt = new Date(env.clock.t + 20 * HOUR).toISOString();
  const appt = (await api.cata.post('/api/appointments', {
    title: 'Demo del carrito', kind: 'demo', starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + HOUR).toISOString(), project_id: P.burrada,
  })).data.appointment;
  assert.ok(appt?.id);
  const internal = (await api.cata.post('/api/appointments', {
    title: 'Interna', kind: 'interna', starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + HOUR).toISOString(), project_id: P.burrada,
  })).data.appointment;
  assert.equal(env.ctx.wa.enqueueMeetingReminders(), 1, 'las reuniones internas no se recuerdan al cliente');
  assert.equal(env.ctx.wa.enqueueMeetingReminders(), 0, 'nunca dos veces');
  const row = env.db.prepare("SELECT * FROM wa_outbox WHERE kind = 'reunion'").get();
  assert.equal(row.template, 'jc_recordatorio_reunion');
  assert.equal(JSON.parse(row.variables)[1], 'Demo del carrito');
  assert.ok(internal.id);
  await api.cata.patch(`/api/appointments/${appt.id}`, { status: 'cancelada' });
  await env.ctx.wa.dispatch();
  assert.equal(env.db.prepare('SELECT status, reason FROM wa_outbox WHERE id = ?').get(row.id).status, 'omitido');
});

test('webhook HTTP: verificación GET, firma obligatoria y respuesta inmediata', async () => {
  const verify = await fetch(`${env.base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${wa.verifyToken}&hub.challenge=12345`);
  assert.equal(verify.status, 200);
  assert.equal(await verify.text(), '12345');
  assert.equal((await fetch(`${env.base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1`)).status, 403);

  const payload = JSON.stringify(waPayload([{ from: '50699990000', id: 'wamid.http1', type: 'text', text: { body: 'hola' } }], { contacts: [{ wa_id: '50699990000', profile: { name: 'Prospecto' } }] }));
  const post = (body, signature) => fetch(`${env.base}/webhooks/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json', ...(signature ? { 'x-hub-signature-256': signature } : {}) }, body });
  assert.equal((await post(payload)).status, 401);
  assert.equal((await post(payload, 'sha256=' + '0'.repeat(64))).status, 401);
  const ok = await post(payload, `sha256=${createHmac('sha256', SECRET).update(payload).digest('hex')}`);
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), 'EVENT_RECEIVED');
  for (let i = 0; i < 50 && !sentTo('50699990000').length; i += 1) await new Promise((r) => setTimeout(r, 20));
  assert.match(sentTo('50699990000')[0].body, /Soy el asistente de JC Analytics/);
  const big = 'x'.repeat(600 * 1024);
  assert.equal((await post(big, `sha256=${createHmac('sha256', SECRET).update(big).digest('hex')}`)).status, 413);
});

test('rutas del equipo cerradas para clientes y sin sesión', async () => {
  assert.equal((await api.laura.get('/api/whatsapp/conversations')).status, 401);
  assert.equal((await env.client().get('/api/whatsapp/status')).status, 401);
  assert.equal((await api.cata.get('/api/client/whatsapp')).status, 401);
  const status = (await api.cata.get('/api/whatsapp/status')).data;
  assert.equal(status.configured, true);
  assert.equal(status.counts.linked_accounts, 2);
  assert.ok(status.templates.some((t) => t.name === 'jc_recordatorio_reunion'));
});
