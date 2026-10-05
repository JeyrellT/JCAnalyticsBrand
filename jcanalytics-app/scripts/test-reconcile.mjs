import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXAMPLE_A, EXAMPLE_B, exportReconciliationCsv, formatAmount, parseList, reconcileLists } from '../src/tools/reconcile.js';

const row = (ref, amount = '1.00', currency = 'USD') => `${ref};${amount};${currency}`;
const group = (result, reference) => result.groups.find((entry) => entry.reference === reference);

test('synthetic example shows five statuses and retains every source row', () => {
  const result = reconcileLists(EXAMPLE_A, EXAMPLE_B);
  assert.equal(result.ok, true);
  assert.deepEqual(result.counts, { match: 2, different: 2, 'only-a': 1, 'only-b': 1, ambiguous: 1 });
  assert.deepEqual(result.rowCounts, { a: 7, b: 6 });
  assert.equal(result.groups.reduce((count, entry) => count + entry.a.length + entry.b.length, 0), 13);
  assert.equal(group(result, '002').status, 'only-a');
  assert.equal(group(result, '009').status, 'only-b');
});

test('identical amounts never establish identity', () => {
  const result = reconcileLists(row('A'), row('B'));
  assert.equal(result.counts.match, 0);
  assert.equal(result.counts['only-a'], 1);
  assert.equal(result.counts['only-b'], 1);
});

test('a repeated reference on either side makes every row in its group ambiguous', () => {
  for (const [a, b] of [[`${row('X')}\n${row('X')}`, row('X')], [row('X'), `${row('X')}\n${row('X', '2')}`], [`${row('X')}\n${row('X')}`, row('Y')]]) {
    const result = reconcileLists(a, b);
    assert.equal(group(result, 'X').status, 'ambiguous');
    assert.equal(result.counts.match, 0);
  }
});

test('reference comparison preserves zeros and case while trimming field edges', () => {
  const result = reconcileLists(' 001 ;1;usd\nAB1;2;USD', '1;1.00;USD\nab1;2;USD\n001;1.0;USD');
  assert.equal(group(result, '001').status, 'match');
  assert.equal(group(result, '1').status, 'only-b');
  assert.equal(group(result, 'AB1').status, 'only-a');
  assert.equal(group(result, 'ab1').status, 'only-b');
});

test('money becomes exact safe integer cents including negatives and boundary amounts', () => {
  const parsed = parseList('A;0.10;usd\nB;-0.01;USD\nC;999999999999.99;USD\nD;-999999999999.99;USD\nE;-0.00;USD', 'a');
  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.rows.map((entry) => entry.amountCents), [10, -1, 99999999999999, -99999999999999, 0]);
  assert.ok(parsed.rows.every((entry) => Number.isSafeInteger(entry.amountCents)));
  assert.equal(formatAmount(parsed.rows[2].amountCents), '999999999999.99');
  assert.equal(formatAmount(parsed.rows[3].amountCents), '-999999999999.99');
  assert.equal(formatAmount(-1), '-0.01');
});

test('all ambiguous or unsupported amount formats block comparison', () => {
  for (const amount of ['1,25', '1,000.00', '1.000,00', '1e3', 'NaN', 'Infinity', '.50', '1.', '+1', '1.001', '1000000000000', '1 000', '']) {
    const result = reconcileLists(row('X', amount), row('X'));
    assert.equal(result.ok, false, amount);
    assert.ok(result.errors.some((entry) => entry.code === 'amount'), amount);
    assert.deepEqual(result.groups, []);
  }
});

test('amount and currency differences are independent and no conversion takes place', () => {
  assert.equal(group(reconcileLists(row('X', '10', 'usd'), row('X', '10.00', 'USD')), 'X').status, 'match');
  assert.equal(group(reconcileLists(row('X', '10', 'USD'), row('X', '10', 'CRC')), 'X').status, 'different');
  assert.equal(group(reconcileLists(row('X', '10', 'USD'), row('X', '10.01', 'USD')), 'X').status, 'different');
  for (const currency of ['US', 'USDD', '123', 'US$', '']) assert.equal(reconcileLists(row('X', '1', currency), row('X')).ok, false);
});

