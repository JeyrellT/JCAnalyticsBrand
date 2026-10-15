import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinor, formatMoney, allocateProRata, xirr, investmentMetrics, cumulativeSeries, toCRC } from '../shared/finance.js';

test('toMinor interpreta formatos de Costa Rica y US', () => {
  assert.equal(toMinor('1.250.000'), 125_000_000);
  assert.equal(toMinor('1 250 000,50'), 125_000_050);
  assert.equal(toMinor('₡250000'), 25_000_000);
  assert.equal(toMinor('1,250.75'), 125_075);
  assert.equal(toMinor('99,9'), 9_990);
  assert.equal(toMinor('0.1'), 10);
  assert.equal(toMinor(1234.56), 123_456);
  assert.equal(toMinor('abc'), null);
  assert.equal(toMinor(''), null);
  assert.equal(toMinor('1.2.3,4.5'), null);
});

test('formatMoney usa ₡ sin decimales y $ con dos', () => {
  assert.equal(formatMoney(125_000_000, 'CRC').replace(/\s/g, ' '), '₡1 250 000');
  assert.equal(formatMoney(125_050, 'USD').replace(/\s/g, ' '), '$1 250,50');
  assert.equal(formatMoney(-50_000, 'CRC'), '−₡500');
  assert.equal(formatMoney(250_000_000, 'CRC', { compact: true }), '₡2,5 M');
  assert.equal(formatMoney(null), '—');
});

test('allocateProRata reparte exacto con el método del mayor residuo', () => {
  assert.deepEqual(allocateProRata(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateProRata(1_000_000, [50, 30, 20]), [500_000, 300_000, 200_000]);
  const parts = allocateProRata(99_999_99, [3, 7, 11, 0, 13]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 99_999_99);
  assert.equal(parts[3], 0);
  assert.throws(() => allocateProRata(100, [0, 0]), /no_weights/);
  assert.throws(() => allocateProRata(1.5, [1]), /total_invalid/);
});

test('xirr coincide con Excel en casos conocidos', () => {
  // Invertir 1000 y recibir 1100 un año después = 10 %.
  const r1 = xirr([{ date: '2025-01-01', amount: -1000 }, { date: '2026-01-01', amount: 1100 }]);
  assert.ok(Math.abs(r1 - 0.1) < 1e-6, String(r1));
  // Ejemplo de la documentación de Excel XIRR: 0.373362535
  const r2 = xirr([
    { date: '2008-01-01', amount: -10000 },
    { date: '2008-03-01', amount: 2750 },
    { date: '2008-10-30', amount: 4250 },
    { date: '2009-02-15', amount: 3250 },
    { date: '2009-04-01', amount: 2750 },
  ]);
  assert.ok(Math.abs(r2 - 0.373362535) < 1e-4, String(r2));
  // Pérdida: recuperar la mitad.
  const r3 = xirr([{ date: '2025-01-01', amount: -1000 }, { date: '2026-01-01', amount: 500 }]);
  assert.ok(Math.abs(r3 + 0.5) < 1e-6, String(r3));
  assert.equal(xirr([{ date: '2025-01-01', amount: -1000 }]), null);
  assert.equal(xirr([]), null);
});

test('investmentMetrics solo cuenta lo confirmado y calcula participación', () => {
  const movements = [
    { id: 1, partner_id: 1, type: 'aporte', amount: 600_00, status: 'confirmado', date: '2026-01-01' },
    { id: 2, partner_id: 2, type: 'aporte', amount: 400_00, status: 'confirmado', date: '2026-01-01' },
    { id: 3, partner_id: 3, type: 'aporte', amount: 999_00, status: 'pendiente', date: '2026-01-02' },
    { id: 4, partner_id: 1, type: 'retorno', amount: 300_00, status: 'confirmado', date: '2026-07-01' },
    { id: 5, partner_id: 2, type: 'retorno', amount: 200_00, status: 'objetado', date: '2026-07-01' },
    { id: 6, partner_id: 2, type: 'retorno', amount: 200_00, status: 'anulado', date: '2026-07-01' },
  ];
  const m = investmentMetrics(movements);
  assert.equal(m.contributed, 1000_00);
  assert.equal(m.returned, 300_00);
  assert.equal(m.net, -700_00);
  assert.equal(m.moic, 0.3);
  assert.equal(m.pendingContributions, 999_00);
  assert.equal(m.pendingCount, 1);
  assert.equal(m.objectedCount, 1);
  const p1 = m.partners.find((p) => p.partner_id === 1);
  assert.equal(p1.share, 0.6);
  assert.equal(p1.net, -300_00);
  assert.ok(m.partners.find((p) => p.partner_id === 3), 'el socio con aporte pendiente aparece con 0');
});

test('cumulativeSeries acumula por fecha y toCRC usa el tipo de cambio guardado', () => {
  const s = cumulativeSeries([
    { id: 1, type: 'aporte', amount: 100, status: 'confirmado', date: '2026-01-01' },
    { id: 2, type: 'aporte', amount: 50, status: 'confirmado', date: '2026-01-01' },
    { id: 3, type: 'retorno', amount: 30, status: 'confirmado', date: '2026-02-01' },
    { id: 4, type: 'retorno', amount: 999, status: 'pendiente', date: '2026-03-01' },
  ]);
  assert.deepEqual(s, [
    { date: '2026-01-01', contributed: 150, returned: 0, net: -150 },
    { date: '2026-02-01', contributed: 150, returned: 30, net: -120 },
  ]);
  assert.equal(toCRC(100_00, 'USD', 512.5), 5_125_000);
  assert.equal(toCRC(100_00, 'CRC'), 100_00);
  assert.equal(toCRC(100_00, 'USD', null), null);
});
