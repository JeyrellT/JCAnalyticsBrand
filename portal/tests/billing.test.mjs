// Cobros de los proyectos: calendario (pagos únicos y recurrentes), equivalente
// mensual, permisos, validaciones y la vista general /api/billing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.mjs';
import { occurrences, nextOccurrence, monthlyAmount, billingSummary } from '../shared/billing.js';

const charge = (frequency, start_date, extra = {}) => ({ id: 1, frequency, start_date, end_date: null, amount: 100_000_00, currency: 'CRC', ...extra });

test('calendario: quincenal son dos cobros por mes, separados 15 días', () => {
  assert.deepEqual(occurrences(charge('quincenal', '2026-10-01'), '2026-10-01', '2026-11-30'), ['2026-10-01', '2026-10-16', '2026-11-01', '2026-11-16']);
  // Si la primera fecha cae después del 15, la otra quincena es 15 días antes (y no se cobra antes del inicio).
  assert.deepEqual(occurrences(charge('quincenal', '2026-10-20'), '2026-10-01', '2026-11-30'), ['2026-10-20', '2026-11-05', '2026-11-20']);
  // 15 y 30: en febrero la segunda quincena es el último día.
  assert.deepEqual(occurrences(charge('quincenal', '2027-01-15'), '2027-02-01', '2027-02-28'), ['2027-02-15', '2027-02-28']);
  assert.equal(monthlyAmount(charge('quincenal', '2026-10-01')), 200_000_00);
});

