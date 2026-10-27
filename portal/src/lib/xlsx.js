// ============================================================================
//  src/lib/xlsx.js
//  Lector mínimo de Excel (.xlsx) y CSV, sin dependencias: un .xlsx es un ZIP con
//  XML adentro. Descomprime con DecompressionStream (navegadores actuales y Node 22)
//  y devuelve la hoja como matriz de celdas. Solo lee valores, nunca fórmulas ni
//  macros, así que abrir un archivo no ejecuta nada.
//  Se prefirió esto a una librería: el paquete "xlsx" de npm está sin mantenimiento
//  y con avisos de seguridad, y la CSP del portal no permite cargar scripts externos.
// ============================================================================

import { parseCsv, fold } from '../../shared/directory.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export class SpreadsheetError extends Error {}

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** Índice del ZIP: nombre → { method, compressedSize, offset }. */
function zipEntries(bytes) {
  // El directorio central termina con la firma 0x06054b50 (se busca desde el final).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new SpreadsheetError('El archivo no es un Excel válido (.xlsx).');
  const count = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  if (p === 0xffffffff) throw new SpreadsheetError('El archivo es demasiado grande. Dividilo en varios.');
  const out = new Map();
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n += 1) {
    if (u32(bytes, p) !== 0x02014b50) throw new SpreadsheetError('El archivo Excel está dañado.');
    const method = u16(bytes, p + 10);
    const compressedSize = u32(bytes, p + 20);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const local = u32(bytes, p + 42);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    out.set(name.replace(/^\/+/, ''), { method, compressedSize, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === 'undefined') throw new SpreadsheetError('Este navegador no puede abrir Excel. Actualizalo o subí un CSV.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(bytes, entries, name) {
  const e = entries.get(name);
  if (!e) return null;
  if (u32(bytes, e.local) !== 0x04034b50) throw new SpreadsheetError('El archivo Excel está dañado.');
  const start = e.local + 30 + u16(bytes, e.local + 26) + u16(bytes, e.local + 28);
  const data = bytes.subarray(start, start + e.compressedSize);
  let raw;
  if (e.method === 0) raw = data;
  else if (e.method === 8) raw = await inflateRaw(data);
  else throw new SpreadsheetError('El Excel usa una compresión no soportada. Guardalo de nuevo como .xlsx.');
  return new TextDecoder().decode(raw);
}

// ── XML ─────────────────────────────────────────────────────────────────────

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
function decodeXml(s) {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e] ?? m;
    })
    // Caracteres especiales escapados por Excel: _x000D_ (retorno de carro), etc.
    .replace(/_x([0-9a-f]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? decodeXml(m[1]) : null;
};

/** Texto de un nodo con formato (<r><t>…</t></r>), sin la guía fonética. */
const richText = (xml) => [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)]
  .map((m) => decodeXml(m[1] ?? '')).join('');

function sharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((m) => richText(m[1] ?? ''));
}

/** "AB12" → índice de columna 27 (base 0). */
function columnIndex(ref) {
  const letters = /^[A-Z]+/.exec(ref ?? '')?.[0];
  if (!letters) return null;
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetMatrix(xml, strings) {
  const rows = [];
  let nextRow = 0;
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const rAttr = attr(rowMatch[1] ?? rowMatch[3] ?? '', 'r');
    const r = rAttr ? Number(rAttr) - 1 : nextRow;
    nextRow = r + 1;
    if (r > 20_000) break; // protección: nadie importa una hoja tan larga por error
    const row = [];
    let nextCol = 0;
    for (const c of (rowMatch[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = columnIndex(attr(c[1], 'r')) ?? nextCol;
      nextCol = col + 1;
      if (col > 200) continue;
      const type = attr(c[1], 't');
      const body = c[2] ?? '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = null;
      if (type === 's') value = v != null ? strings[Number(v)] ?? null : null;
      else if (type === 'inlineStr') value = richText(/<is>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? '');
      else if (type === 'str' || type === 'e') value = v != null ? decodeXml(v) : null;
      else if (type === 'b') value = v === '1';
      else if (v != null) value = Number.isFinite(Number(v)) ? Number(v) : decodeXml(v);
      row[col] = value;
    }
    rows[r] = row;
  }
  return Array.from(rows, (r) => r ?? []);
}

/**
 * Lee un .xlsx (ArrayBuffer/Uint8Array). Elige la hoja llamada "Contactos" o
 * "Libro amarillo" si existe; si no, la primera.
 * @returns {Promise<{ matrix: unknown[][], sheet: string, sheets: string[] }>}
 */
export async function readXlsx(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (u32(bytes, 0) !== 0x04034b50) {
    // D0 CF 11 E0 = formato viejo de Excel 97-2003.
    if (u32(bytes, 0) === 0xe011cfd0) throw new SpreadsheetError('Es un Excel antiguo (.xls). Abrilo y usá "Guardar como" → .xlsx.');
    throw new SpreadsheetError('El archivo no es un Excel válido (.xlsx).');
  }
  const entries = zipEntries(bytes);
  const workbook = await readEntry(bytes, entries, 'xl/workbook.xml');
  if (!workbook) throw new SpreadsheetError('El archivo no tiene hojas de cálculo.');
  const rels = (await readEntry(bytes, entries, 'xl/_rels/workbook.xml.rels')) ?? '';
  const targets = new Map([...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => [attr(m[1], 'Id'), attr(m[1], 'Target')]));
  const sheets = [...workbook.matchAll(/<sheet\b([^>]*)\/?>/g)].map((m) => ({ name: attr(m[1], 'name'), rid: attr(m[1], 'r:id') }));
  if (!sheets.length) throw new SpreadsheetError('El archivo no tiene hojas de cálculo.');
  const chosen = sheets.find((s) => ['contactos', 'libro amarillo'].includes(fold(s.name))) ?? sheets[0];
  let target = targets.get(chosen.rid) ?? 'worksheets/sheet1.xml';
  target = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const sheetXml = await readEntry(bytes, entries, target);
  if (!sheetXml) throw new SpreadsheetError('No se pudo leer la hoja del archivo.');
  const strings = sharedStrings(await readEntry(bytes, entries, 'xl/sharedStrings.xml'));
  return { matrix: sheetMatrix(sheetXml, strings), sheet: chosen.name, sheets: sheets.map((s) => s.name) };
}

/** Archivo elegido por la persona (.xlsx o .csv) → { matrix, sheet }. */
export async function readSpreadsheetFile(file) {
  if (!file) throw new SpreadsheetError('Elegí un archivo.');
  if (file.size > MAX_FILE_BYTES) throw new SpreadsheetError('El archivo pasa de 5 MB. Dividilo en varios.');
  const name = (file.name ?? '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return { matrix: parseCsv(await file.text()), sheet: 'CSV', sheets: ['CSV'] };
  if (name.endsWith('.xls')) throw new SpreadsheetError('Es un Excel antiguo (.xls). Abrilo y usá "Guardar como" → .xlsx.');
  return readXlsx(await file.arrayBuffer());
}
