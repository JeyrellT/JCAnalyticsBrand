// Analítica avanzada del sitio: comparación con el periodo anterior, veredicto por página,
// mapa de horas, CTA por sección, embudo de consultas, recomendaciones (reglas puras),
// detalle por página y alertas de consultas en el inicio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startServer } from './helpers.mjs';
import { buildInsights, pageVerdict, pageLabel, PAGE_VERDICTS, LEAD_STATUS } from '../shared/leads.js';

let env;
let hillary;

/** Hora de Costa Rica (UTC−6) → ms. */
const cr = (date, hhmm) => Date.parse(`${date}T${hhmm}:00-06:00`);
const TODAY = '2026-10-20'; // martes
const NOW = cr(TODAY, '15:00');

before(async () => {
  env = await startServer({ startAt: NOW });
  env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin');
  env.addUser('hillary@jc.test', 'Hillary', 'colaborador');
  env.addUser('angel@jc.test', 'Ángel', 'inversionista');
  hillary = env.client();
  assert.equal((await hillary.login('hillary@jc.test')).status, 200);
  seed();
});
after(() => env.close());

const insert = (row) => env.db.prepare(`INSERT INTO site_events (day, at, session_id, visitor, type, path, section, target, label, value, source, campaign, device, language)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(row.day, row.at, row.sid, row.visitor ?? row.sid, row.type, row.path ?? '/', row.section ?? null, row.target ?? null, row.label ?? null, row.value ?? null, row.source ?? 'directo', row.campaign ?? null, row.device ?? 'mobile', row.language ?? 'es');
const dayAgo = (n) => env.ctx.today(-n);
/** Una visita completa: vista (+ opcionales) en el día `d` hacia atrás, a una hora dada de Costa Rica. */
function visit({ sid, d = 0, hhmm = '10:00', path = '/', device = 'mobile', source = 'directo', language = 'es', sections = [], scroll = [], clicks = [], lead = false }) {
  const day = dayAgo(d);
  const at = new Date(cr(day, hhmm)).toISOString();
  const base = { day, at, sid, path, device, source, language };
  insert({ ...base, type: 'view' });
  for (const [section, value] of sections) insert({ ...base, type: 'section', section, value });
  for (const value of scroll) insert({ ...base, type: 'scroll', value });
  for (const [target, section, label] of clicks) insert({ ...base, type: 'click', target, section, label: label ?? target });
  if (lead) insert({ ...base, type: 'lead', target: 'formulario' });
}

function seed() {
  // Periodo actual (7 días): 20 visitas en la portada…
  for (let i = 0; i < 20; i += 1) {
    visit({ sid: `homecur${String(i).padStart(11, '0')}`, d: i % 6, hhmm: i % 2 ? '19:30' : '08:15', device: i < 14 ? 'mobile' : 'desktop', source: i < 10 ? 'google' : 'meta',
      sections: [['top', 5000], ['paquetes', 70_000]], scroll: [25, 50], clicks: i < 2 ? [['whatsapp', 'oferta', 'Lo quiero']] : [], lead: i === 0 });
  }
  // …12 visitas a un servicio que nadie toca (mucho tráfico, poca acción)…
  for (let i = 0; i < 12; i += 1) {
    visit({ sid: `servcur${String(i).padStart(11, '0')}`, d: 1, hhmm: '19:30', path: '/servicios/automatizacion-de-procesos/', language: 'en', sections: [['fit', 12_000], ['calculadora', 50_000]], scroll: [25, 50, 75] });
  }
  // …y 3 visitas a otro servicio (pocos datos).
  for (let i = 0; i < 3; i += 1) visit({ sid: `tinycur${String(i).padStart(11, '0')}`, d: 2, path: '/servicios/integracion-ia-costa-rica/', sections: [['oferta', 3000]] });
  // Periodo anterior (días 7 a 13): 10 visitas.
  for (let i = 0; i < 10; i += 1) visit({ sid: `homeprev${String(i).padStart(10, '0')}`, d: 8, hhmm: '11:00', sections: [['top', 4000]], clicks: i < 5 ? [['whatsapp', 'top']] : [] });
  // Fuera de ambos periodos: no debe contar.
  visit({ sid: 'veryold00000000000', d: 40 });

  const leads = env.db.prepare(`INSERT INTO leads (status, channel, name, phone, need, page, source, session_id, contacted_at, created_at, updated_at)
    VALUES (?, 'formulario', ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const at = (hoursAgo) => new Date(NOW - hoursAgo * 3_600_000).toISOString();
  leads.run('nuevo', 'Sin atender', '8800-0001', 'Página web', '/', 'google', 'homecur00000000000', null, at(30), at(30));          // > 24 h sin respuesta
  leads.run('nuevo', 'Recién llegada', '8800-0002', 'Dashboard', '/servicios/dashboards-power-bi-costa-rica/', 'meta', null, null, at(2), at(2));
  leads.run('contactado', 'Rápida', '8800-0003', 'Página web', '/', 'google', null, at(47), at(48), at(47));       // 60 min a primer contacto
  leads.run('ganado', 'Cerrada', '8800-0004', 'Automatización', '/', 'meta', null, at(70), at(72), at(70));       // 120 min
  leads.run('perdido', 'Perdida', '8800-0005', 'Automatización', '/', 'meta', null, at(90), at(96), at(90));      // 360 min
  leads.run('ganado', 'Vieja', '8800-0006', 'Otro', '/', 'directo', null, at(200), at(201), at(200));             // periodo anterior (8 días atrás)
}

// ── Funciones puras ─────────────────────────────────────────────────────────

test('veredicto por página: umbrales claros y pocos datos cuando no alcanza la muestra', () => {
  assert.equal(pageVerdict({ sessions: 9, avg_engaged_ms: 90_000, cta_rate: 0.2 }, 100), 'poca_muestra');
  assert.equal(pageVerdict({ sessions: 20, avg_engaged_ms: 61_000, cta_rate: 0.08 }, 100), 'engancha');
  assert.equal(pageVerdict({ sessions: 20, avg_engaged_ms: 30_000, cta_rate: 0.01, scroll50_rate: 0.6 }, 100), 'mucho_trafico_poca_accion');
  assert.equal(pageVerdict({ sessions: 12, avg_engaged_ms: 5000, cta_rate: 0.01, scroll50_rate: 0.1 }, 1000), 'rebote', 'poca cuota del total pero rebota');
  assert.equal(pageVerdict({ sessions: 12, avg_engaged_ms: 30_000, cta_rate: 0.05, scroll50_rate: 0.5 }, 1000), 'ok');
  for (const v of Object.values(PAGE_VERDICTS)) assert.ok(v.label && v.tone && v.hint);
  assert.equal(pageLabel('/'), 'Portada');
  assert.equal(pageLabel('/servicios/desarrollo-web-costa-rica/'), 'Servicio · desarrollo web costa rica');
  assert.equal(pageLabel('/en/services/web-development-costa-rica/'), 'EN · Servicio · web development costa rica');
  assert.equal(pageLabel('/ideas/'), 'Ideas');
  assert.equal(pageLabel('/en/'), 'EN · Portada');
});

test('recomendaciones: nada con datos vacíos o muestras chicas; roja cuando hay consultas sin atender', () => {
  assert.deepEqual(buildInsights({}), []);
  assert.deepEqual(buildInsights({ totals: { sessions: 5 }, previous: { sessions: 2 }, pages: [{ path: '/', sessions: 5, verdict: 'poca_muestra' }], devices: [{ name: 'mobile', sessions: 5, cta_sessions: 0 }], sources: [{ name: 'google', sessions: 5, leads: 0 }], forms: [{ form: 'contacto', starts: 3, submits: 0 }], hours: { by_hour: Array(24).fill(0), total: 5 }, leads_pipeline: { unattended_over_24h: 0, won: 1, lost: 1, win_rate: 0.5 } }), [], 'muestras chicas: no opina');
  const out = buildInsights({
    totals: { sessions: 60 }, previous: { sessions: 40 },
    pages: [{ path: '/servicios/automatizacion-de-procesos/', sessions: 30, cta_rate: 0.01, verdict: 'mucho_trafico_poca_accion' }],
    devices: [{ name: 'mobile', sessions: 40, cta_sessions: 2 }, { name: 'desktop', sessions: 30, cta_sessions: 9 }],
    sources: [{ name: 'google', sessions: 30, leads: 0 }, { name: 'directo', sessions: 10, leads: 0 }],
    sections: [{ section: 'calculadora', sessions: 12, reach: 0.2, avg_ms: 50_000 }],
    forms: [{ form: 'contacto', starts: 12, submits: 2 }],
    hours: { by_hour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 30, 20, 0, 0, 0], total: 60 },
    leads_pipeline: { unattended_over_24h: 2, won: 2, lost: 2, win_rate: 0.5 }, // 4 cerradas: todavía no se opina sobre el cierre
  });
  assert.equal(out[0].key, 'leads_unattended', 'lo urgente va primero');
  assert.equal(out[0].tone, 'red');
  assert.equal(out[0].link, '/consultas?status=nuevo');
  const keys = out.map((i) => i.key);
  for (const k of ['visits_trend', 'page_/servicios/automatizacion-de-procesos/', 'device_mobile', 'source_google', 'section_calculadora', 'form_contacto', 'peak_hours']) assert.ok(keys.includes(k), k);
  assert.equal(out.length, 8, 'ocho reglas disparadas (sin la de cierre)');
  assert.ok(!keys.includes('win_rate'));
  assert.ok(!keys.includes('source_directo'), 'una fuente con pocas visitas no genera recomendación');
  assert.ok(out.find((i) => i.key === 'peak_hours').title.includes('18 y las 21 h'));
  assert.ok(out.find((i) => i.key === 'visits_trend').title.includes('subieron 50 %'));
  assert.ok(out.every((i) => i.title && i.detail && ['red', 'amber', 'blue', 'teal'].includes(i.tone)));
  // Tasa de cierre: con cinco decisiones ya opina, y el orden por tono deja afuera lo menos urgente cuando hay más de ocho.
  const closing = buildInsights({ leads_pipeline: { unattended_over_24h: 0, won: 1, lost: 5, win_rate: 1 / 6 } });
  assert.deepEqual(closing.map((i) => [i.key, i.tone]), [['win_rate', 'amber']]);
  assert.equal(buildInsights({ leads_pipeline: { unattended_over_24h: 0, won: 4, lost: 1, win_rate: 0.8 } })[0].tone, 'teal');
  const nine = buildInsights({
    totals: { sessions: 60 }, previous: { sessions: 40 },
    pages: [{ path: '/', sessions: 30, cta_rate: 0.01, verdict: 'mucho_trafico_poca_accion' }],
    devices: [{ name: 'mobile', sessions: 40, cta_sessions: 2 }, { name: 'desktop', sessions: 30, cta_sessions: 9 }],
    sources: [{ name: 'google', sessions: 30, leads: 0 }], sections: [{ section: 'calculadora', sessions: 12, reach: 0.2, avg_ms: 50_000 }],
    forms: [{ form: 'contacto', starts: 12, submits: 2 }], hours: { by_hour: [...Array(18).fill(0), 10, 30, 20, 0, 0, 0], total: 60 },
    leads_pipeline: { unattended_over_24h: 2, won: 1, lost: 5, win_rate: 1 / 6 },
  });
  assert.equal(nine.length, 8, 'tope de ocho');
  assert.equal(nine[0].tone, 'red');
});

