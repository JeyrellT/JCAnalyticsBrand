// ============================================================================
//  shared/directory.js
//  Libro amarillo: catálogo de estados de llamada, normalización de teléfonos
//  de Costa Rica y lectura de filas de Excel/CSV con encabezados flexibles.
//  Sin dependencias: lo usan el servidor, la demo del navegador y la interfaz
//  (la vista previa de una importación aplica exactamente las mismas reglas).
// ============================================================================

/** Resultado de la última llamada. El orden es el del embudo de prospección. */
export const DIRECTORY_STATUS = {
  pendiente: { label: 'Por llamar', tone: 'slate' },
  no_contesta: { label: 'No contesta', tone: 'amber' },
  volver_a_llamar: { label: 'Volver a llamar', tone: 'violet' },
  interesado: { label: 'Interesado', tone: 'blue' },
  cliente: { label: 'Ya es cliente', tone: 'teal' },
  no_interesado: { label: 'No interesado', tone: 'red' },
  numero_malo: { label: 'Número malo', tone: 'ink' },
};

/** Estados en los que el contacto sigue "vivo" para el equipo de llamadas. */
export const DIRECTORY_OPEN_STATUSES = ['pendiente', 'no_contesta', 'volver_a_llamar', 'interesado'];

/** Campos editables de un contacto, con su largo máximo (el servidor valida con estos mismos límites). */
export const DIRECTORY_FIELDS = {
  name: 120,
  category: 80,
  province: 40,
  canton: 60,
  district: 60,
  address: 300,
  phone: 30,
  phone_alt: 30,
  whatsapp: 30,
  social: 300,
  website: 300,
  source: 300,
  opportunity: 500,
  observations: 2000,
};

/** Filas por petición al importar: mantiene cada envío muy por debajo del límite de 64 kB del servidor. */
export const IMPORT_CHUNK = 40;
/** Máximo de filas aceptadas por petición (defensa del servidor). */
export const IMPORT_MAX_ROWS = 100;
/** Máximo de filas de un archivo (protege el navegador y la base de un archivo equivocado). */
export const IMPORT_MAX_FILE_ROWS = 5000;

export const PROVINCES = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

/** Minúsculas, sin tildes y sin espacios repetidos: para comparar y buscar. */
export const fold = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

// ── Teléfonos ───────────────────────────────────────────────────────────────

const CR_NUMBER = /(?:\+?\s*506[\s.-]*)?(\d{4})[\s.-]?(\d{4})(?!\d)/g;

/**
 * Teléfonos de Costa Rica dentro de un texto libre ("+506 2400-3333 · WA 8500-4444").
 * Devuelve los números de 8 dígitos, sin repetir, en el orden en que aparecen.
 */
export function extractPhones(value) {
  const out = [];
  for (const m of String(value ?? '').matchAll(CR_NUMBER)) {
    const digits = `${m[1]}${m[2]}`;
    if (!out.includes(digits)) out.push(digits);
  }
  return out;
}

/** 8 dígitos → "8888-0000". */
export const formatPhone = (digits) => `${digits.slice(0, 4)}-${digits.slice(4)}`;

/**
 * Teléfono listo para guardar: el primer número de Costa Rica con formato "2400-3333".
 * Un número extranjero o raro se guarda tal cual (recortado), para no perder el dato.
 */
export function cleanPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const [first] = extractPhones(raw);
  return first ? formatPhone(first) : raw.slice(0, DIRECTORY_FIELDS.phone);
}