test('English and Spanish optional headers, BOM and blank lines keep original line numbers', () => {
  const a = parseList('\uFEFF\n referencia;importe;moneda\r\n\n001;1;usd\r002;2;CRC', 'a');
  assert.equal(a.errors.length, 0);
  assert.deepEqual(a.rows.map((entry) => entry.line), [4, 5]);
  assert.equal(parseList('reference;amount;currency\n001;1;USD', 'a').rows.length, 1);
  assert.equal(parseList('001;1;USD\nreference;amount;currency', 'a').errors.length, 2);
});

test('empty lists, quotes, missing fields and controls produce useful errors', () => {
  for (const input of ['', '\n   ', 'reference;amount;currency']) assert.equal(parseList(input, 'a').errors[0].code, 'empty');
  for (const input of ['"X";1;USD', 'X;1', 'X;1;USD;extra']) assert.equal(parseList(input, 'a').errors[0].code, 'columns');
  for (const ref of ['', 'X\u0000Y']) assert.equal(parseList(row(ref), 'a').errors[0].code, 'reference');
  const result = reconcileLists('\nX;bad;US', 'Y;bad;US');
  assert.deepEqual(result.errors.map(({ side, line }) => [side, line]), [['a', 2], ['a', 2], ['b', 1], ['b', 1]]);
  assert.equal(result.rowCounts, null);
});

test('200 rows per list work and overflow never produces a partial result', () => {
  const maximum = Array.from({ length: 200 }, (_, i) => row(`R${i}`)).join('\n');
  assert.equal(reconcileLists(maximum, maximum).counts.match, 200);
  const overflow = reconcileLists(maximum + '\n' + row('R200'), row('X'));
  assert.equal(overflow.ok, false);
  assert.equal(overflow.errors[0].code, 'rows');
  assert.equal(overflow.errors[0].line, 201);
  assert.deepEqual(overflow.groups, []);
});

test('40,000 character cap rejects rather than truncates pasted text', () => {
  const input = 'A'.repeat(40001);
  const result = reconcileLists(input, row('X'));
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'characters');
  assert.equal(result.errors[0].line, null);
});

test('Map handles object-like references without collisions', () => {
  const input = ['__proto__', 'constructor', 'toString'].map((ref) => row(ref)).join('\n');
  assert.equal(reconcileLists(input, input).counts.match, 3);
});

test('export contains one row per source row without pairing ambiguous rows', () => {
  const result = reconcileLists(EXAMPLE_A, EXAMPLE_B);
  const exported = exportReconciliationCsv(result);
  const lines = exported.trim().split('\r\n');
  assert.equal(lines.length, 14);
  assert.equal(lines.filter((line) => line.startsWith('"ambiguous"')).length, 3);
  assert.ok(lines.some((line) => line.includes('"001"')));
  assert.ok(lines.some((line) => line.includes('"-10.00"')));
  assert.throws(() => exportReconciliationCsv({ ok: false }));
});

test('export neutralizes formula-like references and preserves numeric negatives', () => {
  for (const ref of ['=1+1', '+1', '-1', '@SUM(A1)', ' =cmd']) {
    const csv = exportReconciliationCsv(reconcileLists(row(ref, '-1'), row(ref, '-1')));
    assert.ok(csv.includes(`"'${ref.trim()}"`), ref);
    assert.ok(csv.includes('"-1.00"'), ref);
  }
});

test('input order changes neither classifications nor row preservation', () => {
  const a = ['A;1;USD', 'B;2;USD', 'C;3;USD', 'C;3;USD'];
  const b = ['B;4;USD', 'A;1;USD', 'D;3;USD'];
  const result = reconcileLists(a.join('\n'), b.join('\n'));
  const permuted = reconcileLists(a.reverse().join('\n'), b.reverse().join('\n'));
  const statuses = (value) => value.groups.map(({ reference, status }) => `${reference}:${status}`).sort();
  assert.deepEqual(statuses(result), statuses(permuted));
  assert.deepEqual(result.rowCounts, permuted.rowCounts);
});

test('downloadable samples stay identical to the built-in synthetic example', async () => {
  for (const [file, expected] of [['list-a-example.csv', EXAMPLE_A], ['list-b-example.csv', EXAMPLE_B]]) {
    const content = await readFile(new URL(`../public/downloads/${file}`, import.meta.url), 'utf8');
    assert.equal(content.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n').trim(), expected);
  }
});