// ── /api/analytics ──────────────────────────────────────────────────────────

test('periodo anterior y variaciones: solo cuentan los días de cada ventana', async () => {
  const { status, data } = await hillary.get('/api/analytics?days=7');
  assert.equal(status, 200);
  assert.equal(data.totals.sessions, 35, '20 portada + 12 servicio + 3 servicio chico');
  assert.equal(data.previous.sessions, 10);
  assert.equal(data.previous_from, dayAgo(13));
  assert.equal(data.delta.sessions, 250, '(35 − 10) / 10');
  assert.equal(data.previous.cta_sessions, 5);
  assert.equal(data.previous.cta_rate, 0.5);
  assert.equal(typeof data.delta.cta_rate_points, 'number');
  assert.equal(data.previous.leads, 1, 'la consulta vieja cae en el periodo anterior');
  assert.equal(data.totals.leads, 5);
  // Sin periodo anterior la variación es null, no 0 ni infinito.
  const ninety = (await hillary.get('/api/analytics?days=90')).data;
  assert.equal(ninety.previous.sessions, 0);
  assert.equal(ninety.delta.sessions, null);
  assert.equal(ninety.delta.cta_rate_points, null);
});

test('páginas con veredicto y cifras acotadas a sus propias visitas', async () => {
  const { data } = await hillary.get('/api/analytics?days=7');
  const byPath = Object.fromEntries(data.pages.map((p) => [p.path, p]));
  const home = byPath['/'];
  assert.equal(home.sessions, 20);
  assert.equal(home.cta_sessions, 2);
  assert.equal(home.cta_rate, 0.1);
  assert.equal(home.scroll50_rate, 1);
  assert.equal(home.leads, 1);
  assert.equal(home.avg_engaged_ms, 75_000);
  assert.equal(home.verdict, 'engancha');
  const service = byPath['/servicios/automatizacion-de-procesos/'];
  assert.equal(service.sessions, 12);
  assert.equal(service.cta_rate, 0);
  assert.equal(service.verdict, 'mucho_trafico_poca_accion', '12 de 35 visitas sin un solo CTA');
  assert.equal(byPath['/servicios/integracion-ia-costa-rica/'].verdict, 'poca_muestra');
  assert.ok(data.pages.every((p) => p.cta_sessions <= p.sessions && p.scroll50_rate <= 1));
  assert.ok(data.insights.some((i) => i.key === 'page_/servicios/automatizacion-de-procesos/'), 'la página sin acción aparece en las recomendaciones');
});