/** Llave para detectar duplicados: los 8 dígitos del teléfono principal (o null). */
export function phoneKey(value) {
  const [first] = extractPhones(value);
  if (first) return first;
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

// ── Redes y sitio web ───────────────────────────────────────────────────────

const LINK_NETWORKS = [
  ['instagram', 'Instagram', /(^|\.)instagram\.com$/],
  ['facebook', 'Facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me)$/],
  ['tiktok', 'TikTok', /(^|\.)tiktok\.com$/],
];
const DOMAIN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#]\S*)?$/i;
const HANDLE_BASE = { instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/@' };

function linkFor(url, kind) {
  const host = url.hostname.replace(/^www\./, '');
  const [network, label] = LINK_NETWORKS.find(([, , re]) => re.test(host)) ?? [];
  if (network) return { kind: network, label, url: url.toString() };
  return kind === 'site' ? { kind, label: 'Sitio web', url: url.toString() } : { kind: 'link', label: host, url: url.toString() };
}

/**
 * Enlaces que se pueden abrir a partir de lo anotado en "Redes sociales" y "Sitio web".
 * Acepta URLs, dominios de cualquier terminación ("burga.rest", "linktr.ee/x") y cuentas
 * con su red ("TikTok @keburgers24"). Lo que solo nombra la red ("Facebook El Break",
 * "TikTok") no da enlace: sin enlace real no hay botón.
 */
export function contactLinks({ social, website } = {}) {
  const out = [];
  const add = (link) => { if (!out.some((l) => l.url === link.url)) out.push(link); };
  for (const [value, kind] of [[website, 'site'], [social, 'link']]) {
    let network = null;
    for (const raw of String(value ?? '').split(/[\s·|,;]+/)) {
      const part = raw.replace(/^[("'¿¡]+|[)"'.,:!?]+$/g, '');
      const word = fold(part);
      if (/^(instagram|ig)$/.test(word)) { network = 'instagram'; continue; }
      if (/^tik ?tok$/.test(word)) { network = 'tiktok'; continue; }
      if (/^(facebook|fb)$/.test(word)) { network = 'facebook'; continue; }
      const handle = /^@([\w.]{2,30})$/.exec(part);
      if (handle) { if (HANDLE_BASE[network]) add(linkFor(new URL(HANDLE_BASE[network] + handle[1]))); continue; }
      const href = /^https?:\/\//i.test(part) ? part : DOMAIN.test(part) ? `https://${part}` : null;
      if (!href) continue;
      try { add(linkFor(new URL(href), kind)); } catch { /* texto que parecía enlace */ }
    }
  }
  return out;
}

// ── Estados ─────────────────────────────────────────────────────────────────

const STATUS_WORDS = {
  pendiente: ['por llamar', 'pendiente', 'nuevo', 'sin llamar'],
  no_contesta: ['no contesta', 'no contesto', 'buzon', 'sin respuesta', 'apagado'],
  volver_a_llamar: ['volver a llamar', 'llamar luego', 'devolver llamada', 'rellamar', 'seguimiento'],
  interesado: ['interesado', 'interesada', 'cita', 'reunion', 'propuesta', 'cotizacion'],
  cliente: ['ya es cliente', 'cliente', 'cerrado', 'vendido', 'ganado'],
  no_interesado: ['no interesado', 'no interesada', 'no le interesa', 'rechazo', 'perdido'],
  numero_malo: ['numero malo', 'numero equivocado', 'no existe', 'fuera de servicio', 'invalido'],
};

/** Texto libre de una hoja ("No contestó", "Interesada") → clave de estado; null si no se reconoce. */
export function parseStatus(value) {
  const v = fold(value);
  if (!v) return null;
  if (DIRECTORY_STATUS[v.replace(/ /g, '_')]) return v.replace(/ /g, '_');
  // Las frases más largas primero: "no interesado" no debe caer en "interesado".
  const candidates = Object.entries(STATUS_WORDS)
    .flatMap(([key, words]) => words.map((w) => [key, w]))
    .sort((a, b) => b[1].length - a[1].length);
  return candidates.find(([, w]) => v === w || v.startsWith(`${w} `) || v.includes(w))?.[0] ?? null;
}

// ── Encabezados de una hoja ─────────────────────────────────────────────────

/** Sinónimos aceptados para cada columna (ya pasados por fold). */
const HEADER_ALIASES = {
  name: ['nombre', 'nombre del negocio', 'negocio', 'restaurante', 'empresa', 'comercio', 'local', 'razon social', 'nombre comercial'],
  category: ['tipo', 'tipo de comida', 'categoria', 'rubro', 'giro', 'actividad', 'especialidad'],
  province: ['provincia'],
  canton: ['canton'],
  district: ['distrito'],
  address: ['direccion', 'ubicacion', 'direccion exacta', 'senas', 'direccion referencia', 'direccion / referencia', 'ubicacion / direccion'],
  phone: ['telefono', 'tel', 'telefono 1', 'telefono principal', 'celular', 'numero', 'numero de telefono', 'contacto', 'telefonos'],
  phone_alt: ['telefono 2', 'telefono alterno', 'otro telefono', 'tel 2', 'telefono secundario'],
  whatsapp: ['whatsapp', 'wa', 'wapp', 'numero de whatsapp'],
  social: ['redes', 'redes sociales', 'facebook', 'instagram', 'facebook / instagram', 'redes (facebook / instagram)'],
  website: ['sitio web', 'web', 'pagina web', 'website', 'sitio web propio', 'url'],
  source: ['fuente', 'fuente del telefono', 'origen'],
  opportunity: ['oportunidad', 'nota de oportunidad', 'oportunidad comercial'],
  status: ['estado', 'resultado', 'estado de la llamada', 'resultado de la llamada'],
  observations: ['observaciones', 'observacion', 'notas', 'comentarios', 'comentario'],
  next_call_at: ['proxima llamada', 'volver a llamar el', 'fecha proxima llamada', 'seguimiento el'],
};

const ALIAS_INDEX = new Map(
  Object.entries(HEADER_ALIASES).flatMap(([field, words]) => words.map((w) => [w, field])),
);

/** Encabezado de columna → campo del libro (o null si la columna se ignora). */
export function headerField(header) {
  const h = fold(header).replace(/[*:]/g, '').trim();
  if (ALIAS_INDEX.has(h)) return ALIAS_INDEX.get(h);
  // "Teléfono (principal)" → "telefono"
  return ALIAS_INDEX.get(h.replace(/\s*\(.*?\)\s*/g, ' ').trim()) ?? null;
}

/**
 * Ubica la fila de encabezados dentro de las primeras 15 filas (una hoja puede traer
 * título o instrucciones arriba): la primera que reconozca "nombre" y al menos otra columna.
 */
export function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const fields = (rows[i] ?? []).map(headerField);
    if (fields.includes('name') && fields.filter(Boolean).length >= 2) return i;
  }
  return -1;
}

/** Excel guarda fechas como número de días desde 1899-12-30. */
function sheetDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000).toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s); // 15/11/2026 (día primero, como en Costa Rica)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

const cell = (v, max) => {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};

/**
 * Convierte una hoja (matriz de celdas) en contactos listos para enviar a la API.
 * - Reparte varios números de una misma celda: el primero es el principal, el segundo
 *   el alterno y, si una columna dice "WhatsApp", ese número se marca como WhatsApp.
 * - Marca duplicados dentro del mismo archivo y filas sin nombre.
 * @returns {{ rows: object[], skipped: {row: number, reason: string}[], columns: string[], headerRow: number }}
 */
export function rowsFromSheet(matrix) {
  const headerRow = findHeaderRow(matrix);
  if (headerRow < 0) return { rows: [], skipped: [], columns: [], headerRow: -1 };
  const fields = matrix[headerRow].map(headerField);
  const rows = [];
  const skipped = [];
  const seen = new Map();
  const limit = Math.min(matrix.length, headerRow + 1 + IMPORT_MAX_FILE_ROWS);
  for (let i = headerRow + 1; i < limit; i += 1) {
    const line = matrix[i] ?? [];
    if (!line.some((v) => v != null && String(v).trim() !== '')) continue; // fila vacía
    const raw = {};
    fields.forEach((field, col) => {
      if (!field) return;
      const v = line[col];
      if (v == null || String(v).trim() === '') return;
      // Dos columnas que caen en el mismo campo (Facebook e Instagram) se juntan.
      raw[field] = raw[field] ? `${raw[field]} · ${v}` : v;
    });
    const rowNumber = i + 1; // como lo ve la persona en Excel
    const name = cell(raw.name, DIRECTORY_FIELDS.name);
    if (!name || name.length < 2) { skipped.push({ row: rowNumber, reason: 'Sin nombre del negocio' }); continue; }

    const phones = extractPhones([raw.phone, raw.phone_alt].filter(Boolean).join(' '));
    const waPhones = extractPhones(raw.whatsapp);
    const entry = {
      row: rowNumber,
      name,
      category: cell(raw.category, DIRECTORY_FIELDS.category),
      province: cell(raw.province, DIRECTORY_FIELDS.province),
      canton: cell(raw.canton, DIRECTORY_FIELDS.canton),
      district: cell(raw.district, DIRECTORY_FIELDS.district),
      address: cell(raw.address, DIRECTORY_FIELDS.address),
      phone: phones[0] ? formatPhone(phones[0]) : cell(raw.phone, DIRECTORY_FIELDS.phone),
      phone_alt: phones[1] ? formatPhone(phones[1]) : null,
      whatsapp: waPhones[0] ? formatPhone(waPhones[0]) : null,
      social: cell(raw.social, DIRECTORY_FIELDS.social),
      website: cell(raw.website, DIRECTORY_FIELDS.website),
      source: cell(raw.source, DIRECTORY_FIELDS.source),
      opportunity: cell(raw.opportunity, DIRECTORY_FIELDS.opportunity),
      status: parseStatus(raw.status),
      observations: cell(raw.observations, DIRECTORY_FIELDS.observations),
      next_call_at: sheetDate(raw.next_call_at),
    };
    // Números de sobra (3.º en adelante) no se pierden: van a observaciones.
    const extra = phones.slice(2).map(formatPhone);
    if (extra.length) entry.observations = [entry.observations, `Otros teléfonos: ${extra.join(', ')}`].filter(Boolean).join(' · ').slice(0, DIRECTORY_FIELDS.observations);
    if (!entry.whatsapp && /whats|\bwa\b/i.test(String(raw.phone ?? '')) && phones.length === 1) entry.whatsapp = entry.phone;
    // Negocios que solo publican WhatsApp: ese número también es el de llamar.
    if (!entry.phone && entry.whatsapp) entry.phone = entry.whatsapp;

    const key = phoneKey(entry.phone) ?? `n:${fold(name)}|${fold(entry.canton)}`;
    if (seen.has(key)) { skipped.push({ row: rowNumber, reason: `Repetido en el archivo (igual a la fila ${seen.get(key)})` }); continue; }
    seen.set(key, rowNumber);
    rows.push(entry);
  }
  const columns = [...new Set(fields.filter(Boolean))];
  return { rows, skipped, columns, headerRow };
}

// ── CSV ─────────────────────────────────────────────────────────────────────

/** CSV con ; o , (detecta el separador en la primera línea), comillas dobles y BOM. */
export function parseCsv(textValue) {
  const text = String(textValue ?? '').replace(/^\uFEFF/, '');
  const nl = text.indexOf('\n');
  const firstLine = nl < 0 ? text : text.slice(0, nl);
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === sep) { row.push(field); field = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Un valor exportado con apóstrofo protector ('+506…) vuelve a su forma original.
  return rows.map((r) => r.map((v) => (/^'[=+\-@]/.test(v) ? v.slice(1) : v)));
}
