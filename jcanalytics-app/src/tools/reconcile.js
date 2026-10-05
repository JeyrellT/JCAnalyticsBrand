// Small exact-key comparison. No fuzzy matching, writes, network or storage.
export const RECONCILE_LIMITS = Object.freeze({ rows: 200, characters: 40000 });
export const EXAMPLE_A = `reference;amount;currency
001;125.00;USD
002;125.00;USD
003;80.00;USD
004;45.00;USD
005;60.00;USD
005;60.00;USD
006;-10.00;USD`;
export const EXAMPLE_B = `reference;amount;currency
001;125.00;USD
009;125.00;USD
003;82.00;USD
004;45.00;CRC
005;60.00;USD
006;-10.00;USD`;

const headers = new Set(['reference;amount;currency', 'referencia;importe;moneda']);
const hasControl = (value) => [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

export function formatAmount(cents) {
  const absolute = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

// Errors contain locations and codes, never copies of the user's data.
export function parseList(text, side) {
  const errors = [];
  const rows = [];
  if (typeof text !== 'string') return { rows, errors: [{ side, line: null, code: 'text' }] };
  if (text.length > RECONCILE_LIMITS.characters) return { rows, errors: [{ side, line: null, code: 'characters' }] };
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  let firstContent = true;
  let count = 0;
  lines.forEach((raw, index) => {
    if (!raw.trim()) return;
    const cells = raw.split(';').map((cell) => cell.trim());
    if (firstContent && headers.has(cells.join(';').toLowerCase())) {
      firstContent = false;
      return;
    }
    firstContent = false;
    count += 1;
    const line = index + 1;
    if (count > RECONCILE_LIMITS.rows) {
      if (count === RECONCILE_LIMITS.rows + 1) errors.push({ side, line, code: 'rows' });
      return;
    }
    if (cells.length !== 3 || raw.includes('"')) {
      errors.push({ side, line, code: 'columns' });
      return;
    }
    const [reference, amount, currencyInput] = cells;
    const before = errors.length;
    if (!reference || hasControl(reference)) errors.push({ side, line, code: 'reference' });
    if (!/^-?\d{1,12}(?:\.\d{1,2})?$/.test(amount)) errors.push({ side, line, code: 'amount' });
    if (!/^[a-zA-Z]{3}$/.test(currencyInput)) errors.push({ side, line, code: 'currency' });
    if (errors.length !== before) return;
    const [whole, fraction = ''] = amount.replace(/^-/, '').split('.');
    const magnitude = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    rows.push({ reference, amountCents: amount.startsWith('-') && magnitude !== 0 ? -magnitude : magnitude, currency: currencyInput.toUpperCase(), line });
  });
  if (count === 0) errors.push({ side, line: null, code: 'empty' });
  return { rows, errors };
}

// A reference repeated on EITHER side always makes its entire group ambiguous.
// The union retains every valid input row, including identical repeated rows.
export function reconcileLists(textA, textB) {
  const a = parseList(textA, 'a');
  const b = parseList(textB, 'b');
  const errors = [...a.errors, ...b.errors];
  if (errors.length) return { ok: false, errors, groups: [], counts: null, rowCounts: null };
  const byReference = new Map();
  for (const [side, rows] of [['a', a.rows], ['b', b.rows]]) {
    for (const row of rows) {
      if (!byReference.has(row.reference)) byReference.set(row.reference, { reference: row.reference, a: [], b: [] });
      byReference.get(row.reference)[side].push(row);
    }
  }
  const counts = { match: 0, different: 0, 'only-a': 0, 'only-b': 0, ambiguous: 0 };
  const groups = [...byReference.values()].map((group) => {
    let status;
    if (group.a.length > 1 || group.b.length > 1) status = 'ambiguous';
    else if (!group.a.length) status = 'only-b';
    else if (!group.b.length) status = 'only-a';
    else status = group.a[0].amountCents === group.b[0].amountCents && group.a[0].currency === group.b[0].currency ? 'match' : 'different';
    counts[status] += 1;
    return { ...group, status };
  });
  return { ok: true, errors: [], groups, counts, rowCounts: { a: a.rows.length, b: b.rows.length } };
}

function csvCell(value, numeric = false) {
  let text = String(value);
  // Prefix spreadsheet formula triggers. Numeric cells come only from validated cents/line numbers.
  if (!numeric && '=+-@'.includes(text.trimStart()[0] || '\0')) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

// One export row per source row: ambiguous groups are never zipped into invented pairs.
export function exportReconciliationCsv(result) {
  if (!result.ok) throw new Error('A valid comparison is required before export.');
  const lines = ['status;reference;source;line;amount;currency'];
  for (const group of result.groups) {
    for (const side of ['a', 'b']) {
      for (const row of group[side]) {
        lines.push([csvCell(group.status), csvCell(row.reference), csvCell(side.toUpperCase()), csvCell(row.line, true), csvCell(formatAmount(row.amountCents), true), csvCell(row.currency)].join(';'));
      }
    }
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