test('mapa de horas en hora de Costa Rica: 7 × 24, totales y pico', async () => {
  const { data } = await hillary.get('/api/analytics?days=7');
  const { hours } = data;
  assert.equal(hours.matrix.length, 7);
  assert.ok(hours.matrix.every((row) => row.length === 24));
  assert.equal(hours.total, 35);
  assert.equal(hours.by_hour.reduce((s, n) => s + n, 0), 35);
  assert.equal(hours.by_weekday.reduce((s, n) => s + n, 0), 35);
  // 12 visitas del servicio entraron el mismo día a las 19:30 (hora CR): ese es el pico, aunque en UTC sea la 01:30 del día siguiente.
  const day = dayAgo(1);
  const weekday = new Date(`${day}T12:00:00-06:00`).getUTCDay();
  assert.equal(hours.by_hour[19], 22, '12 del servicio + 10 de la portada a las 19:30');
  assert.equal(hours.peak.hour, 19);
  assert.equal(hours.peak.weekday, weekday);
  assert.ok(hours.peak.sessions >= 12);
  assert.equal(hours.by_hour[1], 0, 'nada se corre al día siguiente por la zona horaria');
});

test('idiomas, CTA por sección y tasa de consulta de cada CTA', async () => {
  const { data } = await hillary.get('/api/analytics?days=7');
  const languages = Object.fromEntries(data.languages.map((l) => [l.name, l]));
  assert.equal(languages.es.sessions, 23);
  assert.equal(languages.en.sessions, 12);
  assert.equal(data.languages.reduce((s, l) => s + l.sessions, 0), data.totals.sessions, 'cada visita cuenta en un solo idioma');
  const oferta = data.cta_by_section.find((c) => c.section === 'oferta');
  assert.deepEqual({ ...oferta }, { section: 'oferta', clicks: 2, sessions: 2, lead_sessions: 1, lead_rate: 0.5 });
  assert.ok(data.sources.every((s) => typeof s.cta_rate === 'number' && s.cta_rate <= 1));
  assert.ok(data.devices.every((d) => d.cta_rate <= 1));
});