test('calendario: mensual ajusta fin de mes; semanal, trimestral, único y "hasta"', () => {
  assert.deepEqual(occurrences(charge('mensual', '2026-01-31'), '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(occurrences(charge('semanal', '2026-10-01'), '2026-10-20', '2026-11-05'), ['2026-10-22', '2026-10-29', '2026-11-05']);
  assert.deepEqual(occurrences(charge('trimestral', '2025-11-10'), '2026-10-10', '2027-05-31'), ['2026-11-10', '2027-02-10', '2027-05-10']);
  assert.deepEqual(occurrences(charge('mensual', '2026-01-05', { end_date: '2026-03-31' }), '2026-01-01', '2026-12-31'), ['2026-01-05', '2026-02-05', '2026-03-05']);
  assert.deepEqual(occurrences(charge('unico', '2026-11-05'), '2026-10-10', '2027-10-10'), ['2026-11-05']);
  assert.equal(nextOccurrence(charge('unico', '2026-10-01'), '2026-10-10'), null, 'un pago único pasado ya no tiene próximo cobro');
  assert.equal(nextOccurrence(charge('anual', '2024-02-29'), '2026-10-10'), '2027-02-28');
  assert.equal(monthlyAmount(charge('semanal', '2026-10-01', { amount: 1_200 })), 5_200, '52 semanas ÷ 12 meses');
  assert.equal(monthlyAmount(charge('unico', '2026-10-01')), 0, 'un pago único no es ingreso recurrente');
});

test('resumen: recurrente al mes en colones, único pendiente y próximo cobro', () => {
  const summary = billingSummary([
    charge('mensual', '2026-09-15'),
    { ...charge('quincenal', '2026-10-01', { amount: 100_00, currency: 'USD' }), id: 2 },
    { ...charge('unico', '2026-12-01', { amount: 500_000_00 }), id: 3 },
    { ...charge('mensual', '2026-01-01', { end_date: '2026-06-30' }), id: 4 },
  ], '2026-10-10', (amount, currency) => (currency === 'USD' ? amount * 500 : amount));
  assert.equal(summary.recurring_count, 2, 'la línea que terminó en junio ya no cuenta');
  assert.equal(summary.monthly_crc, 100_000_00 + 2 * 100_00 * 500);
  assert.equal(summary.one_time_pending_crc, 500_000_00);
  assert.deepEqual([summary.next.date, summary.next.charge_id], ['2026-10-15', 1]);
});

test('API de cobros: permisos, validaciones, resumen del proyecto, vista general y Excel', async () => {
  const env = await startServer(); // 2026-10-10 en Costa Rica
  try {
    env.addUser('jeyrell@jc.test', 'Jeyrell', 'admin');
    env.addUser('ana@jc.test', 'Ana', 'socio');
    env.addUser('cata@jc.test', 'Catalina', 'colaborador');
    const as = async (mail) => { const c = env.client(); assert.equal((await c.login(mail)).status, 200); return c; };
    const [admin, ana, cata] = [await as('jeyrell@jc.test'), await as('ana@jc.test'), await as('cata@jc.test')];
    const client = (await admin.post('/api/clients', { name: 'La Burrada', contact_name: 'Juan' })).data.client;
    const burrada = (await admin.post('/api/projects', { name: 'Community manager', client_id: client.id, kind: 'cliente', status: 'en_curso' })).data.project;
    const web = (await admin.post('/api/projects', { name: 'Sitio web', client_id: client.id, kind: 'cliente', status: 'en_curso' })).data.project;
    const prospect = (await admin.post('/api/projects', { name: 'Propuesta', kind: 'cliente', status: 'prospecto' })).data.project;

    // Solo socios y admin configuran cobros; validaciones claras.
    const path = `/api/projects/${burrada.id}/charges`;
    assert.equal((await cata.post(path, { amount: 1, frequency: 'mensual', start_date: '2026-10-01' })).status, 403);
    assert.equal((await ana.post(path, { amount: 100, frequency: 'diaria', start_date: '2026-10-01' })).data.field, 'frequency');
    assert.equal((await ana.post(path, { amount: 0, frequency: 'mensual', start_date: '2026-10-01' })).data.field, 'amount');
    assert.equal((await ana.post(path, { amount: 100, frequency: 'mensual' })).data.field, 'start_date');
    assert.equal((await ana.post(path, { amount: 100, frequency: 'mensual', start_date: '2026-10-01', end_date: '2026-09-01' })).data.field, 'end_date');

    // La Burrada: mensualidad + pauta cada 15 días. El sitio web: un pago único.
    const monthly = await ana.post(path, { concept: 'Mensualidad community manager', amount: 300_000_00, frequency: 'mensual', start_date: '2026-09-05' });
    assert.equal(monthly.status, 200, JSON.stringify(monthly.data));
    const biweekly = await admin.post(path, { concept: 'Pauta en redes', amount: 75_000_00, frequency: 'quincenal', start_date: '2026-10-01' });
    assert.equal(biweekly.data.charge.monthly_amount, 150_000_00);
    assert.equal(biweekly.data.charge.next_date, '2026-10-16');
    const project = biweekly.data.project;
    assert.equal(project.billing.monthly_crc, 450_000_00);
    assert.equal(project.billing.next.date, '2026-10-16');
    assert.equal(project.charges.length, 2);
    const once = await admin.post(`/api/projects/${web.id}/charges`, { concept: 'Sitio web', amount: 900_000_00, frequency: 'unico', start_date: '2026-11-20', end_date: '2027-01-01' });
    assert.equal(once.data.charge.end_date, null, 'un pago único no tiene "hasta"');
    await admin.post(`/api/projects/${prospect.id}/charges`, { amount: 50_000_00, frequency: 'mensual', start_date: '2026-10-01' });

    // Cualquiera del equipo ve los cobros del proyecto (como su valor), pero no la vista general.
    const seen = (await cata.get(`/api/projects/${burrada.id}`)).data.project;
    assert.equal(seen.billing.monthly_crc, 450_000_00);
    assert.equal((await cata.get('/api/billing')).status, 403);
    assert.equal((await cata.get('/api/billing/export.csv')).status, 403);

    // Vista general: el prospecto no suma; octubre trae 1 mensualidad + 2 quincenas.
    const overview = (await ana.get('/api/billing')).data;
    assert.equal(overview.totals.monthly_crc, 450_000_00);
    assert.equal(overview.totals.annual_crc, 450_000_00 * 12);
    assert.equal(overview.totals.recurring_count, 2);
    assert.equal(overview.totals.recurring_clients, 1);
    assert.equal(overview.totals.one_time_pending_crc, 900_000_00);
    assert.equal(overview.month.key, '2026-10');
    assert.deepEqual(overview.month.items.map((i) => [i.date, i.amount]), [['2026-10-01', 75_000_00], ['2026-10-05', 300_000_00], ['2026-10-16', 75_000_00]]);
    assert.equal(overview.month.total_crc, 450_000_00);
    assert.equal(overview.month.pending_crc, 75_000_00, 'del 10 de octubre en adelante');
    assert.equal(overview.projection[1].month, '2026-11');
    assert.equal(overview.projection[1].total_crc, 450_000_00 + 900_000_00, 'noviembre suma el pago único del sitio');
    assert.ok(overview.charges.find((c) => c.project_id === prospect.id).counts === false);
    assert.equal((await ana.get('/api/billing?month=2026-13')).status, 400);
    assert.equal((await ana.get('/api/billing?month=2026-12')).data.month.items.length, 3);

    // Hoy toca cobrar: aparece en el centro de operaciones de socios y admin.
    env.clock.t = Date.parse('2026-10-16T15:00:00Z');
    for (const [who, mail] of [[admin, 'jeyrell@jc.test'], [ana, 'ana@jc.test'], [cata, 'cata@jc.test']]) await who.login(mail); // la sesión vence tras días sin uso
    const alerts = (await ana.get('/api/dashboard')).data.alerts.filter((a) => a.kind === 'billing');
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].title, /Hoy toca cobrar a La Burrada/);
    assert.ok(!(await cata.get('/api/dashboard')).data.alerts.some((a) => a.kind === 'billing'));

    // Excel: separador ;, montos con coma y sin el prospecto.
    const csv = await ana.get('/api/billing/export.csv');
    assert.equal(csv.status, 200);
    assert.ok(csv.data.startsWith('Fecha;Cliente;Proyecto;Concepto;Frecuencia;Monto;Moneda;Equivalente CRC'));
    assert.match(csv.data, /2026-10-16;La Burrada;Community manager;Pauta en redes;Quincenal;75000,00;CRC;75000,00/);
    assert.ok(!csv.data.includes('Propuesta'));

    // Editar y borrar dejan el resumen al día y quedan en la bitácora.
    const edited = await admin.patch(`/api/charges/${biweekly.data.charge.id}`, { amount: 80_000_00, end_date: '2026-12-31' });
    assert.equal(edited.data.project.billing.monthly_crc, 300_000_00 + 160_000_00);
    assert.equal((await cata.patch(`/api/charges/${biweekly.data.charge.id}`, { amount: 1 })).status, 403);
    assert.equal((await admin.del(`/api/charges/${monthly.data.charge.id}`)).data.project.charges.length, 1);
    assert.equal((await admin.del(`/api/charges/${monthly.data.charge.id}`)).status, 404);
    const log = env.db.prepare("SELECT action FROM activity WHERE action LIKE 'charge_%' ORDER BY id").all().map((r) => r.action);
    assert.deepEqual(log.slice(-2), ['charge_updated', 'charge_deleted']);
  } finally { await env.close(); }
});