test('embudo de consultas: estados, contacto, mediana, cierre y sin atender', async () => {
  const { data } = await hillary.get('/api/analytics?days=7');
  const p = data.leads_pipeline;
  assert.equal(p.total, 5);
  assert.deepEqual(Object.keys(p.by_status).sort(), Object.keys(LEAD_STATUS).sort(), 'todos los estados presentes');
  assert.equal(p.by_status.nuevo, 2);
  assert.equal(p.won, 1);
  assert.equal(p.lost, 1);
  assert.equal(p.win_rate, 0.5);
  assert.equal(p.contact_rate, 0.6, '3 de 5 contactadas');
  assert.equal(p.median_first_contact_minutes, 120, 'mediana de 60, 120 y 360');
  assert.equal(p.unattended_over_24h, 1);
  assert.deepEqual(p.by_need.find((n) => n.need === 'Automatización'), { need: 'Automatización', count: 2 });
  assert.deepEqual(p.by_page.find((x) => x.page === '/servicios/dashboards-power-bi-costa-rica/'), { page: '/servicios/dashboards-power-bi-costa-rica/', count: 1 });
  assert.deepEqual(p.by_source.find((s) => s.source === 'meta'), { source: 'meta', count: 3, won: 1 });
  assert.equal(data.insights[0].key, 'leads_unattended');
  // Un periodo sin consultas cerradas devuelve win_rate null.
  env.db.prepare("UPDATE leads SET status = 'nuevo' WHERE status IN ('ganado', 'perdido') AND created_at >= ?").run(new Date(NOW - 7 * 86_400_000).toISOString());
  const again = (await hillary.get('/api/analytics?days=7')).data.leads_pipeline;
  assert.equal(again.win_rate, null);
  assert.equal(again.won + again.lost, 0);
  env.db.prepare("UPDATE leads SET status = 'ganado' WHERE name = 'Cerrada'").run();
  env.db.prepare("UPDATE leads SET status = 'perdido' WHERE name = 'Perdida'").run();
});

test('detalle de una página: secciones, scroll, clics, fuentes y días; ruta inválida → 400', async () => {
  const bad = await hillary.get('/api/analytics/page?path=javascript:alert(1)&days=7');
  assert.equal(bad.status, 400);
  assert.equal(bad.data.error, 'validation');
  assert.equal((await hillary.get('/api/analytics/page?days=7')).status, 400, 'sin ruta');
  const { status, data } = await hillary.get(`/api/analytics/page?path=${encodeURIComponent('/servicios/automatizacion-de-procesos/')}&days=7`);
  assert.equal(status, 200);
  assert.equal(data.sessions, 12);
  assert.equal(data.views, 12);
  assert.equal(data.avg_engaged_ms, 62_000);
  const calc = data.sections.find((s) => s.section === 'calculadora');
  assert.deepEqual({ sessions: calc.sessions, avg_ms: calc.avg_ms, reach: calc.reach }, { sessions: 12, avg_ms: 50_000, reach: 1 });
  assert.deepEqual(data.scroll.map((s) => s.sessions), [12, 12, 12, 0]);
  assert.equal(data.clicks.length, 0);
  assert.deepEqual(data.sources, [{ name: 'directo', sessions: 12 }]);
  assert.equal(data.daily.length, 7);
  assert.equal(data.daily.reduce((s, d) => s + d.sessions, 0), 12);
  assert.equal(data.leads, 0);
  const home = (await hillary.get('/api/analytics/page?path=%2F&days=7')).data;
  assert.equal(home.leads, 1);
  assert.ok(home.clicks.some((c) => c.target === 'whatsapp' && c.section === 'oferta' && c.clicks === 2));
  assert.equal((await env.client().get('/api/analytics/page?path=%2F')).status, 401);
});

test('inicio: alerta roja por consultas sin responder; los inversionistas no la ven', async () => {
  const { status, data } = await hillary.get('/api/dashboard');
  assert.equal(status, 200);
  assert.deepEqual(data.web_leads, { new: 2, unattended_24h: 1 });
  const alert = data.alerts.find((a) => a.kind === 'lead');
  assert.equal(alert.tone, 'red');
  assert.match(alert.title, /1 consulta de la web lleva más de 24 h sin respuesta/);
  assert.equal(alert.link, '/consultas');
  // Atendida la vieja, queda el aviso azul de las nuevas.
  env.db.prepare("UPDATE leads SET status = 'contactado', contacted_at = ? WHERE name = 'Sin atender'").run(new Date(NOW).toISOString());
  const next = (await hillary.get('/api/dashboard')).data;
  assert.deepEqual(next.web_leads, { new: 1, unattended_24h: 0 });
  assert.equal(next.alerts.find((a) => a.kind === 'lead').tone, 'blue');
  const angel = env.client();
  assert.equal((await angel.login('angel@jc.test')).status, 200);
  assert.equal((await angel.get('/api/dashboard')).status, 403);
  assert.equal((await angel.get('/api/analytics')).status, 403);
  assert.equal((await angel.get('/api/analytics/page?path=%2F')).status, 403);
});

test('la analítica no se expone por MCP ni llama afuera', async () => {
  const mcp = await readFile(new URL('../server/mcp.mjs', import.meta.url), 'utf8');
  assert.ok(!mcp.includes('/api/analytics') && !mcp.includes('/api/leads'));
  const leads = await readFile(new URL('../server/routes/leads.mjs', import.meta.url), 'utf8');
  assert.ok(!/fetch\(/.test(leads));
});
